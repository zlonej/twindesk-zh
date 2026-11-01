// TwinDesk — Copyright (C) 2026 inukaasith. GPL-3.0, see LICENSE.
// Display › Mac → PC: the Mac's screen in the Monitor 2 window; this PC owns the window, the screen
// sound volume and F11/F9. When the other computer lets us (its screen.state `remote`),
// Open and the switch start/stop its sharing there and Extend | Mirror switches it (screen.ctl).
// No "Open automatically" — the other computer sends nothing until Open here.
'use strict';

UI.tab({
  id: 'mac-pc',
  hidden: (s) => UI.isPhone(s), // the Phone page has the phone's screen, sound and apps
  group: 'Display',
  order: 10,
  title: '接收屏幕',
  heading: '在 {me} 上显示 {Name} 的屏幕',
  icon: 'receive',
  color: 'linear-gradient(#5ac8fa, #0a84ff)',
  desc: '在本机窗口中查看另一台计算机的屏幕。',
  master: {
    get: (s) => s.stream.state === 'on' || !!(s.stream.remote && s.stream.remote.on),
    set: (v) => (v ? UI.api.openMonitor() : UI.api.remoteScreen({ share: false })),
    disabled: (s) => s.link.state !== 'connected' || !(s.stream.remote && s.stream.remote.remote),
  },
  badge: (s) => (s.stream.state === 'on' || (s.stream.remote && s.stream.remote.on) ? 'on' : ''),
  build(body) {
    const { el, api } = UI;
    const openBtn = UI.button('打开', () => api.openMonitor(), 'primary');
    const winRow = UI.row('屏幕窗口', '', [openBtn]);
    // (as the Mac): one control, the same three choices as on the other computer itself,
    // kept in step by its screen.state; choosing sends screen.ctl.
    const mode = UI.segmented([
      { value: 'off', label: '关闭' },
      { value: 'mirror', label: '镜像' },
      { value: 'extend', label: '扩展' },
    ], (v) => api.remoteScreen(v === 'off' ? { share: false } : { share: true, mode: v }));
    const modeRow = UI.row('{Name} 的共享模式', '', [mode]);
    const volume = UI.slider({ min: 0, max: 1, step: 0.05, format: (v) => Math.round(v * 100) + '%' }, (v) => api.setMonitor({ volume: v }));
    const mute = UI.switch((v) => api.setMonitor({ mute: !v }), { label: '播放声音' });
    const paceRow = UI.paceRow(); // One Playback setting, synced with the other computer
    const framegen = UI.switch((v) => api.setMonitor({ framegen: v }), { label: '帧生成' });

    const details = UI.details(['状态', '显示', '画面', '速度', '往返延迟', '编解码器', '解码器', '延迟', '丢帧', '卡顿']);

    body.append(
      UI.card('', [
        winRow,
        modeRow,
        paceRow,
        UI.row('帧生成', '补足延迟或丢失的帧；本机屏幕刷新率高于视频帧率时插入中间帧', [framegen]),
        UI.row('声音', '', [mute, volume]),
        UI.row('全屏', '', [el('kbd', { text: 'F11' })]),
      ], { cls: 'keep-on' }),
      details,
    );

    return (s) => {
      const st = s.stream;
      const on = st.state === 'on';
      const connected = s.link.state === 'connected';
      openBtn.disabled = !connected;
      openBtn.textContent = st.watching ? '显示' : '打开';
      const who = UI.peer(s).the;
      const sharing = on || !!(st.remote && st.remote.on); // on over there, maybe paused while nobody watches
      const r = st.remote;
      winRow.setHint(!connected ? '正在等待 ' + who : on ? '正在显示 ' + st.name : sharing ? '共享已开启于 ' + who + '。点击“打开”即可查看。'
        : r && r.remote ? '点击“打开”将在此设备上启动共享：' + who : '请在此设备上开启共享：' + who);
      mode.set(r ? (r.on ? r.mode : 'off') : '');
      const MODES = ['off', 'mirror', 'extend'];
      mode.el.querySelectorAll('button').forEach((b, i) => { b.disabled = !connected || !r || !r.remote || (i > 0 && !(r.modes || []).includes(MODES[i])); });
      modeRow.setHint(!connected ? '连接后即可在此选择模式'
        : !r ? '更新另一台计算机上的 TwinDesk 后，即可在此选择模式'
          : !r.remote ? '另一台计算机未允许从本机选择模式'
            : r.on ? (r.mode === 'extend' ? '为对方添加额外屏幕，并在本机显示' : '在本机显示对方的主屏幕') : '选择“镜像”或“扩展”，也可直接点击“打开”');
      mute.set(!s.monitor.mute);
      volume.set(s.monitor.volume);
      paceRow.render(s);
      framegen.set(s.monitor.framegen);
      const x = on && st.stats;
      details.set({
        '状态': !connected ? '未连接' : !on ? (sharing ? '已暂停，无人观看' : '关闭') : s.macInput ? '实时' : '实时，仅查看',
        '显示': on ? st.name + (st.width ? ', ' + st.width + ' × ' + st.height : x ? ', ' + x.width + ' × ' + x.height : '') : '',
        '画面': x ? x.width + ' × ' + x.height + ', ' + x.fps + ' fps' : '',
        '速度': x ? x.mbps + ' Mbps 接收' : '',
        '往返延迟': x && x.rttMs != null ? x.rttMs + ' ms' : '',
        '编解码器': x ? x.codec.toUpperCase() : '',
        '解码器': x && x.decoder ? UI.codecImpl(x.decoder, x.hw) : '',
        '延迟': x ? x.delayMs + ' ms' : '',
        '丢帧': x ? x.dropped : '',
        '卡顿': x ? x.freezes || 0 : '',
      });
    };
  },
});
