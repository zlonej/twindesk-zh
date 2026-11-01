// TwinDesk — Copyright (C) 2026 inukaasith, Erdoğan Yeşil. GPL-3.0, see LICENSE.
// Cursor tab: share the pointer across the screen edge. The two direction cards and the live state.
// Which device each edge leads to is the layout in the Multi-device tab (ui-multi.js, docs/mesh.md).
// Behaviour: kvm.js and windows-helper.
'use strict';

UI.tab({
  id: 'cursor',
  order: 20,
  title: "鼠标指针",
  color: 'linear-gradient(#ffb340, #ff9500)',
  desc: "将鼠标指针移出屏幕边缘，即可切换到另一台电脑。",
  // One switch: cursor sharing, the same one the hotkey's double-tap and the other
  // computer flip (kvm.link keeps both in step); on also turns the mouse on. Through Bluetooth
  // it is Over Bluetooth (kvm.setShared).
  master: { get: (s) => s.kvm.mouse && s.kvm.linked && !s.kvmState.paused, set: (v) => UI.api.setKvm(v ? { mouse: true, shared: true } : { shared: false }) },
  badge: (s) => (s.kvm.mouse && s.kvm.linked && !s.kvmState.paused ? 'on' : ''),
  build(body) {
    const { el, api } = UI;
    const set = (partial) => api.setKvm(partial);

    const speed = UI.slider({ min: 0.25, max: 3, step: 0.05, format: (v) => v.toFixed(2) + '×' }, (v) => set({ speed: v }));
    const reverse = UI.switch((v) => set({ reverseScroll: v }), { label: "反向滚动" });
    const gestures = UI.switch((v) => set({ gestures: v }), { label: "触控板手势" });
    const gestureRow = UI.row("触控板手势", "缩放、切换桌面、任务视图／调度中心、前进和后退等手势，在 {name} 上按系统原生方式执行。两端设置同步", [gestures]);
    const ble = UI.switch((v) => set({ ble: v }), { label: "通过蓝牙共享" });
    const bleRow = UI.row("通过蓝牙共享", "当 {name} 不在当前网络、使用蓝牙连接时也共享（速度较慢）。关闭后，需恢复 Wi-Fi 连接才能跨屏。两端设置同步", [ble]);
    const resistance = UI.slider({ min: 0, max: 400, step: 10, format: (v) => (v ? v + ' px' : "无") }, (v) => set({ resistancePx: v }));
    // A phone as the peer: how the pointer and keys reach it (settings.phone.input, the phone's own toggle too).
    const via = UI.segmented([{ value: 'adb', label: 'ADB' }, { value: 'phone', label: "无障碍服务" }], (v) => api.setPhone({ input: v, inputPicked: true }));
    const viaRow = UI.row("控制方式", "ADB：完整控制。无障碍服务：由手机上的 TwinDesk 执行点击和输入，支持 Wi-Fi、Wi-Fi 直连和蓝牙，无需开启开发者选项", [via.el]);
    const pair = UI.dirCards(
      { on: { get: (s) => s.kvm.beDriven, set: (v) => set({ beDriven: v }) }, label: "在 {me} 上使用 {name} 的鼠标和键盘", hint: "将另一端的指针移出屏幕边缘", rows: [
        UI.row("本机指针速度", '', [speed]),
        UI.row("反向滚动", '', [reverse]),
      ] },
      { on: { get: (s) => s.kvm.driveOther, set: (v) => set({ driveOther: v }) }, label: "在 {name} 上使用 {me} 的鼠标和键盘", hint: "将指针移出屏幕边缘", rows: [
        UI.row("屏幕边缘阻力", "再向边缘推移一段距离即可跨屏", [resistance]),
        viaRow,
      ] },
    );

    const status = UI.inputStatus();
    const lock = UI.cursorLock();

    body.append(
      pair.el,
      lock.el,
      UI.card("操作体验", [gestureRow]),
      UI.card("不在同一网络时", [bleRow]),
      UI.card("当前状态", [status], { cls: 'keep-on' }),
      UI.note('info', "在“多设备 › 布局”中设置每个屏幕边缘对应的设备。"),
    );

    function render(s) {
      pair.update(s);
      viaRow.hidden = !UI.peer(s).phone;
      via.set(((s.phone || {}).bridge || {}).input || (((s.phone || {}).settings || {}).input === 'phone' ? 'phone' : 'adb'));
      status.update(s);
      lock.update(s);
      speed.set(s.kvm.speed);
      reverse.set(s.kvm.reverseScroll);
      gestures.set(s.kvm.gestures !== false);
      ble.set(s.kvm.ble !== false);
      resistance.set(s.kvm.resistancePx);
    }
    return render;
  },
});
