// TwinDesk — Copyright (C) 2026 inukaasith. GPL-3.0, see LICENSE.
// Keyboard tab: typing follows the pointer. The Hotkey card (double-tap = mouse and keyboard back
// here; keyboard-only switching), then two direction cards; the directions are the
// same switches as on the Cursor tab. Behaviour: kvm.js and windows-helper.
'use strict';

UI.tab({
  id: 'keyboard',
  order: 30,
  title: '键盘',
  color: 'linear-gradient(#d1d1d6, #8e8e93)',
  desc: '鼠标在哪台计算机上，键盘就在哪台输入。',
  master: { get: (s) => s.kvm.keyboard, set: (v) => UI.api.setKvm({ keyboard: v }) },
  badge: (s) => (s.kvm.keyboard ? 'on' : ''),
  build(body) {
    const { api } = UI;
    const hotkey = UI.select(Object.entries(UI.HOTKEYS).map(([value, label]) => ({ value, label })), (v) => api.setKeys({ hotkey: v }));
    const hotkeyRow = UI.row('快捷键', '连按两次，开启或关闭鼠标共享', [hotkey]);
    const switchSw = UI.switch((v) => api.setKvm({ hotkeySwitch: v }), { label: '使用快捷键切换键盘' });
    const switchRow = UI.row('使用快捷键切换键盘', '', [switchSw]);
    const swap = UI.switch((v) => api.setKeys({ swapCtrlCmd: v }), { label: '交换 Ctrl 和 Command' });
    const otherHotkey = UI.row('{name} 上的快捷键', '');
    const swapRow = UI.row('将 ⌘ 用作 Ctrl', '例如，在本机按 ⌘C 即可复制', [swap]);
    const shortcutsRow = UI.row('{name} 上的快捷键映射', '将 Ctrl 用作 ⌘，例如按 Ctrl+C 即可在对方复制');
    const status = UI.inputStatus();
    const pair = UI.dirCards(
      { on: { get: (s) => s.kvm.beDriven, set: (v) => api.setKvm({ beDriven: v }) }, label: '使用 {name} 的键盘在 {me} 上输入', rows: [otherHotkey, swapRow] },
      { on: { get: (s) => s.kvm.driveOther, set: (v) => api.setKvm({ driveOther: v }) }, label: '使用 {me} 的键盘在 {name} 上输入', rows: [shortcutsRow] },
    );

    body.append(
      UI.card('快捷键', [hotkeyRow, switchRow], { cls: 'keep-on' }),
      pair.el,
      UI.card('当前状态', [status], { cls: 'keep-on' }),
    );

    return (s) => {
      const p = UI.peer(s);
      pair.update(s);
      status.update(s);
      hotkey.set(s.keys.hotkey);
      // Keyboard-only switching exists only while the pointer isn't shared (Cursor off).
      switchSw.set(s.kvm.hotkeySwitch);
      switchSw.disable(!!s.kvm.mouse);
      switchRow.setHint(s.kvm.mouse ? '仅在鼠标共享关闭时可用' : '连按两次以切换输入到 ' + p.the + '，再次连按返回');
      otherHotkey.label.textContent = '快捷键所在设备：' + p.the;
      otherHotkey.setHint('请在该设备的 TwinDesk 中设置：' + p.the);
      // Ctrl/Cmd swapping only between a Mac and a PC.
      swapRow.hidden = p.os !== 'mac';
      shortcutsRow.hidden = p.os !== 'mac';
      swap.set(s.keys.swapCtrlCmd);
    };
  },
});
