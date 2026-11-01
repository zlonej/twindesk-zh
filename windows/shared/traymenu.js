// TwinDesk — Copyright (C) 2026 inukaasith. GPL-3.0, see LICENSE.
// The menu bar / tray menu, laid out the same on every platform (each main.js gives the model).
// Connected: the status, the way home, Cursor Sharing, then the switches by kind (Mouse and
// Keyboard, Screen, Clipboard and Sound, Files, Connection) and the app. Not connected: only
// connecting, the window, Quit.
//   template(m) -> an Electron menu template
//   m: {status, connected, home?(), shared: {checked, set(on)}, lock?: {label, checked, set},
//       keyboard: {checked, set}, drive: {label, checked, set}, driven?: {label, checked, set},
//       popup: {checked, set}, screen: [{label, checked, set}], clipboard: {checked, set},
//       sound: {checked, set}, drag: {checked, set}, shortcuts: {label, checked, set},
//       found: [{label, click}], byAddress(), lookAgain(), again?: {label, click},
//       disconnect?: {label, click}, update?: {label, click}, open(), log(), quit()}
'use strict';

const check = (label, o) => ({ label, type: 'checkbox', checked: !!o.checked, click: (i) => o.set(i.checked) });
const sep = { type: 'separator' };

function connectTo(m) {
  return {
    label: '连接到',
    submenu: [
      ...(m.found.length ? m.found : [{ label: '附近没有设备', enabled: false }]),
      sep,
      { label: '通过地址连接…', click: m.byAddress },
      { label: '重新搜索', click: m.lookAgain },
    ],
  };
}

function template(m) {
  const status = { label: m.status, enabled: false };
  if (!m.connected) {
    return [status, ...(m.again ? [m.again] : []), connectTo(m), sep, { label: '打开 TwinDesk…', click: m.open }, { label: '退出 TwinDesk', click: m.quit }];
  }
  return [
    status,
    ...(m.home ? [{ label: '将鼠标和键盘切回本机', click: m.home }] : []),
    check('光标共享', m.shared),
    sep,
    {
      label: '鼠标和键盘',
      submenu: [
        check('共享键盘', m.keyboard),
        ...(m.lock ? [check(m.lock.label, m.lock)] : []),
        sep,
        check(m.drive.label, m.drive),
        ...(m.driven ? [check(m.driven.label, m.driven)] : []),
        sep,
        check('切换时显示提示', m.popup),
      ],
    },
    { label: '屏幕', submenu: m.screen.map((x) => check(x.label, x)) },
    { label: '剪贴板和声音', submenu: [check('共享剪贴板', m.clipboard), check('发送声音', m.sound)] },
    { label: '文件', submenu: [check('跨屏幕边缘拖动文件', m.drag), check(m.shortcuts.label, m.shortcuts)] },
    { label: '连接', submenu: [...(m.disconnect ? [m.disconnect, sep] : []), connectTo(m)] },
    sep,
    ...(m.update ? [m.update] : []),
    { label: '打开 TwinDesk…', click: m.open },
    { label: '打开日志文件夹', click: m.log },
    { label: '退出 TwinDesk', click: m.quit },
  ];
}

module.exports = { template };
