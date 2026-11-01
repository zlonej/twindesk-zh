// TwinDesk — Copyright (C) 2026 inukaasith. GPL-3.0, see LICENSE.
// Notifications tab: the other computer's notifications here as Windows
// toasts from TwinDesk, and this PC's on the other computer (read from Windows' notification
// database by the helper). Two direction cards, then the apps seen sending.
'use strict';

UI.tab({
  id: 'notifications',
  order: 45,
  title: '通知',
  icon: 'bell',
  color: 'linear-gradient(#ff6961, #ff3b30)',
  desc: '在另一台计算机上查看本机通知。',
  // One switch for the whole tab (both directions); each direction is shared with the
  // other computer per pair (pair.sync), so flipping it there flips it here.
  master: { get: (s) => s.notifs.send || s.notifs.receive, set: (v) => UI.api.setNotifs({ send: v, receive: v }) },
  badge: (s) => (s.notifs.send || s.notifs.receive ? 'on' : ''),
  build(body) {
    const { el, api } = UI;
    const hideSw = UI.switch((v) => api.setNotifs({ hideText: v }), { label: '隐藏消息正文' });
    const hideRow = UI.row('隐藏消息正文', '仅显示应用名称和标题', [hideSw]);
    const note = UI.note('info', '');
    const pair = UI.dirCards(
      { on: { get: (s) => s.notifs.receive, set: (v) => api.setNotifs({ receive: v }) }, label: '在 {me} 上显示 {name} 的通知', rows: [] },
      { on: { get: (s) => s.notifs.send, set: (v) => api.setNotifs({ send: v }) }, label: '在 {name} 上显示 {me} 的通知', rows: [hideRow] },
    );
    const recvRow = pair.a.main, sendRow = pair.b.main;
    const histList = el('div');
    const clearBtn = UI.button('清空', () => api.clearNotifHistory(), 'small');
    const histCard = UI.card('最近通知', [histList], clearBtn);
    const apps = el('div');

    body.append(note, pair.el, histCard, UI.card('应用', [apps]));

    let key = '';
    let histKey = '';
    return (s) => {
      const n = s.notifs;
      const p = UI.peer(s);
      const connected = s.link.state === 'connected';
      pair.update(s);
      note.set('');
      hideSw.set(n.hideText);
      recvRow.setHint(n.receive && n.shown ? n.shown + ' 条已显示' : '通过 TwinDesk 以 Windows 通知形式显示');
      sendRow.setHint(n.readable === false ? '无法读取 Windows 通知列表'
        : !n.send ? '' : !connected ? '也会在另一台计算机上开启' : n.sent ? n.sent + ' 条已发送' : '在对方以系统通知形式显示');

      // Recent notifications
      const history = n.history || [];
      const icons = n.historyIcons || {};
      const hk = JSON.stringify([history.map((h) => [h.id, h.at]), Object.keys(icons)]);
      if (hk !== histKey) {
        histKey = hk;
        if (history.length) {
          histList.replaceChildren(...history.map((item) => {
            const appName = item.appName || item.app;
            const isPhone = UI.isPhone(s);
            const openBtn = isPhone && item.app ? UI.button('打开', () => api.openNotifiedApp({ app: item.app, appName }), 'small') : null;
            const time = UI.ago(item.at);
            const topText = [appName, item.title].filter(Boolean).join(' · ');
            const subText = [item.subtitle, item.body].filter(Boolean).join(' — ') || '通知';
            const r = UI.row(topText, `${subText} · ${time}`, [openBtn]);
            if (icons[item.app]) {
              const img = el('img', { src: icons[item.app], style: 'width: 20px; height: 20px; border-radius: 4px; margin-right: 8px; vertical-align: middle; flex-shrink: 0;' });
              r.querySelector('.text').prepend(img);
              r.classList.add('with-ico');
            }
            return r;
          }));
        } else {
          histList.replaceChildren(UI.row('暂无通知', 'WhatsApp、Instagram 等应用的新通知将在此实时显示。'));
        }
      }

      const k = JSON.stringify([n.apps.map((a) => a.app), n.muted]);
      if (k === key) return;
      key = k;
      apps.replaceChildren(...(n.apps.length
        ? n.apps.map((a) => {
          const sw = UI.switch((v) => api.muteNotifApp({ app: a.app, muted: !v }), { label: '发送 ' + a.appName });
          sw.set(!n.muted.includes(a.app));
          return UI.row(a.appName, '', [sw]);
        })
        : [UI.row('暂无通知', '开启发送后，应用发出首条通知时会显示在此处')]));
    };
  },
});
