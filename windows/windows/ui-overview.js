// TwinDesk — Copyright (C) 2026 inukaasith. GPL-3.0, see LICENSE.
// Overview tab: this PC's address and Connect by address on top, the
// computers found nearby (always visible), the two computers, one switch per feature and
// direction, and what is paired.
'use strict';

UI.tab({
  id: 'overview',
  order: 0,
  title: '概览',
  heading: 'TwinDesk',
  desc: '',
  color: 'linear-gradient(#8e8e93, #636366)',
  badge: (s) => (s.link.state === 'identity_changed' || (s.discovery && !s.discovery.on) || s.found.some((d) => d.invited) ? 'warn' : ''),
  build(body) {
    const { el, api } = UI;
    const WHERE = { driving: '你正在使用 {there}', driven: '{There} 正在控制 {me}' };

    const linkLine = el('div', { class: 'hero-link' }, [el('span', { class: 'hero-pulse' })]);
    const linkText = el('div', { class: 'hero-link-text' });
    const pcName = el('div', { class: 'hero-name' });
    const macName = el('div', { class: 'hero-name' });
    const status = el('div', { class: 'hero-status' });
    // The session: Disconnect it; Connect again after one (or Take over while another device has it).
    const discBtn = UI.button('断开连接', () => api.disconnect(), 'small');
    const againBtn = UI.button('连接', () => api.connectAgain(), 'small primary');
    const sessionBtns = el('div', { class: 'hero-actions' }, [againBtn, discBtn]);
    const netCancel = UI.button('取消', () => api.netCancel(), 'small');
    netCancel.hidden = true;
    const netLocation = UI.button('位置设置', () => api.netLocation(), 'small'); // joining needed Windows' Location
    netLocation.hidden = true;
    // A session on Bluetooth: onto a direct Wi-Fi link on request, until Back to Bluetooth.
    let wifiOn = false;
    const wifiBtn = UI.button('通过 Wi-Fi Direct 连接', () => api.netWifi(!wifiOn), 'small');
    wifiBtn.hidden = true;
    // A phone: its hotspot instead. It switches it on; its name and password here once (saved for it).
    const hotspotBtn = UI.button('通过热点连接', () => api.netWifi('hotspot'), 'small');
    hotspotBtn.hidden = true;
    const hsSsid = el('input', { type: 'text', placeholder: '热点名称', autocomplete: 'off', spellcheck: false, attrs: { 'aria-label': '热点名称' } });
    const hsPass = el('input', { type: 'password', placeholder: '密码', autocomplete: 'off', attrs: { 'aria-label': '热点密码' } });
    const hsJoin = UI.button('加入', () => api.netJoinHotspot({ ssid: hsSsid.value, pass: hsPass.value }), 'small primary');
    hsSsid.onkeydown = hsPass.onkeydown = (e) => { if (e.key === 'Enter') hsJoin.click(); };
    const hsForm = el('div', { class: 'hero-actions' }, [hsSsid, hsPass, hsJoin]);
    hsForm.hidden = true;
    let hsShown = false;
    const peerDev = el('div', { class: 'device mac' });
    const hero = el('div', { class: 'card hero' }, [
      el('div', { class: 'hero-devices' }, [
        el('div', { class: 'hero-device' }, [el('div', { class: 'device pc' }), pcName]),
        el('div', { class: 'hero-mid' }, [linkLine, linkText]),
        el('div', { class: 'hero-device' }, [peerDev, macName]),
      ]),
      status,
      sessionBtns,
      hsForm,
      netCancel,
      netLocation,
      el('div', { class: 'hero-actions' }, [wifiBtn, hotspotBtn]),
    ]);

    // One switch per feature and direction, labels only; the row opens the tab.
    // macOnly: 'linux' = off only with a Linux peer (nothing uses it now: Linux has every row).
    // phone: false = hidden while a phone is the peer.
    const row = (label, tab, get, set, macOnly, { phone = true } = {}) => {
      const sw = UI.switch(set || (() => {}), { label, disabled: !set });
      const r = UI.row(label, '', [sw, el('span', { class: 'chev', text: '›' })], { onClick: () => UI.go(tab) });
      r.update = (s) => {
        const limited = !macOnly || !s.peer ? '' : macOnly === 'linux' ? (s.peer.os === 'linux' ? '暂不支持 Linux' : '') : UI.peer(s).limited;
        sw.set(!limited && get(s));
        sw.disable(!set || !!limited);
        r.setHint(limited);
        r.hidden = !phone && UI.isPhone(s);
      };
      return r;
    };
    const notPhone = { phone: false };
    const m2p = [
      row('屏幕', 'mac-pc', (s) => s.stream.state === 'on', null, undefined, notPhone),
      row('声音', 'audio', (s) => s.audio.receive, (v) => api.setAudio({ receive: v })),
      row('鼠标和键盘', 'cursor', (s) => s.kvm.beDriven, (v) => api.setKvm({ beDriven: v })),
      row('剪贴板', 'clipboard', (s) => s.clipboard.receive, (v) => api.setClipboard({ receive: v })),
      row('通知', 'notifications', (s) => s.notifs.receive, (v) => api.setNotifs({ receive: v })),
      row('共享文件夹', 'files', (s) => s.files.mountMac, (v) => api.setFiles({ mountMac: v })),
      row('终端', 'terminal', (s) => s.terminal.allowMac, (v) => api.setTerminal({ allowMac: v }), undefined, notPhone),
      row('应用', 'apps', (s) => s.apps.open > 0, null, undefined, notPhone),
    ];
    const p2m = [
      row('屏幕', 'pc-mac', (s) => s.pcScreen.mode !== 'off', (v) => api.setPcScreenMode(v ? 'mirror' : 'off')),
      row('声音', 'audio', (s) => s.audio.send, (v) => api.setAudio({ send: v })),
      row('鼠标和键盘', 'cursor', (s) => s.kvm.driveOther, (v) => api.setKvm({ driveOther: v })),
      row('剪贴板', 'clipboard', (s) => s.clipboard.send, (v) => api.setClipboard({ send: v })),
      row('通知', 'notifications', (s) => s.notifs.send, (v) => api.setNotifs({ send: v })),
      row('共享文件夹', 'files', (s) => s.files.shareOn, (v) => api.setShareOn(v)),
      row('终端', 'terminal', (s) => s.terminal.enabled, (v) => api.setTerminal({ enabled: v }), undefined, notPhone),
      row('应用', 'apps', (s) => s.pcApps.allow, (v) => api.setPcApps({ allow: v }), undefined, notPhone),
    ];
    const pair = UI.dirCards({ rows: m2p }, { rows: p2m });

    // ---- this PC + connect by address (always visible) ----
    const addrVal = el('span', { class: 'value addr' });
    const copyBtn = UI.button('复制', () => UI.state && api.copyText(UI.state.addresses[0] || ''), 'small');
    const addrRow = UI.row('{me}', '', [addrVal, copyBtn]);
    const ipInput = el('input', { type: 'text', placeholder: '192.168.1.20', autocomplete: 'off', spellcheck: false, attrs: { 'aria-label': '地址' } });
    let asking = '';
    const ipBtn = UI.button('连接', async () => {
      const v = ipInput.value.trim();
      if (!v || asking) return;
      asking = v;
      render();
      try { await api.connectAddress(v); } finally { asking = ''; render(); }
    }, 'small primary');
    ipInput.onkeydown = (e) => { if (e.key === 'Enter') ipBtn.click(); };
    const ipRow = UI.row('通过地址连接', '', [ipInput, ipBtn]);

    // ---- found nearby (always visible) ----
    const discRow = UI.row('无法搜索本网络中的计算机。', '', [UI.button('修复防火墙', () => api.fixFirewall(), 'small')]);
    const foundList = el('div');
    // General's two Bluetooth switches, here too: who can turn up through Bluetooth.
    const bleSw = UI.switch((v) => api.setNet({ ble: v }), { label: '通过蓝牙连接手机' });
    const blePcSw = UI.switch((v) => api.setNet({ blePc: v }), { label: '通过蓝牙连接计算机' });
    const bleRows = [UI.row('通过蓝牙连接手机', '', [bleSw]), UI.row('通过蓝牙连接计算机', '', [blePcSw])];
    const refresh = UI.button('刷新', () => { // the list empties and fills again with whoever answers
      api.refreshFound();
      refresh.disabled = true;
      refresh.textContent = '正在查找…';
      setTimeout(() => { refresh.disabled = false; refresh.textContent = '刷新'; }, 1500);
    }, 'small');

    // ---- a connected phone's wireless debugging, until it works (the Phone page has it too) ----
    const ADB = { needsPair: ['bad', '首次配对'], waitingWifi: ['bad', '关闭'], connecting: ['muted', '正在查找…'], missing: ['bad', '缺失'], error: ['bad', '出现问题'] };
    const adbPill = el('span', { class: 'pill bad' });
    const adbRow = UI.row('无线调试', '', [adbPill, UI.button('重试', () => api.phoneRetry(), 'small')]);
    const adbCode = el('input', { type: 'text', placeholder: '123456', maxLength: 7, inputMode: 'numeric', autocomplete: 'off', spellcheck: false, attrs: { 'aria-label': '配对码' } });
    const adbWhere = el('input', { type: 'text', placeholder: '地址:端口（可选）', autocomplete: 'off', spellcheck: false, attrs: { 'aria-label': '配对地址' } });
    const adbPair = UI.button('配对', () => api.phonePair({ code: adbCode.value.replace(/\D/g, ''), where: adbWhere.value }), 'small primary'); // "123 456", "123-456" too
    adbCode.onkeydown = adbWhere.onkeydown = (e) => { if (e.key === 'Enter') adbPair.click(); };
    const adbPairRow = UI.row('配对码', '也可在手机的 TwinDesk 通知中输入', [adbCode, adbWhere, adbPair]);
    const adbCard = UI.card('手机屏幕、鼠标和键盘', [adbRow, adbPairRow]);

    const pairedList = el('div');
    body.append(
      UI.card('', [addrRow, ipRow]),
      UI.card('附近的设备', [discRow, foundList, ...bleRows], { actions: [refresh] }),
      hero,
      adbCard,
      pair.el,
      UI.card('已配对', [pairedList]),
    );

    let last = null;
    let foundKey = '';
    let pairedKey = '';
    const render = () => last && update(last);

    // Each found row shows its own progress, set on the click itself and then followed from the link
    // (s.pairing, the session): Connecting… → Check the code → Waiting for Allow → Paired ✓, or the
    // reason and Retry. pending: dev id -> {kind: 'pair' | 'take', since}; done: dev id -> when it connected.
    const LIMIT_MS = 8000; // shared/pairlimit.js: connecting; Take over has no link state to time it
    const pending = {};
    const done = {};
    const redraw = () => { foundKey = ''; render(); };
    const go = (dev, kind, fn) => {
      pending[dev.id] = { kind, since: Date.now() };
      delete done[dev.id];
      redraw(); // this row changes now, before the request goes out
      fn();
      setTimeout(redraw, LIMIT_MS + 50);
    };
    const named = (text, dev) => String(text || '').replace(/\{name\}|\{Name\}/g, dev.name);
    // {busy, text} | {code} | {wait} | {fail, text} | {ok, text} | null
    function rowState(s, dev, online) {
      const p = s.pairing && s.pairing.role !== 'host' && (s.pairing.id ? s.pairing.id === dev.id : s.pairing.address === dev.address) ? s.pairing : null;
      const mine = pending[dev.id];
      if (online) {
        if (mine) {
          delete pending[dev.id];
          done[dev.id] = { at: Date.now(), kind: mine.kind };
          setTimeout(redraw, 1550);
        }
        const d = done[dev.id];
        return d && Date.now() - d.at < 1500 ? { ok: true, text: d.kind === 'pair' ? '已配对 ✓' : '已连接' } : null;
      }
      if (p) {
        if (mine) mine.seen = true;
        if (p.phase === 'failed') {
          const fw = s.firewall && s.firewall.ok === false ? ' 本机防火墙阻止了 TwinDesk：请点击上方的“修复防火墙”。' : '';
          return { fail: true, text: named(p.error, dev) + fw };
        }
        if (p.phase === 'code') return { code: p.code };
        if (p.phase === 'waiting') return { wait: true, text: '正在等待 ' + dev.name + ' 允许连接…' };
        return { busy: true, text: '正在连接…' };
      }
      if (!mine) return null;
      if (mine.seen) { // its pairing ended without connecting (Cancel)
        delete pending[dev.id];
        return null;
      }
      if (Date.now() - mine.since > LIMIT_MS) {
        return { fail: true, text: '无法连接 ' + dev.name + '，地址：' + dev.address + '。请确认对方已打开 TwinDesk，且处于同一 Wi-Fi 网络。' };
      }
      return { busy: true, text: mine.kind === 'take' ? '正在接管…' : '正在连接…' };
    }
    const update = (s) => {
      last = s;
      bleSw.set(!s.net || s.net.ble !== false);
      blePcSw.set(!!s.net && s.net.blePc === true);
      const l = s.link;
      const connected = l.state === 'connected';
      pcName.textContent = s.device.name;
      const p = UI.peer(s);
      macName.textContent = s.peer ? s.peer.name : '另一台计算机';
      peerDev.className = 'device ' + UI.osClass(p.os);
      if (UI.phoneWall && p.phone) peerDev.style.setProperty('--phone-wall', UI.phoneWall);
      else peerDev.style.removeProperty('--phone-wall');
      linkLine.className = 'hero-link' + (connected ? ' up' : '');
      const ble = s.net && s.net.transport === 'ble';
      linkText.textContent = connected ? (l.rtt != null ? l.rtt + ' ms · ' : '') + UI.via(s)
        : s.pairing ? '正在配对…' : s.paired ? '正在连接…' : '未连接';
      const bad = l.state === 'identity_changed';
      status.textContent = bad ? '此设备的身份已发生变化。请取消配对后重新配对。'
        : connected ? s.kvmState.message || (WHERE[s.input] || '已连接').replace('{there}', p.the).replace('{There}', p.the.charAt(0).toUpperCase() + p.the.slice(1))
          : s.peer ? '请在以下设备上打开 TwinDesk：' + s.peer.name + '.'
            : '在下方选择计算机，或通过地址连接。';
      status.classList.toggle('bad', bad);
      // Disconnected here or by the other side, taken over, or in use by another device.
      const stopped = l.state === 'stopped';
      const busyBy = !connected && !stopped && l.busy;
      if (s.paired && !connected && (stopped || busyBy)) {
        status.textContent = stopped ? (l.message || '已断开连接').replace(/\{Name\}/g, s.paired.macName) + '.' : busyBy + '.';
      }
      discBtn.hidden = !connected;
      againBtn.hidden = connected || !s.paired || !(stopped || busyBy);
      againBtn.textContent = busyBy || (stopped && l.message) ? '接管' : '连接';
      sessionBtns.hidden = discBtn.hidden && againBtn.hidden;
      // Moving the session to Wi-Fi (files, screens through Bluetooth: netlink.js)
      const n = s.net || {};
      const moving = { hotspot: '开启 {name} 的热点，然后在此输入热点名称和密码。', asking: '正在请求 {name} 开启 Wi-Fi…', hosting: '正在为 {name} 启动 Wi-Fi Direct…', joining: '正在加入 ' + (n.ssid || 'Wi-Fi') + '…', joined: '已通过 Wi-Fi 连接 {name}' }[n.state];
      if (connected && !bad && (moving || n.state === 'failed')) {
        status.textContent = n.state === 'failed' ? n.error || 'Wi-Fi 启动失败' : moving;
        status.classList.toggle('bad', n.state === 'failed');
      }
      netCancel.hidden = !(connected && ['asking', 'hosting', 'joining', 'hotspot'].includes(n.state));
      hsForm.hidden = !(connected && n.state === 'hotspot');
      if (!hsForm.hidden && !hsShown) { // filled in once, not while typing
        hsSsid.value = n.hotspotSsid || '';
        hsPass.value = '';
        hsPass.placeholder = n.hotspotSaved ? '密码（已保存）' : '密码';
        setTimeout(() => (n.hotspotSsid ? hsPass : hsSsid).focus(), 0);
      }
      hsShown = !hsForm.hidden;
      netLocation.hidden = !(connected && n.state === 'failed' && n.location);
      wifiOn = (n.why || []).includes('user') || !!n.linked; // made for the screen or files too
      wifiBtn.textContent = wifiOn ? '切回蓝牙' : '通过 Wi-Fi Direct 连接';
      wifiBtn.hidden = !connected || !netCancel.hidden || !(wifiOn || ble);
      hotspotBtn.hidden = !connected || !netCancel.hidden || wifiOn || !ble || !UI.isPhone(s);

      for (const r of m2p.concat(p2m)) r.update(s);

      // the phone's wireless debugging: only while it needs something
      const ph = s.phone || {};
      const br = (ph.connected && ph.bridge) || { state: 'off' };
      const pairable = br.state === 'needsPair' || !!br.canPair;
      adbCard.hidden = !ph.connected || !(pairable || ['waitingWifi', 'missing', 'error'].includes(br.state));
      if (!adbCard.hidden) {
        const [cls, label] = ADB[br.state] || ADB.error;
        adbPill.className = `pill ${cls}`;
        adbPill.textContent = label;
        adbRow.setHint(br.message || '');
        adbPairRow.hidden = !pairable;
        if (UI.adbBle(s, adbCard, adbRow, adbPill)) adbPairRow.hidden = true;
      }

      // this PC
      addrVal.textContent = s.addresses.length ? s.addresses[0] : '无网络连接'; // The one the other computer can reach
      copyBtn.hidden = !s.addresses.length;
      const busy = !!s.pairing && s.pairing.phase !== 'failed';
      ipBtn.disabled = busy || !!asking;
      const failed = s.pairing && s.pairing.phase === 'failed';
      ipRow.setHint(asking ? '正在以下地址查找 TwinDesk：' + asking + '…' : failed ? s.pairing.error : '');
      ipRow.hint.classList.toggle('bad', !asking && !!failed);

      // found nearby
      const d = s.discovery || { on: true, error: '' };
      const fwBad = s.firewall && s.firewall.ok === false && !s.firewall.checking;
      const blocked = !d.on || fwBad;
      discRow.hidden = !blocked;
      discRow.setHint(!d.on ? d.error + '。仍可通过地址连接。' : '防火墙阻止了设备发现。仍可尝试通过地址连接。');
      // Paired both ways: the computer we connect to (s.paired) and the ones that connect to us (s.guests).
      const known = new Set([...(s.paired ? [s.paired.macId] : []), ...s.guests.map((g) => g.id)]);
      const live = s.peer && connected ? s.peer.id : '';
      const fk = JSON.stringify([s.found, [...known], live, busy, blocked, s.pairing, Object.keys(pending)]);
      if (fk !== foundKey) {
        foundKey = fk;
        let focus = null;
        const rows = s.found.map((dev) => {
          const isKnown = known.has(dev.id);
          const online = dev.id === live;
          const st = dev.os === 'android' ? null : rowState(s, dev, online); // a phone has its own card
          const pairIt = () => go(dev, 'pair', () => api.pair(dev.id));
          // A Mac hosts; with a PC or Linux the one who clicks is the guest. A phone is asked to pair.
          const btn = online || isKnown || (st && !st.fail) ? null
            : UI.button(st ? '重试' : dev.os === 'mac' || dev.os === 'android' ? '配对' : '连接', pairIt, 'small' + (dev.invited || st ? ' primary' : ''));
          if (btn) btn.disabled = (busy && !st) || connected;
          // Paired: Take over (the computer we're a guest of: a takeover hello; one that connects to us:
          // invited, and its hello takes the session from whoever has it).
          const take = !online && isKnown && !(st && !st.fail) ? UI.button(st ? '重试' : '接管',
            () => go(dev, 'take', () => (s.paired && dev.id === s.paired.macId ? api.connectAgain() : api.connectGuest(dev.id))), 'small') : null;
          if (take) take.disabled = busy;
          const match = st && st.code ? UI.button('代码一致', () => api.confirmCode(), 'small primary') : null;
          if (btn && dev.invited && !busy) focus = btn;
          const hint = !st || st.ok ? dev.address + (dev.invited ? ' · 请求连接' : '')
            : st.code ? '核对配对码：' + st.code.slice(0, 3) + ' ' + st.code.slice(3) + '（请确认与此设备上显示的一致：' + dev.name + '？）'
              : st.text;
          const r = UI.row(dev.name, hint, [
            st && (st.busy || st.wait) ? el('span', { class: 'spin', attrs: { 'aria-hidden': 'true' } }) : null,
            st && st.ok ? el('span', { class: 'pill good', text: st.text }) : online ? el('span', { class: 'pill good', text: '已连接' }) : isKnown && !st ? el('span', { class: 'pill muted', text: '已配对' }) : null,
            match, btn, take]);
          if (st && st.fail) r.hint.classList.add('bad');
          if (st && st.code) r.hint.classList.add('code-hint');
          r.querySelector('.text').prepend(UI.osIcon(dev.os));
          r.classList.add('with-ico');
          return r;
        });
        if (!rows.length && !blocked) rows.push(UI.row('正在搜索计算机…', '请在另一台计算机上打开 TwinDesk。'));
        foundList.replaceChildren(...rows);
        if (focus) focus.focus();
      }

      // paired
      const wk = s.wake || { peers: {} };
      const near = new Set(s.found.map((dev) => dev.id));
      const pk = JSON.stringify([s.paired, s.guests, live, [...near], l.state, Object.keys(wk.peers), wk.waking]);
      if (pk === pairedKey) return;
      pairedKey = pk;
      const all = [
        ...(s.paired ? [{ id: s.paired.macId, name: s.paired.macName, os: s.paired.os, hint: s.paired.address, forget: () => api.forget(), connect: () => api.connectAgain() }] : []),
        ...s.guests.map((g) => ({ id: g.id, name: g.name, os: g.os, hint: g.lastSeen ? '最后出现：' + UI.ago(g.lastSeen) : '', forget: () => api.forgetGuest(g.id),
          connect: near.has(g.id) ? () => api.connectGuest(g.id) : null })),
      ];
      pairedList.replaceChildren(...(all.length ? all.map((x) => {
        const online = x.id === live;
        const waking = !online && wk.waking === x.id;
        // An offline computer that told us how to wake it gets Wake.
        const wakeBtn = !online && wk.peers[x.id] ? UI.button(waking ? '正在唤醒…' : '唤醒', () => api.wakePeer(x.id), 'small') : null;
        if (wakeBtn) wakeBtn.disabled = waking;
        const r = UI.row(x.name, online ? '已连接' : waking ? '正在唤醒 ' + x.name + '…' : x.hint, [
          online ? el('span', { class: 'pill good', text: '在线' }) : null,
          wakeBtn,
          // Switch to it: whatever the session is now, it ends (paired, and nearby to be reached).
          !online && x.connect ? UI.button(live ? '切换' : '连接', x.connect, 'small') : null,
          UI.button('取消配对', x.forget, 'small'),
        ]);
        r.querySelector('.text').prepend(UI.osIcon(x.os));
        r.classList.add('with-ico');
        return r;
      }) : [UI.row('尚未配对任何设备', '在“附近的设备”中选择计算机进行配对。')]));
    };
    return update;
  },
});
