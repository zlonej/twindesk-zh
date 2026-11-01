// TwinDesk — Copyright (C) 2026 inukaasith. GPL-3.0, see LICENSE.
// Apps tab. Mac → PC: the Mac's apps with their icons; click one and it opens on the Mac,
// its windows appearing here as their own windows with their own taskbar buttons. PC → Mac (phase
// 13): the Mac opens this PC's apps; each of their windows is streamed on its own to a Mac window.
// Between two PCs the same both ways (peerapps.js here, pcapps.js there); no Pin to Start.
'use strict';

UI.tab({
  id: 'apps',
  hidden: (s) => UI.isPhone(s), // the Phone page has the phone's screen, sound and apps
  order: 80,
  title: '应用',
  color: 'linear-gradient(#bf5af2, #5e5ce6)',
  desc: '在独立窗口中使用另一台计算机上的应用。',
  master: { get: (s) => s.macApps.on || s.pcApps.allow, set: (v) => { UI.api.setMacApps({ on: v }); UI.api.setPcApps({ allow: v }); } },
  badge: (s) => (s.apps.open + s.pcApps.streaming ? String(s.apps.open + s.pcApps.streaming) : ''),
  build(body) {
    const { el, api } = UI;
    const note = UI.note('warn', '');
    const refresh = UI.button('刷新', () => api.listApps(), 'small');
    const filter = el('input', { type: 'text', placeholder: '搜索应用', autocomplete: 'off', spellcheck: false, attrs: { 'aria-label': '搜索应用' } });
    const grid = el('div', { class: 'app-grid' });
    const status = UI.row('', '');
    const openCount = UI.row('', '');
    const pcState = UI.row('', '');
    const pair = UI.dirCards(
      { on: { get: (s) => s.macApps.on, set: (v) => api.setMacApps({ on: v }) }, label: '在 {me} 上打开 {name} 的应用', hint: '在下方选择应用', rows: [openCount] },
      { on: { get: (s) => s.pcApps.allow, set: (v) => api.setPcApps({ allow: v }) }, label: '在 {name} 上打开 {me} 的应用', hint: '请在对方设备上选择应用', rows: [pcState] },
    );
    const listCard = UI.card('Mac 应用', [UI.row('搜索', '', [filter]), grid, status], { actions: [refresh] });
    body.append(pair.el, note, listCard);
    filter.oninput = () => { key = ''; if (UI.state) render(UI.state); };

    let key = '';
    let asked = false;
    function render(s) {
      const a = s.apps;
      const connected = s.link.state === 'connected';
      pair.update(s); // the two direction switches follow the settings
      listCard.hidden = !s.macApps.on;
      listCard.querySelector('.card-title > span').textContent = UI.peer(s).name + ' 的应用';
      if (connected && s.macApps.on && !asked && !a.list.length) { asked = true; api.listApps(); }
      openCount.hidden = !a.open;
      openCount.label.textContent = a.open + ' 个应用已在本机打开';
      const pa = s.pcApps;
      pcState.hidden = !pa.allow;
      pcState.label.textContent = pa.streaming ? pa.streaming + ' 个应用已在 {name} 上打开'
        : !connected ? '正在等待 {name}' : !pa.macAccepts ? '{name} 上已关闭' : pa.open ? '正在连接…' : '没有已打开的应用';
      pcState.setHint(pa.message || '');
      if (!connected) asked = false;
      note.set(a.message || '');
      note.className = 'note ' + (/ is in Start/.test(a.message) ? 'info' : 'warn');
      refresh.disabled = !connected || a.loading;
      const q = filter.value.trim().toLowerCase();
      const k = JSON.stringify([a.list.length, a.loading, connected, q, !!a.peerPc]);
      if (k === key) return;
      key = k;
      const items = a.list.filter((x) => !q || x.name.toLowerCase().includes(q));
      grid.replaceChildren(...items.map((x) => {
        const b = el('button', { class: 'app-tile', title: '打开 ' + x.name + '（位于 {name}）' }, [
          UI.appIcon(x.icon),
          el('span', { class: 'app-name', text: x.name }),
        ]);
        b.onclick = () => api.launchApp(x.id);
        if (a.peerPc) return b; // apps of another PC: no Start shortcut yet
        // Pin to Start (a shortcut in Start › TwinDesk Apps), on hover or right-click.
        const pin = el('span', { class: 'app-pin', title: '固定到开始菜单', attrs: { role: 'button', tabindex: '0', 'aria-label': '将 ' + x.name + ' 固定到开始菜单' } }, [UI.icon('pin')]);
        pin.onclick = (e) => { e.stopPropagation(); api.pinApp(x.id); };
        pin.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); api.pinApp(x.id); } };
        b.oncontextmenu = (e) => { e.preventDefault(); api.pinApp(x.id); };
        b.append(pin);
        return b;
      }));
      status.hidden = items.length > 0;
      status.label.textContent = !connected ? '正在等待 {name}' : a.loading ? '正在加载…' : q ? '没有匹配的应用' : '暂无应用';
      status.setHint(!connected || a.loading || q ? '' : '点击“刷新”获取 {name} 的应用列表。');
    }
    return render;
  },
});
