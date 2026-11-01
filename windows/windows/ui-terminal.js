// TwinDesk — Copyright (C) 2026 inukaasith. GPL-3.0, see LICENSE.
// Terminal tab: shells both ways as two direction cards, with any computer. The other computer →
// here: it opens a shell here (Windows' OpenSSH Server, sshd.js). Here → the other computer: a
// shell there (terminal.js), also as `ssh twindesk` in any terminal.
'use strict';

UI.tab({
  id: 'terminal',
  wifiOnly: true, // over Bluetooth it can't work and doesn't move the session onto Wi-Fi: says so, with Connect with Wi-Fi Direct
  hidden: (s) => UI.isPhone(s), // the Phone page has the phone's screen, sound and apps
  order: 60,
  title: '终端',
  color: 'linear-gradient(#3a3a3c, #1c1c1e)',
  desc: '在另一台计算机上打开终端。',
  badge: (s) => (s.terminal.status === 'unavailable' || s.terminal.status === 'error' ? 'warn' : s.terminal.status === 'ready' || (s.terminal.server.info && s.terminal.server.info.enabled) ? 'on' : ''),
  build(body) {
    const { el, api } = UI;
    // Mac → PC (server here)
    const srvPill = el('span', { class: 'pill' });
    const setupBtn = UI.button('设置', () => api.setupSshd(), 'small primary');
    const srvRow = UI.row('SSH 服务器', '', [srvPill, setupBtn]);
    const macRow = UI.row('', '');
    // PC → Mac (client here)
    const pill = el('span', { class: 'pill' });
    const openBtn = UI.button('打开终端', () => api.openTerminal(), 'small primary');
    const status = UI.row('{name} 上的终端', '', [pill, openBtn]);
    const cmdRow = UI.row('在任意终端中执行', '', [el('code', { class: 'mono', text: 'ssh twindesk' })]);
    const pair = UI.dirCards(
      { on: { get: (s) => s.terminal.allowMac, set: (v) => api.setTerminal({ allowMac: v }) }, label: '允许 {name} 在 {me} 上打开终端', rows: [
        srvRow,
        macRow,
      ] },
      { on: { get: (s) => s.terminal.enabled, set: (v) => api.setTerminal({ enabled: v }) }, label: '从 {me} 打开 {name} 上的终端', rows: [
        status,
        cmdRow,
      ] },
    );
    body.append(pair.el);
    const TEXT = { off: '关闭', no_mac: '正在等待 {name}', waiting: '正在请求 {name}…', ready: '就绪', unavailable: '不可用', error: '出现问题' };
    const SRV = { running: '运行中', stopped: '已停止', missing: '未安装', unknown: '' };
    return (s) => {
      const t = s.terminal;
      const v = t.server;
      pair.update(s);
      srvPill.textContent = v.busy ? '正在设置…' : SRV[v.service] || v.service;
      srvPill.className = 'pill ' + (v.service === 'running' ? 'good' : v.busy ? 'muted' : 'bad');
      setupBtn.hidden = v.service === 'running' || v.busy || !t.allowMac;
      srvRow.setHint(v.message || (v.service === 'running' ? '' : '首次设置需要管理员权限'));
      macRow.hidden = !t.allowMac;
      macRow.label.textContent = v.info && v.info.enabled ? '就绪' : v.macAsked ? '尚未就绪' : '正在等待 {name}';
      macRow.setHint(v.macAsked && !(v.info && v.info.enabled) && v.service !== 'running' ? '请先设置 SSH 服务器' : '');

      pill.textContent = TEXT[t.status] || t.status;
      pill.className = 'pill ' + (t.status === 'ready' ? 'good' : t.status === 'unavailable' || t.status === 'error' ? 'bad' : 'muted');
      openBtn.disabled = t.status !== 'ready';
      status.setHint(t.message || (t.status === 'ready' ? '用户：' + t.user : t.status === 'unavailable' ? (UI.peer(s).os === 'mac' ? '在 {name} 上开启“远程登录”' : '在 {name} 上设置 SSH 服务器') : ''));
      cmdRow.hidden = t.status !== 'ready';
    };
  },
});
