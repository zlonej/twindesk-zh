// TwinDesk — Copyright (C) 2026 inukaasith. GPL-3.0, see LICENSE.
// Calls page (Mac, PC and Linux): the phone's calls here — the one going on, calling a name or a
// number, the sound over Bluetooth (this computer as the phone's headset) and the call history.
'use strict';

UI.tab({
  id: 'calls',
  group: 'Phone',
  order: 5,
  title: '通话',
  icon: 'call',
  color: 'linear-gradient(#5ee07a, #30b94d)',
  desc: '在电脑上接听和拨打手机电话。',
  hidden: (s) => !UI.isPhone(s), // only while a phone is connected
  master: { get: (s) => !!(s.hub && s.hub.calls), set: (v) => UI.api.hub({ do: 'set', what: 'calls', on: v }) },
  badge: (s) => (s.hub && s.hub.call ? 'warn' : s.hub && s.hub.calls ? 'on' : ''),
  build(body, page) {
    const { el, api } = UI;
    const top = UI.hubTop('calls');

    // The call going on.
    const avatarSlot = el('span');
    const who = el('span', { class: 'label' });
    const sub = el('span', { class: 'hint' });
    const act = (a, extra = {}) => api.hub({ do: 'call', a, ...extra });
    const answer = UI.button('接听', () => act('answer'), 'primary');
    const decline = UI.button('拒接', () => act('end'), 'danger');
    const mute = UI.button('静音', () => act('mute', { on: !(UI.state.hub && UI.state.hub.muted) }));
    const where = UI.button('在本机播放', () => api.hub({ do: 'audio', a: UI.state.hub.audio && UI.state.hub.audio.here ? 'phone' : 'here' }));
    const end = UI.button('挂断', () => act('end'), 'danger');
    const nowRow = el('div', { class: 'row hub-call' }, [avatarSlot, el('div', { class: 'text' }, [who, sub]), el('div', { class: 'controls' }, [mute, where, decline, end, answer])]);
    const nowCard = UI.card('当前通话', [nowRow]);

    // Call a number: typed, or on the keypad; the contacts it matches show under it.
    const number = el('input', { type: 'tel', class: 'hub-input hub-number', placeholder: '输入电话号码', spellcheck: false, autocomplete: 'off', attrs: { 'aria-label': '电话号码' } });
    const callBtn = UI.button('拨打', () => dial(number.value), 'primary');
    const padBtn = UI.button('拨号键盘', () => { pad.hidden = !pad.hidden; padBtn.classList.toggle('on', !pad.hidden); number.focus(); });
    const KEYS = [['1', ''], ['2', 'ABC'], ['3', 'DEF'], ['4', 'GHI'], ['5', 'JKL'], ['6', 'MNO'], ['7', 'PQRS'], ['8', 'TUV'], ['9', 'WXYZ'], ['*', ''], ['0', '+'], ['#', '']];
    const pad = el('div', { class: 'hub-keypad', hidden: true }, [
      ...KEYS.map(([k, sub]) => {
        const b = el('button', { class: 'hub-key', attrs: { 'aria-label': k } }, [el('span', { text: k }), el('small', { text: sub })]);
        b.onclick = () => key(k);
        return b;
      }),
      el('span'),
      Object.assign(el('button', { class: 'hub-key hub-key-call', title: '拨打', attrs: { 'aria-label': '拨打' } }, [UI.icon('call')]), { onclick: () => dial(number.value) }),
      Object.assign(el('button', { class: 'hub-key hub-key-del', text: '⌫', title: '删除', attrs: { 'aria-label': '删除' } }), {
        onclick: () => { number.value = number.value.slice(0, -1); typed(); number.focus(); },
      }),
    ]);
    const matches = el('div', { class: 'hub-list' });
    const dialCard = UI.card('拨打', [el('div', { class: 'row hub-dial' }, [number, padBtn, callBtn]), pad, matches]);
    const digits = (v) => String(v || '').replace(/[^\d+]/g, '');
    // Typed digits in a saved number, the trunk 0 aside (0771… finds +94 771…).
    const has = (n, d) => { const x = digits(n); const local = d.replace(/^0+/, ''); return x.includes(d) || (local.length >= 3 && x.includes(local)); };
    const isNumber = (v) => /^[\d\s()+*#.,;-]+$/.test(v.trim()) && /\d|[*#]/.test(v);
    const dial = (n) => {
      const v = String(n || '').trim();
      if (!isNumber(v)) return;
      act('dial', { number: v });
      number.value = '';
      typed();
    };
    const key = (k) => {
      number.value += k;
      typed();
      number.focus();
    };
    const typed = () => {
      const v = number.value.trim();
      callBtn.disabled = !isNumber(v);
      const d = digits(v).replace(/^\+/, '');
      const hits = d.length >= 3 ? contacts.filter((p) => p.numbers.some((x) => has(x.n, d))).slice(0, 4) : [];
      matches.replaceChildren(...hits.map((p) => contactRow(p, d)));
    };
    number.oninput = typed;
    number.onkeydown = (e) => { if (e.key === 'Enter') dial(number.value); };
    callBtn.disabled = true;

    // The phone's contacts: all of them, searched here.
    let contacts = []; // [{name, starred, numbers: [{n, label}]}]
    let contactsLoaded = false;
    let shownContacts = 60;
    const search = el('input', { type: 'search', class: 'hub-input hub-grow', placeholder: '搜索联系人', spellcheck: false, attrs: { 'aria-label': '搜索联系人' } });
    const contactList = el('div', { class: 'hub-list hub-scroll' });
    const moreContacts = UI.button('显示更多', () => { shownContacts += 100; showContacts(); }, 'small');
    const loadContacts = () => { contactsLoaded = true; UI.hubAsk({ t: 'contacts', q: '' }); };
    const contactsCard = UI.card('联系人', [el('div', { class: 'row hub-dial' }, [search]), contactList, el('div', { class: 'hub-more' }, [moreContacts])],
      { actions: [UI.button('刷新', loadContacts, 'small')] });
    // A contact with a Call button; with several numbers, which one (the one matching `d` first).
    const contactRow = (p, d = '') => {
      const nums = p.numbers;
      const first = (d && nums.find((x) => has(x.n, d))) || nums[0];
      const line = (x) => `${x.label ? `${x.label} · ` : ''}${x.n}`;
      let pick = null;
      if (nums.length > 1) {
        pick = UI.select(nums.map((x) => ({ value: x.n, label: line(x) })), () => {});
        pick.set(first.n);
      }
      const r = UI.row(p.name, nums.length > 1 ? `${nums.length} 个号码` : line(first),
        [pick && pick.el, UI.button('拨打', () => dial(pick ? pick.el.value : first.n), 'small')].filter(Boolean));
      if (p.starred) r.label.classList.add('hub-starred');
      r.prepend(UI.avatar(p.name));
      return r;
    };
    const showContacts = () => {
      const q = search.value.trim().toLowerCase();
      const d = digits(q).replace(/^\+/, '');
      const list = !q ? contacts : contacts.filter((p) => p.name.toLowerCase().includes(q) || (d.length >= 2 && p.numbers.some((x) => has(x.n, d))));
      contactList.replaceChildren(...list.slice(0, shownContacts).map((p) => contactRow(p, d.length >= 2 ? d : '')));
      if (!list.length) contactList.append(el('div', { class: 'hub-empty', text: !contactsLoaded ? '' : q ? '没有匹配的联系人' : contacts.length ? '' : '手机上没有联系人' }));
      moreContacts.hidden = list.length <= shownContacts;
    };
    let searchTimer = 0;
    search.oninput = () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => { shownContacts = 60; showContacts(); }, 120);
    };
    UI.hubOn('contacts', (m) => {
      if (m.q) return; // only the whole list is asked for
      contacts = (m.items || []).filter((p) => p && Array.isArray(p.numbers) && p.numbers.length)
        .map((p) => ({ name: String(p.name || p.numbers[0].n), starred: !!p.starred, numbers: p.numbers.filter((x) => x && x.n).map((x) => ({ n: String(x.n), label: String(x.label || '') })) }))
        .sort((a, b) => (b.starred - a.starred) || a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
      showContacts();
      typed();
    });

    // The sound over Bluetooth: this computer as the phone's headset.
    const audioSw = UI.switch((v) => api.hub({ do: 'opt', callAudio: v }), { label: '使用本机通话' });
    const audioRow = UI.row('使用 {me} 通话', '', [audioSw]);
    const retryBtn = UI.button('连接', () => api.hub({ do: 'audio', a: 'connect' }));
    // Which paired Bluetooth device the phone is, when its name didn't say (or to change it).
    const which = UI.select([], (id) => id && api.hub({ do: 'opt', btDevice: id }));
    which.el.setAttribute('aria-label', '选择手机');
    const statusRow = UI.row('蓝牙', '', [which.el, retryBtn]);
    const soundCard = UI.card('声音', [audioRow, statusRow]);

    // Setting it up: the person pairs the two in the systems' own Bluetooth settings, over classic
    // Bluetooth (what a call goes through); TwinDesk doesn't pair them itself, only says how, and
    // connects once they are. Forget at the bottom: both forget each other, classic and LE.
    const settingsBtn = UI.button('打开蓝牙设置', () => api.hub({ do: 'audio', a: 'settings' }), 'small primary');
    const step1 = UI.row('', '');
    const step2 = UI.row('', '', [settingsBtn]);
    const step3 = UI.row('3. 在两台设备上确认配对码', '');
    const pairedRow = UI.row('', '');
    const forgetBtn = UI.button('取消配对', () => {
      if (forgetBtn.dataset.sure !== '1') { forgetBtn.dataset.sure = '1'; forgetBtn.textContent = '确认取消配对？'; forgetBtn.classList.add('danger'); return; }
      unsure();
      api.hub({ do: 'audio', a: 'forget' });
    }, 'small');
    const unsure = () => { forgetBtn.dataset.sure = ''; forgetBtn.textContent = '取消配对'; forgetBtn.classList.remove('danger'); };
    const forgetRow = UI.row('取消配对', '', [forgetBtn]);
    const setupCard = UI.card('蓝牙设置', [step1, step2, step3, pairedRow, forgetRow]);
    // Back in this window from pairing (Settings, or the phone): connected at once when they are.
    window.addEventListener('focus', () => {
      const a = UI.state && UI.state.hub && UI.state.hub.audio;
      if (a && ['needs-pair', 'choose'].includes(a.state)) api.hub({ do: 'audio', a: 'check' });
    });

    // The call history.
    const recent = el('div', { class: 'hub-list hub-scroll' });
    const reload = UI.button('刷新', () => UI.hubAsk({ t: 'call.log', n: 100 }), 'small');
    const recentCard = UI.card('最近通话', [recent], { actions: [reload] });
    const TYPE = { in: '呼入', out: '呼出', missed: '未接', rejected: '已拒接', blocked: '已拦截', voicemail: '语音信箱' };
    UI.hubOn('call.log', (m) => {
      recent.replaceChildren(...(m.items || []).map((c) => {
        const r = UI.row(c.name || c.number || '未知号码', `${TYPE[c.type] || ''}${c.dur && c.type !== 'missed' ? ` · ${UI.duration(c.dur)}` : ''} · ${UI.clock(c.at)}`,
          c.number ? [UI.button('拨打', () => dial(c.number), 'small')] : []);
        if (c.type === 'missed' || c.type === 'rejected') r.label.classList.add('hub-missed');
        r.prepend(UI.avatar(c.name || c.number));
        return r;
      }));
      if (!recent.children.length) recent.append(el('div', { class: 'hub-empty', text: m.items ? '暂无通话记录' : '' }));
    });

    body.append(top.el, nowCard, dialCard, recentCard, contactsCard, soundCard, setupCard);

    let loaded = false;
    let hadCall = false;
    const canContacts = (s) => UI.hubReady(s, 'calls') && !(s.hub.perm.calls.missing || []).includes('contacts');
    let loadedAt = 0;
    const load = () => {
      loaded = true;
      if (Date.now() - loadedAt < 2000) return; // shown and rendered at once: asked once
      loadedAt = Date.now();
      UI.hubAsk({ t: 'call.log', n: 100 });
      if (!contactsLoaded && canContacts(UI.state)) loadContacts();
    };
    UI.onShown(page, (shown) => { if (shown && UI.hubReady(UI.state, 'calls')) load(); });
    UI.onDeviceChange(() => { // another device: its call log and contacts, not the previous one's
      loaded = false;
      loadedAt = 0;
      contactsLoaded = false;
      contacts = [];
      showContacts();
      typed();
      if (!page.hidden && UI.hubReady(UI.state, 'calls')) load();
    });

    return (s) => {
      const h = s.hub || {};
      top.render(s);
      const ready = UI.hubReady(s, 'calls');
      if (!ready) {
        loaded = false;
        if (contactsLoaded || contacts.length) { contactsLoaded = false; contacts = []; showContacts(); typed(); } // another phone, or none: asked again
      } else if (!loaded && !page.hidden) load();
      else if (!contactsLoaded && !page.hidden && canContacts(s)) loadContacts(); // allowed since
      const c = h.call;
      if (hadCall && !c && ready) setTimeout(() => UI.hubAsk({ t: 'call.log', n: 100 }), 1500); // the call just ended is in the log now
      hadCall = !!c;

      nowCard.hidden = !c;
      if (c) {
        avatarSlot.replaceChildren(UI.avatar(c.name || c.number, c.photo));
        who.textContent = c.name || c.number || '未知号码';
        const bt = h.audio && h.audio.state === 'ready';
        sub.textContent = c.state === 'ringing' ? `来电${c.name && c.number ? ` · ${c.number}` : ''}`
          : `${c.dir === 'out' ? '正在拨号' : '通话中'} · ${UI.duration((Date.now() - c.since) / 1000)}${bt ? (h.audio.here ? ' · 在本机播放' : ' · 在手机播放') : ''}`;
        const ringing = c.state === 'ringing';
        answer.hidden = !ringing;
        decline.hidden = !ringing;
        end.hidden = ringing;
        mute.hidden = ringing;
        mute.textContent = h.muted ? '取消静音' : '静音';
        where.hidden = ringing || !bt || h.audio.canMove === false;
        where.textContent = bt && h.audio.here ? '在手机播放' : '在本机播放';
      }
      dialCard.hidden = !ready;
      contactsCard.hidden = !canContacts(s);
      recentCard.hidden = !ready || !(h.perm && !(h.perm.calls.missing || []).includes('numbers'));

      // Sound
      soundCard.hidden = !h.calls || !h.canAudio;
      audioSw.set(!!h.callAudio);
      audioRow.setHint(h.audioLimit || '');
      const a = h.audio;
      const bt = h.perm && h.perm.bt;
      let status = '';
      if (!h.callAudio) status = `已关闭：通话声音在 ${UI.phoneName(s)} 上播放`;
      else if (!h.connected) status = `等待 ${UI.phoneName(s)} 连接`;
      else if (!a) status = '正在启动…';
      else status = a.message || '';
      const phone = UI.phoneName(s);
      const needsPair = !!(a && ['needs-pair', 'choose'].includes(a.state));
      if (h.callAudio && h.connected && needsPair && bt) {
        // The phone's side of the pairing (Hub.kt): LE only can't carry a call.
        if (bt.bonding) status = `正在配对… 请在 ${phone} 和 {me} 上确认配对码`;
        else if (bt.le) status = `${phone} 和 {me} 仅通过低功耗蓝牙配对，无法传输通话声音：请点击下方“取消配对”，再在蓝牙设置中重新配对`;
        else if (bt.forget) status = `${phone} 仍保留与 {me} 的旧配对：请在 ${phone} 已打开的蓝牙设置中取消与 {me} 的配对，再重新配对`;
        else if (bt.radio === false) status = `${phone} 的蓝牙已关闭`;
        else if (a.state === 'needs-pair') status = `尚未与 ${phone} 通过经典蓝牙配对：请按下方步骤在蓝牙设置中配对，成功后 TwinDesk 会自动连接`;
      }
      statusRow.setHint(status);
      retryBtn.hidden = !(a && ['failed', 'off'].includes(a.state));
      const devices = (a && h.connected && a.devices) || [];
      which.el.hidden = !(a && (a.state === 'choose' || (devices.length > 1 && a.state !== 'ready')));
      if (!which.el.hidden) {
        which.options([{ value: '', label: `哪一台是 ${phone}？` }, ...devices.map((d) => ({ value: d.id, label: d.name }))]);
        which.set(a.device || '');
      }

      // Setup: the steps until they're paired, Forget always at the bottom.
      setupCard.hidden = soundCard.hidden || !h.callAudio || !h.connected || !a || ['off', 'starting', 'unavailable'].includes(a.state);
      const paired = !needsPair && !!(a && a.device);
      step1.hidden = paired;
      step2.hidden = paired;
      step3.hidden = paired;
      pairedRow.hidden = !paired;
      if (paired) {
        pairedRow.label.textContent = `已与 ${phone} 配对`;
        pairedRow.setHint('通过经典蓝牙传输通话声音');
      } else {
        step1.label.textContent = `1. 在 ${phone} 上：设置 › 蓝牙 › 配对新设备`;
        step1.setHint(`保持该页面打开，其他设备才能发现 ${phone}`);
        step2.label.textContent = UI.fill('2. 在 {me} 上发起配对');
        step2.setHint((a && a.pairHow) || `在 {me} 的蓝牙设置中添加设备，然后选择 ${phone}`);
        settingsBtn.hidden = !h.btSettings;
        step3.setHint(bt && bt.bonding ? `正在配对… 请在 ${phone} 和 {me} 上确认`
          : h.pairWatch ? `正在查找 ${phone}… 配对成功后 TwinDesk 会立即连接`
            : '配对成功后 TwinDesk 会立即连接');
      }
      forgetRow.setHint(`清除 ${phone} 和 {me} 之间的经典蓝牙及低功耗蓝牙配对，然后重新配对`);
      if (setupCard.hidden) unsure();
    };
  },
});
