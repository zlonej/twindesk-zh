// TwinDesk — Copyright (C) 2026 inukaasith. GPL-3.0, see LICENSE.
// Multi-device tab, one-to-one app: what it is and the button that turns it on (multi.js). TwinDesk
// restarts into mesh/main.js, whose own page (mesh/ui-multi.js) has the settings for several devices.
'use strict';

UI.tab({
  id: 'multi',
  order: 95,
  title: '多设备',
  color: 'linear-gradient(#5e5ce6, #3634a3)',
  desc: '同时连接多台计算机和手机',
  tag: '测试版',
  bottom: true,
  build(body) {
    const { api } = UI;
    // Mesh mode is in beta: the popup says so (shared/mesh-intro.js) before it restarts.
    const turnOn = UI.button('开启', () => MeshIntro.confirm(() => {
      turnOn.disabled = true;
      turnOn.textContent = '正在重启…';
      api.setMulti(true);
    }), 'small primary');

    body.append(
      UI.card('网状互联模式', [
        UI.row('同时使用多台设备',
          '同时连接计算机和手机，共用剪贴板和通知，通过屏幕边缘切换设备，让手机与计算机协同工作',
          [turnOn]),
      ]),
      UI.note('info', '开启或关闭此功能时，TwinDesk 将重启。'),
      MeshIntro.art(),
    );

    return () => {};
  },
});
