// TwinDesk — Copyright (C) 2026 inukaasith. GPL-3.0, see LICENSE.
// General tab: start with Windows, the switching popup, firewall self-check (+ Fix), wake from the
// network, Bluetooth for devices not on this network, helper, the virtual display driver (Extend), this PC.
'use strict';

UI.tab({
  id: 'general',
  order: 100,
  title: '常规',
  color: 'linear-gradient(#aeaeb2, #636366)',
  desc: '',
  bottom: true,
  badge: (s) => (s.firewall && s.firewall.ok === false && !s.firewall.checking ? 'warn' : ''),
  build(body) {
    const { el, api } = UI;
    const startup = UI.switch((v) => api.setStartup(v), { label: '随 Windows 启动' });
    // Received files (shared/received.js): where files sent here and saved from a phone go.
    const recvChange = UI.button('更改…', () => api.chooseReceivedFolder(), 'small');
    const recvReset = UI.button('下载文件夹', () => api.resetReceivedFolder(), 'small');
    const recvOpen = UI.button('打开', () => api.openReceivedFolder(), 'small');
    const recvRow = UI.row('接收文件', '', [recvOpen, recvReset, recvChange]);
    const hudSw = UI.switch((v) => api.setApp({ hud: v }), { label: '切换时显示浮窗' });
    const fwPill = el('span', { class: 'pill' });
    const fwCheck = UI.button('重新检查', () => api.checkFirewall(), 'small');
    const fwFix = UI.button('修复', () => api.fixFirewall(), 'small primary');
    const fwRow = UI.row('防火墙', '', [fwPill, fwCheck, fwFix]);
    // (as the Mac): wake is a switch; Send to sends files from Explorer.
    const wakeSw = UI.switch((v) => api.setWake(v), { label: '网络唤醒' });
    const wakeRow = UI.row('允许另一台计算机唤醒 {me}', '', [wakeSw]);
    const sendToRow = UI.row('将 TwinDesk 添加到“发送到”', '');
    const helperPill = el('span', { class: 'pill' });
    const helperRow = UI.row('鼠标和键盘辅助程序', '', [helperPill]);
    const vddPill = el('span', { class: 'pill' });
    const vddInstall = UI.button('安装', () => api.installVdd(), 'small primary');
    const vddRow = UI.row('虚拟显示器驱动', '', [vddPill, vddInstall]); // Share screen › Extend (vdd.js)
    // Bluetooth when not on the same network: with phones (on unless switched off), with computers (off unless switched on).
    const bleSw = UI.switch((v) => api.setNet({ ble: v }), { label: '通过蓝牙连接手机' });
    const bleRow = UI.row('通过蓝牙连接手机', '', [bleSw]);
    const blePcSw = UI.switch((v) => api.setNet({ blePc: v }), { label: '通过蓝牙连接计算机' });
    const blePcRow = UI.row('通过蓝牙连接计算机', '', [blePcSw]);
    // Bluetooth off altogether while the session is on the same Wi-Fi (blepolicy.js wifiQuiet).
    const bleWifiSw = UI.switch((v) => api.setNet({ bleWifiOff: v }), { label: '通过 Wi-Fi 连接时关闭蓝牙' });
    const bleWifiRow = UI.row('通过 Wi-Fi 连接时关闭蓝牙', '', [bleWifiSw]);
    // What Windows has to allow, in one place (each is also asked for where a feature needs it).
    const btPill = el('span', { class: 'pill' });
    const btRow = UI.row('蓝牙', '用于连接不在本网络中的手机或计算机', [btPill, UI.button('打开', () => api.openBluetoothSettings(), 'small')]);
    const locRow = UI.row('位置', '用于加入手机或计算机的 Wi-Fi Direct 网络（Windows 需要开启位置服务才会显示 Wi-Fi 网络）', [UI.button('打开', () => api.netLocation(), 'small')]);
    const media = UI.mediaControlsRow(); // a phone's media controls on the Phone page (shared/ui-nowplaying.js)
    const deviceName = el('span', { class: 'value' });
    const deviceRow = UI.row('计算机名称', '其他计算机看到的本机名称', [deviceName]);

    body.append(
      UI.card('应用', [
        UI.row('随 Windows 启动', '', [startup]),
        UI.row('切换时显示浮窗', '鼠标和键盘在计算机之间切换时显示', [hudSw]),
        media.el,
        recvRow,
      ]),
      UI.card('权限', [fwRow, btRow, locRow]),
      UI.card('网络和共享', [wakeRow, sendToRow, bleRow, blePcRow, bleWifiRow]),
      UI.card('本机', [deviceRow, helperRow, vddRow]),
    );

    return (s) => {
      media.update(s);
      startup.set(s.startup);
      hudSw.set(s.app.hud);
      const f = s.files || {};
      recvReset.hidden = !f.receivedFolder;
      recvRow.setHint((f.receivedFolder && f.received !== f.receivedFolder ? f.receivedFolder + ' 当前不可用：暂时保存到下载文件夹。' : (f.received || '下载文件夹') + ' · ')
        + '从其他计算机或手机发送到 {me} 的文件，以及从手机“文件”和“照片”保存的内容');
      const fw = s.firewall || {};
      fwPill.textContent = fw.checking ? '正在检查…' : fw.ok ? '正常' : fw.ok === false ? '需要修复' : '';
      fwPill.className = 'pill ' + (fw.checking ? 'muted' : fw.ok ? 'good' : 'bad');
      fwRow.setHint(fw.ok === false ? fw.message || '' : '');
      fwCheck.disabled = !!fw.checking;
      fwFix.hidden = fw.checking || fw.ok !== false || !!fw.error;
      const w = s.wake || {};
      wakeSw.set(w.on === true);
      wakeSw.disable(!w.checked || w.on == null || !!w.busy);
      wakeRow.setHint(w.error ? w.error : w.busy ? '正在更改…' : !w.checked ? '正在检查…'
        : w.on == null ? '本机没有可唤醒 {me} 的网络适配器'
          : '网络适配器收到唤醒数据包后唤醒 {me}。更改此设置需要管理员权限');
      sendToRow.setHint(s.peer ? '右键点击文件 › 发送到 › ' + s.peer.name + ' (TwinDesk)' : '与计算机配对后显示');
      const h = s.kvmState.helper;
      helperPill.textContent = h ? (h === 'starting' ? '正在启动…' : '未运行') : '运行中';
      helperPill.className = 'pill ' + (h ? (h === 'starting' ? 'muted' : 'bad') : 'good');
      helperRow.setHint(h && h !== 'starting' ? h : '');
      const v = s.pcScreen.vdd;
      vddPill.textContent = !v.checked ? '正在检查…' : v.busy === 'install' ? '正在安装…' : v.busy === 'remove' ? '正在移除…' : v.installed ? '已安装' : '未安装';
      vddPill.className = 'pill ' + (!v.checked || v.busy ? 'muted' : v.installed ? 'good' : 'bad');
      vddInstall.hidden = !v.checked || v.installed;
      vddInstall.disabled = !!v.busy;
      vddRow.setHint(v.message ? v.message : v.installed ? '为“共享屏幕 › 扩展”添加额外屏幕'
        : '“共享屏幕 › 扩展”需要此驱动。首次安装需要管理员权限');
      const n = s.net || {};
      const radio = n.radio === 'off' ? 'Windows 设置中的蓝牙已关闭'
        : n.radio === 'unsupported' ? '本机蓝牙不支持此功能（需要低功耗蓝牙）' : '';
      bleSw.set(n.ble !== false);
      bleRow.setHint(n.ble === false ? '仅允许通过本网络或 USB 线连接的手机'
        : radio || '附近的手机可通过蓝牙连接；传输文件和屏幕时会暂时切换到 Wi-Fi Direct');
      blePcSw.set(n.blePc === true);
      bleWifiSw.set(n.bleWifiOff !== false);
      bleWifiRow.setHint(n.bleWifiOff === false ? 'Wi-Fi 连接期间保持蓝牙开启，以便 Wi-Fi 断开时回退'
        : n.bleOff ? '当前已关闭：设备位于同一 Wi-Fi。会话结束后恢复蓝牙'
          : '通过同一 Wi-Fi 网络连接（Wi-Fi Direct 除外）时，蓝牙会关闭至会话结束。与计算机连接期间，手机将无法通过蓝牙发现本机');
      blePcRow.setHint(n.blePc !== true ? '仅允许本网络中的计算机连接'
        : radio || '附近的计算机可通过蓝牙连接；传输文件和屏幕时会暂时切换到 Wi-Fi Direct');
      btPill.textContent = n.radio === 'off' ? '关闭' : n.radio === 'unsupported' ? '不支持' : n.radio ? '开启' : '未知';
      btPill.className = 'pill ' + (n.radio === 'off' || n.radio === 'unsupported' ? 'bad' : n.radio ? 'good' : 'muted');
      deviceName.textContent = s.device.name;
    };
  },
});
