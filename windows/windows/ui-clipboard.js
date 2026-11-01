// TwinDesk — Copyright (C) 2026 inukaasith. GPL-3.0, see LICENSE.
// Clipboard tab: accept (Mac → PC) and send (PC → Mac) as two direction cards, then
// timing, privacy and the Recent list for both.
'use strict';

UI.tab({
  id: 'clipboard',
  order: 40,
  title: '剪贴板',
  color: 'linear-gradient(#64d2ff, #30b0c7)',
  desc: '在一台计算机上复制，在另一台上粘贴。',
  master: { get: (s) => s.clipboard.enabled, set: (v) => UI.api.setClipboard({ enabled: v }) },
  badge: (s) => (!s.clipboard.enabled ? '' : s.link.state === 'connected' && !s.clipboard.peerAccepts ? 'warn' : 'on'),
  build(body) {
    const { el, api } = UI;
    const set = (partial) => api.setClipboard(partial);

    const peerRow = UI.row('', '');
    const skipNote = UI.note('info', '');
    const mode = UI.segmented([
      { value: 'instant', label: '立即' }, // the default
      { value: 'switch', label: '切换时' },
    ], (v) => set({ mode: v }));
    const modeRow = UI.row('同步', '', [mode]);
    const concealed = UI.switch((v) => set({ skipConcealed: v }), { label: '跳过密码' });
    const maxKB = UI.select([
      { value: 16, label: '16 KB' }, { value: 64, label: '64 KB' }, { value: 256, label: '256 KB' },
    ], (v) => set({ maxKB: Number(v) }));
    // Pictures (clipimage.js): screenshots put on the clipboard among them. Not in Multi-device yet.
    const pictures = UI.switch((v) => set({ images: v }), { label: '图片' });
    const picturesRow = UI.row('图片', '', [pictures]);
    // Text only: pictures have their own limit (10 MB).
    const maxKBRow = UI.row('文本大小上限', '', [maxKB]);
    const historySize = UI.select([
      { value: 0, label: '关闭' }, { value: 10, label: '10 项' }, { value: 20, label: '20 项' },
      { value: 50, label: '50 项' }, { value: 100, label: '100 项' },
    ], (v) => set({ historySize: Number(v) }));
    const pair = UI.dirCards(
      { on: { get: (s) => s.clipboard.receive, set: (v) => set({ receive: v }) }, label: '在 {name} 上复制，在 {me} 上粘贴', rows: [] },
      { on: { get: (s) => s.clipboard.send, set: (v) => set({ send: v }) }, label: '在 {me} 上复制，在 {name} 上粘贴', rows: [peerRow] },
    );

    const list = el('div', { class: 'history' });
    const clearBtn = UI.button('清空', () => api.clearHistory(), 'small');

    body.append(
      pair.el,
      UI.card('', [modeRow, picturesRow]),
      UI.card('隐私', [
        UI.row('跳过密码', '跳过密码管理器中的内容', [concealed]),
        maxKBRow,
        UI.row('最近项目', '不会保存到磁盘', [historySize]),
      ]),
      skipNote,
      UI.card('最近记录', [list], { actions: [clearBtn] }),
    );

    let lastKey = '';
    return (s) => {
      const c = s.clipboard;
      pair.update(s);
      mode.set(c.mode);
      modeRow.setHint(c.mode === 'instant' ? '复制后立即同步' : '切换到另一台计算机时同步');
      picturesRow.hidden = !c.imageSupport;
      pictures.set(!!c.images);
      picturesRow.setHint(!c.images ? '双向同步复制的图片和截图，最大 10 MB'
        : s.link.state === 'connected' && !c.peerImages ? '也请在 ' + UI.peer(s).name + ' 上开启“图片”（对方需使用 TwinDesk 2.3 或更新版本）'
          : '双向同步复制的图片和截图，最大 10 MB；不支持蓝牙传输');
      concealed.set(c.skipConcealed);
      maxKB.set(c.maxKB);
      maxKBRow.setHint(c.imageSupport ? '超出上限的文本不会发送。图片最大 10 MB' : '超出上限的文本不会发送');
      historySize.set(c.historySize);
      const refused = s.link.state === 'connected' && !c.peerAccepts;
      peerRow.hidden = !refused;
      peerRow.label.textContent = '已关闭于 ' + UI.peer(s).name;
      peerRow.setHint('');
      skipNote.set(c.enabled && c.lastSkip ? '上一项未发送：' + c.lastSkip + '.' : '');
      clearBtn.disabled = !c.history.length;

      const key = JSON.stringify(c.history.map((h) => [h.at, h.dir, !!(h.image && h.image.copy)])) + c.historySize + Math.floor(Date.now() / 15000);
      if (key === lastKey) return;
      lastKey = key;
      list.replaceChildren(...(c.history.length
        ? c.history.map((h, i) => el('div', { class: 'hist-item' }, [
          el('span', { class: 'hist-dir ' + h.dir, title: h.dir === 'out' ? '已发送到 {name}' : '来自 {name}' }, [UI.icon(h.dir === 'out' ? 'up' : 'down')]),
          h.image && h.image.thumb ? el('img', { class: 'hist-thumb', src: h.image.thumb, alt: '' }) : null,
          el('div', { class: 'hist-text' }, [
            h.image
              ? el('div', { class: 'hist-preview', text: (h.image.shot ? '截图' : '画面') + ' · ' + h.image.w + ' × ' + h.image.h })
              : el('div', { class: 'hist-preview selectable', text: h.text.replace(/\s+/g, ' ').trim() || '（空白文本）' }),
            el('div', { class: 'hint', text: (h.dir === 'out' ? '发往 {name}' : '来自 {name}') + ' · ' + UI.ago(h.at) + ' · ' + UI.bytes(h.size) }),
          ]),
          !h.image || h.image.copy ? UI.button('复制', () => api.copyHistory(i), 'small') : null,
        ]))
        : [UI.row(c.historySize ? '暂无记录' : '最近项目记录已关闭', '')]));
    };
  },
});
