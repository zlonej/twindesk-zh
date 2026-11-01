// TwinDesk — Copyright (C) 2026 inukaasith. GPL-3.0, see LICENSE.
// Mount tab: the phone's storage as a drive in Explorer (phonedrive.js). Off, TwinDesk doesn't look
// for the phone or touch its files at all; on, only Mount does, and only while it's mounted.
// Port of mac/ui-mount.js.
'use strict';

UI.tab({
  id: 'mount',
  hidden: (s) => !UI.isPhone(s), // only while a phone is connected
  wifiOnly: true, // over Bluetooth it can't work and doesn't move the session onto Wi-Fi: says so, with Connect with Wi-Fi Direct
  order: 55,
  title: '挂载',
  icon: 'drive',
  color: 'linear-gradient(#ffd60a, #ff9f0a)',
  desc: '通过 ADB 将手机存储挂载为文件资源管理器中的驱动器：支持 USB 调试连接或无线调试。',
  master: { get: (s) => !!(s.mount && s.mount.on), set: (v) => UI.api.setMount({ on: v }) },
  badge: (s) => (s.mount && s.mount.mounted ? 'on' : ''),
  build(body) {
    const { api } = UI;
    const mountBtn = UI.button('挂载', () => api.phoneMount(), 'small primary');
    const showBtn = UI.button('显示', () => api.phoneMount(), 'small');
    const unmountBtn = UI.button('卸载挂载', () => api.phoneUnmount(), 'small');
    const driveRow = UI.row('在文件资源管理器中显示手机', '', [mountBtn, showBtn, unmountBtn]);
    const offRow = UI.row('关闭', '开启后即可挂载手机');
    // Mount is ADB: with the phone's debugging off it can't, and says so (Phone Files needs none).
    const adbText = UI.el('div', { class: 'hub-top-text' });
    const adbNote = UI.el('div', { class: 'note warn hub-top', hidden: true }, [UI.el('div', { class: 'hub-top-body' }, [adbText]),
      UI.el('div', { class: 'hub-top-actions' }, [UI.button('手机页面', () => UI.go('phone'), 'small'), UI.button('手机文件', () => UI.go('pfiles'), 'small primary')])]);
    body.append(adbNote);
    body.append(UI.card('驱动器', [offRow, driveRow]));

    return (s) => {
      const d = s.mount || {};
      const ph = s.phone || {};
      const adb = ph.adb || {};
      const adbOff = !!ph.connected && !ph.connected.usb && !d.mounted && (adb.wifi === false || (ph.bridge && ph.bridge.state === 'waitingWifi'));
      adbNote.hidden = !d.on || !adbOff;
      adbText.textContent = adb.devOptions === false
        ? '挂载功能需要 ADB，但手机的开发者选项已关闭。请在“手机”页面开启开发者选项和无线调试，或开启 USB 调试后用数据线连接。“手机文件”无需 ADB。'
        : '挂载功能需要 ADB，但手机的无线调试已关闭。请在“手机”页面开启无线调试，或开启 USB 调试后用数据线连接。“手机文件”无需 ADB。';
      offRow.hidden = !!d.on;
      driveRow.hidden = !d.on;
      mountBtn.hidden = !!d.mounted;
      mountBtn.textContent = d.busy === 'mounting' ? '正在挂载…' : '挂载';
      mountBtn.disabled = !!d.busy;
      showBtn.hidden = unmountBtn.hidden = !d.mounted;
      unmountBtn.disabled = !!d.busy;
      driveRow.setHint(d.message || (d.mounted ? `作为“此电脑”中的驱动器${/^[A-Z]:$/.test(d.mounted) ? ' (' + d.mounted + ')' : ''}, ${d.via === 'usb' ? '通过数据线' : '通过无线调试'}.`
        : '开启 USB 调试并用数据线连接手机，或通过无线调试连接，然后点击“挂载”。'));
    };
  },
});
