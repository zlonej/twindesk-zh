// TwinDesk — Copyright (C) 2026 inukaasith. GPL-3.0, see LICENSE.
// Display › PC → Mac: this PC's screen in a window on the Mac, controlled from there.
// Mirror shows an existing monitor; Extend adds an extra (virtual) screen (vdd.js).
'use strict';

UI.tab({
  id: 'pc-mac',
  group: 'Display',
  order: 11,
  title: '共享屏幕',
  heading: '在 {name} 上显示 {me} 的屏幕',
  icon: 'display',
  color: 'linear-gradient(#5ac8fa, #0a84ff)',
  desc: '在另一台计算机的窗口中查看 {me}。',
  master: { get: (s) => s.pcScreen.mode !== 'off', set: (v) => UI.api.setPcScreenMode(v ? 'mirror' : 'off') },
  badge: (s) => (s.pcScreen.status === 'live' ? 'on' : ''),
  build(body) {
    const { el, api } = UI;
    const set = (partial) => api.setPcScreen(partial);
    const mode = UI.segmented([
      { value: 'off', label: '关闭' },
      { value: 'extend', label: '扩展' },
      { value: 'mirror', label: '镜像' },
    ], (v) => api.setPcScreenMode(v));
    const monitor = UI.select([], (v) => set({ monitor: v }));
    const extendSize = UI.select([
      { value: 'mac', label: '与对方屏幕相同' },
      { value: '1920x1080', label: '1920 × 1080' },
      { value: '2560x1440', label: '2560 × 1440' },
      { value: '3840x2160', label: '3840 × 2160' },
    ], (v) => set({ extendSize: v }));
    const streamSize = UI.select([
      { value: 1080, label: '1080p（1920 × 1080），速度最快' },
      { value: 1440, label: '1440p（2560 × 1440），更清晰' },
      { value: 0, label: '原始尺寸' },
    ], (v) => set({ maxHeight: Number(v) }));
    const quality = UI.select([
      { value: 10, label: '低，10 Mbps' },
      { value: 20, label: '中，20 Mbps' },
      { value: 30, label: '高，30 Mbps' },
      { value: 50, label: '最佳，50 Mbps（有线网络）' },
    ], (v) => set({ mbps: Number(v) }));
    const paceRow = UI.paceRow(); // One Playback setting, synced with the other computer
    const sound = UI.switch((v) => set({ sound: v }), { label: '包含声音' });
    const input = UI.switch((v) => set({ input: v }), { label: '接收操作' });
    const inputRow = UI.row('接收操作', '', [input]); // "Receive input from Mac" / "from PC2"
    const remote = UI.switch((v) => set({ remote: v }), { label: '远程启动' });
    const remoteRow = UI.row('允许另一台计算机启动和切换此屏幕', '', [remote]); // screen.ctl

    const monitorRow = UI.row('显示', '', [monitor]);
    const extendRow = UI.row('尺寸', '', [extendSize]);
    const details = UI.details(['状态', '显示', '画面', '速度', '往返延迟', '编解码器', '编码器', '丢帧']);

    const installBtn = UI.button('安装', () => api.installVdd(), 'small primary');
    const removeBtn = UI.button('移除', () => api.removeVdd(), 'small');
    const driver = UI.row('TwinDesk 虚拟显示器', '', [installBtn, removeBtn]); // Extend's screen, from the Virtual Display Driver (vdd.js)
    const note = UI.note('bad', '');
    // No driver: Extend is greyed out; say why, with Install right there.
    const missingBtn = UI.button('安装', () => api.installVdd(), 'small primary');
    const missing = el('div', { class: 'note warn' }, [el('span', { text: '尚未安装虚拟显示器驱动。安装后即可使用扩展模式。' }), missingBtn]);
    missing.style.alignItems = 'center';
    missing.style.justifyContent = 'space-between';

    body.append(
      missing,
      UI.card('屏幕', [UI.row('模式', '', [mode]), monitorRow, extendRow]),
      UI.card('画面', [UI.row('分辨率', '', [streamSize]), UI.row('画质', '', [quality]), paceRow], { cls: 'keep-on' }),
      UI.card('声音和控制', [UI.row('包含声音', '', [sound]), inputRow], { cls: 'keep-on' }),
      UI.card('远程', [remoteRow], { cls: 'keep-on' }),
      details,
      UI.card('', [driver, note], { cls: 'keep-on' }),
    );

    return (s) => {
      const p = s.pcScreen;
      const v = p.vdd;
      const connected = s.link.state === 'connected';
      mode.set(p.mode);
      mode.el.querySelectorAll('button').forEach((b, i) => { b.disabled = p.busy || (i === 1 && !v.installed); });
      monitor.options(p.monitors.map((m) => ({ value: m.id, label: m.label })));
      monitor.set(p.monitor || (p.monitors.find((m) => /\(main\)$/.test(m.label)) || p.monitors[0] || { id: '' }).id);
      monitorRow.hidden = p.mode === 'extend';
      extendRow.hidden = p.mode !== 'extend';
      extendSize.set(p.extendSize);
      extendRow.setHint(p.extendSize === 'mac' ? p.extendPx[0] + ' × ' + p.extendPx[1] : '');
      streamSize.set(p.maxHeight);
      quality.set(p.mbps);
      paceRow.render(s);
      sound.set(p.sound);
      input.set(p.input);
      remote.set(p.remote);

      const on = p.mode !== 'off';
      const st = p.status === 'live' && p.stats;
      const who = UI.peer(s).the;
      const mon = p.monitors.find((m) => m.id === p.monitor) || p.monitors.find((m) => /\(main\)$/.test(m.label)) || p.monitors[0];
      details.set({
        '状态': (!on ? '关闭' : p.busy ? '正在启动额外屏幕…' : p.status === 'live' ? '显示于 ' + who
          : !connected ? '正在等待 ' + who : !p.mac.accept ? '已就绪，等待 ' + who + ' 打开屏幕' : '正在连接…') + (p.error ? ': ' + p.error : ''),
        '显示': !on ? '' : p.mode === 'extend' ? `TwinDesk 虚拟显示器，${p.extendPx[0]} × ${p.extendPx[1]}` : mon ? mon.label : '',
        '画面': st ? `${st.width} × ${st.height}, ${st.fps} fps` : '',
        '速度': st ? `${st.mbps} Mbps 已发送` + (st.targetMbps ? `，网络允许 ${st.targetMbps}` : '') : '',
        '往返延迟': st && st.rttMs != null ? st.rttMs + ' ms' : '',
        '编解码器': st && st.codec ? st.codec.toUpperCase() : '',
        '编码器': st && st.encoder ? UI.codecImpl(st.encoder, st.hw) : '',
        '丢帧': st ? st.dropped || 0 : '',
      });

      missing.hidden = !v.checked || v.installed;
      missingBtn.disabled = !!v.busy;
      missingBtn.textContent = v.busy === 'install' ? '正在安装…' : '安装';
      installBtn.hidden = v.installed;
      installBtn.disabled = !!v.busy || !v.checked;
      installBtn.textContent = v.busy === 'install' ? '正在安装…' : '安装';
      removeBtn.hidden = !v.installed;
      removeBtn.disabled = !!v.busy || p.mode === 'extend';
      driver.setHint(v.busy === 'remove' ? '正在移除…' : v.busy === 'install' ? '正在安装…' : v.installed ? '已安装。为扩展模式添加额外屏幕。' : '为扩展模式添加额外屏幕。安装显示器驱动时需要一次管理员权限。');
      inputRow.label.textContent = '接收操作，来自 ' + UI.peer(s).them;
      remoteRow.label.textContent = '允许 ' + UI.peer(s).the + ' 启动和切换此屏幕';
      remoteRow.setHint(p.remote ? '在对方打开屏幕窗口即可启动共享，并可在对方切换扩展和镜像模式。' : '');
      note.set(v.message);
    };
  },
});
