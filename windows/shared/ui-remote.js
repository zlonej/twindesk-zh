// TwinDesk — Copyright (C) 2026 inukaasith. GPL-3.0, see LICENSE.
// Remote tab (Mac, PC and Linux; with a phone): the phone's Remote page — a touchpad and keyboard,
// or a gamepad whose buttons press keys — moves this computer's pointer, clicks, scrolls and types
// (shared/phone-remote.js). Its switch at the top lets it, on until turned off; it's taken only
// while this computer's own mouse is at home (not on the phone or another computer: Cursor).
// Real gamepad: the gamepad page as a real controller here (an Xbox 360 controller on Windows, a
// uinput gamepad on Linux), its driver installed the first time it's turned on; the Mac says why
// it can't and points to the phone's As a Bluetooth gamepad.
'use strict';

UI.tab({
  id: 'remote',
  group: 'Input',
  order: 28,
  title: '遥控',
  icon: 'remote',
  color: 'linear-gradient(#bf5af2, #8944ab)',
  desc: '将手机用作本机的触控板、键盘或游戏手柄。',
  hidden: (s) => !UI.isPhone(s), // only while a phone is connected
  badge: (s) => (s.remote && s.remote.using ? 'on' : ''),
  master: {
    get: (s) => !!(s.remote && s.remote.allow),
    set: (v) => UI.api.setRemote({ allow: v }),
    disabled: (s) => !s.remote,
  },
  build(body) {
    const status = UI.row('当前状态', '');
    const how = UI.row('在 {name} 上', '在手机上打开 TwinDesk › 遥控，然后选择“触控板和键盘”或“游戏手柄”。移动速度、轻点点击和手柄按键都在手机上设置');
    const card = UI.card('使用 {name} 遥控', [status, how]);
    const note = UI.note('warn', '');
    const padSwitch = UI.switch((v) => UI.api.setRemote({ pad: v }), { label: '虚拟游戏控制器' });
    const padRow = UI.row('虚拟游戏控制器', '', [padSwitch]);
    const padNote = UI.note('info', '');
    const padCard = UI.card('游戏手柄', [padRow, padNote]);
    body.append(note, card, padCard);
    return (s) => {
      const r = s.remote || {};
      const p = r.pad || {};
      padSwitch.set(p.on);
      padSwitch.disable(!p.supported || !!p.busy);
      padRow.setHint(!p.supported ? '此电脑不支持'
        : p.busy ? p.busy
          : !p.on ? '已关闭：手柄页面的摇杆和按钮按 {name} 上的设置映射为键盘与鼠标操作'
            : p.live ? `已开启：{name} 的手柄页面将作为本机游戏控制器${p.name ? ` (${p.name})` : ''}`
              : '已开启：等待 {name} 连接');
      padNote.set(p.message || '');
      status.setHint(!r.allow ? '已关闭：{name} 的遥控页面无法控制本机鼠标或输入文字'
        : r.why ? r.why
          : r.using ? '使用中：{name} 正在控制本机鼠标或输入文字'
            : r.opened ? '{name} 的遥控页面已打开并就绪'
              : '已就绪：请在 {name} 上打开“遥控”页面');
      // On, but not taken now (the mouse is on another device).
      note.set(r.allow && r.why ? r.why : '');
    };
  },
});
