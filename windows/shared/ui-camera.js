// TwinDesk — Copyright (C) 2026 inukaasith. GPL-3.0, see LICENSE.
// Camera tab (Mac, PC and Linux): its switch at the top turns Camera on (off: nothing of it is
// loaded or runs, and nothing is shared); Start runs the other device's camera here. A
// phone's, back or front, through wireless debugging (phoneview.js openCamera, Android 12 or later;
// the phone's own Camera page starts it too); the other computer's, which it shares only with
// "Let … see this camera" on there (camshare.js). Its picture shows on the page (turned with
// Rotate), in a window with Window (or a click on the picture), and with Virtual camera on, in a
// camera every app here can pick ("TwinDesk Camera", shared/vcam.js), installed the first time
// it's turned on. This computer's own camera goes to the other one the same way.
'use strict';

(() => {
  let cur = null; // the last state, for the switch at the top
  let facing = 'back'; // a phone's camera to start with

  const phoneCam = (s) => ((s.phone && s.phone.bridge && s.phone.bridge.windows) || []).find((w) => w.kind === 'camera') || null;
  const running = (s) => (UI.isPhone(s) ? !!phoneCam(s) : !!(s.camera && s.camera.viewing));

  // Why it can't start now ('' when it can).
  function blocked(s) {
    const c = s.camera || {};
    if (UI.isPhone(s)) {
      const ph = s.phone || {};
      if (!ph.connected) return '未连接';
      if (!ph.bridge || ph.bridge.state !== 'ready') return '需要无线调试：请前往“手机”页面设置';
      return '';
    }
    if (!c.connected) return '未连接';
    if (c.ble) return '蓝牙无法传输摄像头画面：请使用 Wi-Fi 或数据线连接';
    if (!c.peerShares && !c.viewing) return '请先在 {name} 上开启“允许 {me} 查看此摄像头”';
    return '';
  }

  function start(on, show = false) {
    const s = cur;
    if (!s) return;
    if (UI.isPhone(s)) UI.api.phoneCamera(on, on ? { facing, show } : undefined);
    else UI.api.camera({ do: on ? 'view' : 'close', show });
  }

  UI.tab({
    id: 'camera',
    group: 'More',
    order: 75,
    title: '摄像头',
    icon: 'camera',
    color: 'linear-gradient(#bf5af2, #8944ab)',
    desc: '在本机查看另一台设备的摄像头画面，并供其他应用使用。',
    badge: (s) => (s.camera && s.camera.sending ? 'warn' : running(s) ? 'on' : ''),
    master: {
      get: (s) => !!(s.camera && s.camera.on),
      set: (v) => UI.api.camera({ do: 'on', on: v }),
    },
    build(body) {
      const { api, el } = UI;
      const cam = (m) => api.camera(m);

      // The picture: what the camera's window sends (a JPEG, about 12 a second). A click opens the window.
      const img = el('img', { alt: '' });
      Object.assign(img.style, { width: '100%', height: '100%', objectFit: 'contain', display: 'block' });
      const said = el('div');
      Object.assign(said.style, { position: 'absolute', inset: '0', display: 'grid', placeItems: 'center', textAlign: 'center', padding: '0 24px', color: '#a1a1a6' });
      const box = el('div', { title: '在独立窗口中打开' }, [img, said]);
      Object.assign(box.style, { position: 'relative', aspectRatio: '16 / 9', background: '#000', borderRadius: '8px', overflow: 'hidden', cursor: 'pointer', margin: '12px' });
      box.onclick = () => cur && running(cur) && start(true, true);
      let url = '';
      if (api.onCamPreview) {
        api.onCamPreview((buf) => {
          if (!cur || !running(cur)) return;
          const next = URL.createObjectURL(new Blob([buf], { type: 'image/jpeg' }));
          img.onload = () => { if (url && url !== next) URL.revokeObjectURL(url); url = next; };
          img.src = next;
        });
      }

      const facingSeg = UI.segmented([{ value: 'back', label: '后置' }, { value: 'front', label: '前置' }], (v) => {
        facing = v;
        facingSeg.set(v);
        if (cur && running(cur)) api.phoneCamera(true, { facing: v }); // switches in the same window
      });
      facingSeg.set(facing);
      const rotate = UI.button('旋转', () => cam({ do: 'rotate' }));
      rotate.title = '顺时针旋转 90°，同时应用到此处、独立窗口和虚拟摄像头';
      const windowBtn = UI.button('独立窗口', () => start(true, true));
      windowBtn.title = '在独立窗口中打开';
      const startBtn = UI.button('启动', () => cur && start(!running(cur)));
      const controls = UI.row('{name} 的摄像头', '', [startBtn, facingSeg, rotate, windowBtn]);
      const picCard = UI.card('', [box, controls]);

      // Virtual camera: the picture also goes to a camera other apps can pick.
      const virtual = UI.switch((v) => cam({ do: 'virtual', on: v }), { label: '虚拟摄像头' });
      const vRemove = UI.button('移除', () => cam({ do: 'vcamRemove' }));
      const vRow = UI.row('虚拟摄像头', '', [vRemove, virtual]);
      // Which camera it feeds, where there's a choice (the Mac: TwinDesk Camera or OBS Virtual Camera).
      const vTarget = UI.select([], (t) => cam({ do: 'vcamTarget', target: t }));
      const vTargetRow = UI.row('输出到', '其他应用中选择的摄像头', [vTarget]);
      const vCard = UI.card('虚拟摄像头', [vTargetRow, vRow]);

      // This computer's camera there.
      const share = UI.switch((v) => cam({ do: 'share', on: v }), { label: '共享此摄像头' });
      const shareRow = UI.row('允许 {name} 查看此摄像头', '', [share]);
      const device = UI.select([{ value: '', label: '默认摄像头' }], (v) => cam({ do: 'device', id: v }));
      const deviceRow = UI.row('摄像头', '选择 {me} 上要共享的摄像头', [device]);
      const stop = UI.button('停止', () => cam({ do: 'stop' }), 'danger');
      const liveRow = UI.row('{name} 正在查看', '对方使用期间，摄像头会保持开启', [stop]);
      const ourCard = UI.card('{me} 的摄像头', [shareRow, deviceRow, liveRow]);

      const note = UI.note('info', '');
      body.append(picCard, vCard, ourCard, note);

      let listed = false;
      return (s) => {
        cur = s;
        const c = s.camera || {};
        const v = s.vcam || {};
        const phone = UI.isPhone(s);
        const on = running(s);
        const vName = `“${v.name || 'TwinDesk Camera'}”`;
        const w = phone ? phoneCam(s) : null;
        if (w && w.facing && w.facing !== facing) {
          facing = w.facing; // started or switched elsewhere (the phone's Camera page)
          facingSeg.set(facing);
        }

        // The picture, or what it's waiting for.
        const why = blocked(s);
        let text = '';
        if (!c.on) text = '已关闭：请在顶部开启“摄像头”';
        else if (!on) text = UI.fill(why || '点击“启动”，在本机使用 {name} 的摄像头');
        else if (phone && w && w.error) text = `已停止：${w.error}`;
        else if (!phone && c.viewStatus === 'refused') text = UI.fill('请在 {name} 上开启“允许 {me} 查看此摄像头”');
        else if (!phone && c.viewStatus === 'failed') text = `启动失败：${c.viewError || '未知错误'}`;
        else if (!phone && c.viewStatus === 'ended') text = UI.fill('{name} 已停止共享摄像头');
        else if (!v.picture) text = phone ? '正在启动手机摄像头…' : UI.fill('正在请求使用 {name} 的摄像头…');
        said.textContent = text;
        said.hidden = !text;
        img.hidden = !on || !!text;
        if (!on && url) {
          URL.revokeObjectURL(url);
          url = '';
          img.removeAttribute('src');
        }
        startBtn.textContent = on ? '停止' : '启动';
        startBtn.disabled = !c.on || (!on && !!why);
        startBtn.title = !on && why ? UI.fill(why) : '';
        facingSeg.el.hidden = !phone;
        rotate.disabled = !on;
        windowBtn.disabled = !on;
        windowBtn.textContent = (phone ? w && w.shown : c.viewShown) ? '独立窗口 ✓' : '独立窗口';
        controls.setHint(on ? `已旋转 ${v.rotate || 0}°。点击画面或“独立窗口”可在新窗口中查看` : '');

        // Virtual camera.
        virtual.set(!!v.on);
        virtual.disable(v.supported === false || !!v.busy);
        vRemove.hidden = !v.installed || !!v.on || !!v.busy || v.removable === false;
        vTargetRow.hidden = !(v.targets && v.targets.length > 1);
        if (!vTargetRow.hidden) {
          vTarget.options(v.targets);
          vTarget.set(v.target || v.targets[0].value);
          vTarget.el.disabled = !!v.busy;
        }
        vRow.setHint(!v.checked ? '正在检查…'
          : v.supported === false ? v.message
            : v.busy === 'install' ? (v.message || '正在安装…')
              : v.busy === 'remove' ? '正在移除…'
                : v.ready && v.live ? `正在共享：请在 Zoom、Teams、浏览器等应用中选择 ${vName} 作为摄像头`
                  : v.ready ? `已就绪：此处的摄像头画面将输出到 ${vName}。请在通话应用中选择该摄像头`
                    : v.on ? (v.message || '未安装')
                      : v.message || `关闭时仅在 TwinDesk 中显示画面；开启后还会输出到 ${vName}，供其他应用选择`);

        // This computer's own camera (not with a phone).
        ourCard.hidden = phone;
        if (!phone) {
          share.set(!!c.share);
          shareRow.setHint(c.shareError || (c.share ? '{name} 可以在对方设备上使用此摄像头，使用时本机会弹出提示' : '已关闭：不向其他设备共享'));
          device.options([{ value: '', label: '默认摄像头' }, ...(c.devices || []).map((d) => ({ value: d.id, label: d.label }))]);
          device.set(c.device || '');
          deviceRow.hidden = !c.share;
          liveRow.hidden = !c.sending;
          if (c.share && !listed) {
            listed = true;
            cam({ do: 'devices' });
          }
        }

        note.set(v.ready
          ? `本机应用中会显示 ${vName}：请选择它，而非 {me} 自带的摄像头。` + (phone ? '' : ' 画面直接在两台电脑之间传输。')
          : '开启“虚拟摄像头”后，即可在 Zoom、Teams、浏览器等应用中使用。' + (phone ? '' : ' 画面直接在两台电脑之间传输。'));
      };
    },
  });
})();
