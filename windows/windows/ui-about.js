// TwinDesk — Copyright (C) 2026 inukaasith. GPL-3.0, see LICENSE.
// About tab (same cards on all three apps): the app icon and version, update checks, the
// maker, this computer, the app's build and the licence. Facts come from shared/about.js.
'use strict';

UI.tab({
  id: 'about',
  order: 110,
  title: '关于',
  color: 'linear-gradient(#64d2ff, #0a84ff)',
  desc: '',
  bottom: true,
  badge: (s) => (s.updates && s.updates.available ? '1' : ''),
  build(body) {
    const { el, api } = UI;
    const link = (label, key) => UI.button(label, () => api.openLink(key), 'small');
    // A card of label → value rows; set({label: text}) fills them and hides the empty ones.
    const facts = (title, labels) => {
      const vals = {};
      const rows = labels.map((label) => {
        vals[label] = el('span', { class: 'value selectable' });
        return UI.row(label, '', [vals[label]]);
      });
      const card = UI.card(title, rows, { cls: 'keep-on' });
      card.set = (map) => labels.forEach((label, i) => {
        const t = map[label];
        vals[label].textContent = t == null ? '' : String(t);
        rows[i].hidden = t == null || t === '';
      });
      return card;
    };
    const nameEl = el('div', { class: 'about-name', text: 'TwinDesk' });
    const verEl = el('div', { class: 'about-ver' });
    const hero = el('div', { class: 'card about-hero keep-on' }, [
      el('div', { class: 'about-icon', attrs: { role: 'img', 'aria-label': 'TwinDesk 图标' } }),
      nameEl,
      verEl,
      el('div', { class: 'about-tag', text: '两台电脑，共用一张桌面' }),
    ]);

    // Updates: new releases of TwinDesk on GitHub.
    const updStatus = el('span', { class: 'value' });
    const updCheck = UI.button('立即检查', () => api.checkUpdates(), 'small');
    const updNotes = UI.button('更新内容', () => window.UpdaterModal && window.UpdaterModal.show(), 'small');
    const updUnskip = UI.button('取消跳过', () => api.unskipUpdate && api.unskipUpdate(), 'small');
    const updGet = UI.button('下载', () => api.openUpdate(), 'small primary');
    const updRow = UI.row('TwinDesk', '', [updStatus, updNotes, updUnskip, updGet, updCheck]);
    const updAuto = UI.switch((v) => api.setUpdates({ auto: v }), { label: '自动检查更新' });

    const pc = facts('本机', ['计算机名称', '系统', '内核', '处理器', '内存', '架构']);
    const build = facts('本应用', ['版本', '适用架构', 'Electron', 'Chromium', 'Node.js']);
    const thanksRow = UI.row('致谢', '');

    body.append(
      hero,
      UI.card('更新', [
        updRow,
        UI.row('自动检查', '每隔几小时检查 GitHub 上的新版本', [updAuto]),
      ], { cls: 'keep-on' }),
      UI.card('开发者', [
        UI.row('Inuka Asith', 'inukaasith.vercel.app', [link('个人主页', 'portfolio')]),
        UI.row('源代码', 'github.com/InukaAsith/TwinDesk', [link('GitHub', 'github')]),
        UI.row('所有版本', '下载 macOS、Windows 和 Linux 版本', [link('版本发布页', 'releases')]),
        UI.row('日志文件', '运行和崩溃记录，可随问题报告一起提交', [link('打开日志文件夹', 'logs')]),
      ], { cls: 'keep-on' }),
      pc,
      build,
      UI.card('许可证', [
        UI.row('GNU General Public License v3', '免费开源。版权所有 © 2026 inukaasith', [link('阅读', 'licence')]),
        thanksRow,
      ], { cls: 'keep-on' }),
    );

    return (s) => {
      const a = s.about || { app: {}, pc: {} };
      nameEl.textContent = a.app.name || 'TwinDesk';
      verEl.textContent = '版本 ' + (a.app.version || s.version || '');
      thanksRow.setHint(a.app.thanks || '');
      thanksRow.hidden = !a.app.thanks;
      pc.set({
        '计算机名称': a.pc.host,
        '系统': a.pc.os,
        '内核': a.pc.kernel,
        '处理器': a.pc.cpu ? a.pc.cpu + (a.pc.cores ? ' · ' + a.pc.cores + ' 核心' : '') : '',
        '内存': a.pc.memory,
        '架构': a.pc.arch,
      });
      build.set({ '版本': a.app.version, '适用架构': a.app.arch, Electron: a.app.electron, Chromium: a.app.chrome, 'Node.js': a.app.node });
      const u = s.updates;
      if (u) {
        updAuto.set(u.auto);
        updCheck.disabled = u.checking;
        updGet.hidden = !u.available;
        updNotes.hidden = !u.available;
        updUnskip.hidden = !u.available || !u.skipped;
        updStatus.textContent = u.checking ? '正在检查…'
          : u.available
            ? (u.skipped ? u.latest + ' 可用（已跳过）' : u.latest + ' 可用')
            : u.checkedAt ? '已是最新版本' : '';
        updRow.setHint(u.error ? '无法检查：' + u.error
          : u.available ? '当前版本：' + u.current + '. ' + (u.download ? '下载 ' + u.download.name : '打开版本发布页')
            : u.noReleases ? '版本 ' + u.current + '。尚未发布任何版本'
              : '版本 ' + u.current + (u.checkedAt ? ' · 检查于 ' + new Date(u.checkedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : ''));
      }
    };
  },
});
