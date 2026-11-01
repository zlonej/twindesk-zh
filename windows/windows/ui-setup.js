// TwinDesk — Copyright (C) 2026 inukaasith. GPL-3.0, see LICENSE.
// Setup screen: a full page before the
// tabs while something isn't ready: firewall and network profile (Fix, one UAC prompt), the
// mouse and keyboard helper, and the display driver for Extend (optional). "Skip for now" is
// remembered until something new is missing. No sidebar while it shows.
'use strict';

UI.setup = (() => {
  const { el, api } = UI;
  const done = () => el('span', { class: 'pill good', text: '完成' });

  const fwFix = UI.button('修复', () => api.fixFirewall(), 'small primary');
  const fwDone = done();
  const fwRow = UI.row('防火墙和网络', '', [fwFix, fwDone]);
  const helperPill = el('span', { class: 'pill bad', text: '未运行' });
  const helperDone = done();
  const helperRow = UI.row('鼠标和键盘辅助程序', '', [helperPill, helperDone]);
  const drvBtn = UI.button('安装', () => api.installVdd(), 'small');
  const drvDone = done();
  const drvRow = UI.row('TwinDesk 虚拟显示器', '', [drvBtn, drvDone]);

  const page = el('section', { class: 'setup-page', hidden: true }, [
    el('div', { class: 'app-mark', attrs: { 'aria-hidden': 'true' } }),
    el('h1', { text: '设置 TwinDesk' }),
    el('p', { text: '在 {me} 与另一台计算机共享前，请完成以下设置。' }),
    UI.card('', [fwRow, helperRow, drvRow]),
    el('div', { class: 'setup-foot' }, [
      el('span', { class: 'hint', text: '以后可在“常规”和“显示”中更改。' }),
      UI.button('暂时跳过', () => api.skipSetup(), ''),
    ]),
  ]);

  // Rows stay once shown (with Done when fixed), so the page doesn't jump while you work through it.
  const shown = new Set();

  function render(s) {
    page.hidden = !s.setup.show;
    document.body.classList.toggle('setup', !page.hidden);
    if (page.hidden) return;
    for (const m of s.setup.missing) shown.add(m);

    const fw = s.firewall || {};
    const fwBad = s.setup.missing.includes('firewall');
    fwRow.hidden = !shown.has('firewall');
    fwRow.setHint(fw.checking ? '正在检查…' : fwBad ? (fw.message || '') + ' 修复时需要一次管理员权限。' : '');
    fwFix.hidden = !fwBad || fw.checking;
    fwDone.hidden = fwBad || fw.checking;

    const h = s.kvmState.helper;
    const helperBad = s.setup.missing.includes('helper');
    helperRow.hidden = !shown.has('helper');
    helperRow.setHint(helperBad ? h + '。若一直如此，请重启 TwinDesk。' : '');
    helperPill.hidden = !helperBad;
    helperDone.hidden = helperBad;

    const v = s.pcScreen.vdd;
    const drvBad = s.setup.missing.includes('driver');
    drvRow.hidden = !shown.has('driver');
    drvRow.setHint(v.busy === 'install' ? '正在安装…' : drvBad ? '可选。为另一台计算机添加额外屏幕（扩展模式）。安装显示器驱动时需要一次管理员权限。' : '');
    drvBtn.hidden = !drvBad;
    drvBtn.disabled = !!v.busy;
    drvDone.hidden = drvBad;
  }

  return { page, render };
})();
