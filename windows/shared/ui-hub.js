// TwinDesk — Copyright (C) 2026 inukaasith. GPL-3.0, see LICENSE.
// What the Calls, Messages, Photos and Files pages share, on the Mac, PC and Linux alike (they use only
// the UI kit's common API): the line at the top of each saying what's missing — the phone, its
// permission (Allow asks on the phone, only now), the right TwinDesk on it — and the phone's
// answers (phonehub.js passes them on as 'hub' messages) by type.
'use strict';

(() => {
  const handlers = new Map(); // type -> [fn]
  let listening = false;

  // fn(msg) for each answer of this type from the phone.
  UI.hubOn = (t, fn) => {
    if (!handlers.has(t)) handlers.set(t, []);
    handlers.get(t).push(fn);
    if (listening || !UI.api.onHub) return;
    listening = true;
    UI.api.onHub((m) => {
      for (const f of handlers.get(m && m.t) || []) {
        try { f(m); } catch (e) { console.error(`hub ${m.t}:`, e); }
      }
    });
  };

  // Ask the phone (only while that page's switch is on: phonehub.js checks).
  UI.hubAsk = (msg) => UI.api.hub({ do: 'send', msg });

  // The folder saved files go to here, by its name: General › Received files on Windows and Linux
  // (files.received, the one in use), Files › Save to on the Mac (files.folder, '' = Downloads).
  UI.receivedName = (s) => {
    const f = (s && s.files) || {};
    const dir = f.received || f.folder || '';
    return dir ? dir.split(/[\\/]/).filter(Boolean).pop() || dir : '下载';
  };

  // That page can show the phone's things now.
  UI.hubReady = (s, what) => {
    const h = s && s.hub;
    return !!(h && h[what] && h.connected && h.perm && h.perm[what] && ['ok', 'partial'].includes(h.perm[what].perm));
  };

  // The session runs through Bluetooth (Mac: s.client; PC and Linux: s.net). USB, Wi-Fi and Wi-Fi
  // Direct aren't: Photos and Phone Files work on those, and load nothing over Bluetooth.
  // Wireless debugging reaches the phone over Wi-Fi only: over Bluetooth its card is greyed out and
  // says so (the Phone page, the Overview). True while it is.
  UI.adbBle = (s, card, row, pill) => {
    const ble = UI.onBle(s);
    card.classList.toggle('wifi-only', ble);
    if (!ble) return false;
    pill.className = 'pill muted';
    pill.textContent = '仅限 Wi-Fi';
    row.setHint('此功能仅支持 Wi-Fi。当前通过蓝牙连接，请改用 Wi-Fi 直连或连接到同一 Wi-Fi 网络。');
    return true;
  };
  UI.onBle = (s) => !!(s && ((s.client && s.client.transport === 'ble') || (s.net && s.net.transport === 'ble')));
  // How the session runs, for the status lines: Bluetooth; a Wi-Fi Direct link (or a phone's
  // hotspot) made for a file or a screen, which goes again by itself ("Temporary"), or asked for
  // with Connect with Wi-Fi Direct on either side; else the same network.
  UI.via = (s) => {
    if (UI.onBle(s)) return '蓝牙';
    const n = (s && s.net) || {};
    if (!['hosting', 'joined'].includes(n.state) || n.onGroup === false) return 'Wi-Fi'; // a group up beside a session on the real network is still Wi-Fi
    const name = n.kind === 'hotspot' ? '热点' : 'Wi-Fi Direct';
    const asked = ['user', 'hotspot'].some((w) => (n.why || []).includes(w) || (n.peerWhy || []).includes(w));
    return asked ? name : '临时' + name;
  };

  UI.phoneName = (s) => (s && s.hub && s.hub.name) || '你的手机';
  // How a connected phone's sound gets here (phone-bridge.js _sound), for the Audio page; null: no phone.
  UI.phoneSound = (s) => {
    const b = s && s.phone && s.phone.connected && s.phone.bridge;
    if (!b) return null;
    const ph = s.phone.connected.name;
    const n = b.sound || {};
    if (n.on) return `正在播放。声音由 ${ph} 采集，因此手机上也会播放（通过无线调试可仅在电脑播放）`;
    if (n.error) return n.error;
    if (n.waiting) return `请在 ${ph} 的通知或 TwinDesk“声音”页面点击“开始”`;
    if (n.net) return `正在请求 ${ph}…`;
    if (b.state === 'ready') return '通过无线调试';
    return `通过 Wi-Fi 传输：使用无线调试，或由 ${ph} 采集声音`;
  };

  // The selected device changed (the sidebar's device list): a page that loaded data of the previous
  // device drops it and loads the new one's (fn runs after UI.state is the new device's).
  UI.onDeviceChange = (fn) => window.addEventListener('twindesk-device', fn);

  // page shown / hidden (the shells toggle `hidden`).
  UI.onShown = (page, fn) => {
    new MutationObserver(() => fn(!page.hidden)).observe(page, { attributes: true, attributeFilter: ['hidden'] });
  };

  const NEEDS = {
    calls: { state: '通话状态', numbers: '来电号码与通话记录', dial: '拨打电话', answer: '接听和挂断电话', contacts: '联系人姓名' },
    messages: { read: '读取短信', send: '发送短信', contacts: '联系人姓名' },
  };
  const LABEL = { calls: '通话', messages: '短信', media: '照片与视频', files: '文件' };

  // The top of a page: { el, render(s) }.
  UI.hubTop = (what) => {
    const { el, api } = UI;
    const text = el('div', { class: 'hub-top-text' });
    const asked = el('div', { class: 'hint' });
    const allow = UI.button('在手机上授权', () => {
      api.hub({ do: 'ask', what });
      allow.dataset.at = String(Date.now());
    }, 'primary');
    const install = UI.button('安装', () => UI.api.phoneInstallFull && UI.api.phoneInstallFull());
    const box = el('div', { class: 'note hub-top' }, [el('div', { class: 'hub-top-body' }, [text, asked]), el('div', { class: 'hub-top-actions' }, [install, allow])]);
    box.hidden = true;
    const render = (s) => {
      const h = s.hub || {};
      const phone = UI.phoneName(s);
      const st = h.perm && h.perm[what];
      let msg = '', kind = 'info', canAllow = false, canInstall = false;
      if (!h[what]) msg = `已关闭。开启后，${phone} 将请求所需权限。`;
      else if (!h.connected) msg = `连接 ${phone} 后即可使用“${LABEL[what]}”：请点击侧边栏顶部的设备。`;
      else if (!h.supported) msg = `正在等待 ${phone}… 使用“${LABEL[what]}”需要手机上的 TwinDesk 更新到最新版本。`;
      else if (st.perm === 'none' && what === 'files') { msg = `“手机文件”需要 ${phone} 运行 Android 11 或更新版本。也可以使用通过 ADB 工作的“手机磁盘”功能。`; kind = 'warn'; }
      else if (st.perm === 'none') {
        msg = `“${LABEL[what]}”需要在 ${phone} 上安装带通知功能的完整版 TwinDesk（Android 不允许普通下载的应用读取短信）。 ${s.phone && s.phone.adb && s.phone.adb.address ? '点击“安装”将通过无线调试安装到手机，并保留你的设置。' : '请先在“手机”页面设置无线调试，再点击“安装”。'}`;
        kind = 'warn';
        canInstall = !!UI.api.phoneInstallFull;
      } else if (st.perm === 'ask') {
        msg = what === 'media' ? `请允许 ${phone} 向 TwinDesk 共享照片和视频。`
          : what === 'files' ? `请在 ${phone} 上授予 TwinDesk“所有文件访问权限”：应用将直接读写手机存储，无需 ADB。Android 会打开相应设置页面。`
            : `请在 ${phone} 上授予“${LABEL[what]}”权限：TwinDesk 需要${Object.values(NEEDS[what]).join(', ')}。`;
        kind = 'warn';
        canAllow = true;
      } else if (st.perm === 'partial') {
        msg = what === 'media' ? `这里只显示你在 ${phone} 上选择的照片。`
          : `“${LABEL[what]}”的部分功能还需要 ${phone} 上的这些权限：${(st.missing || []).map((m) => NEEDS[what][m]).filter(Boolean).join(', ')}。`;
        canAllow = true;
      }
      box.hidden = !msg;
      box.className = `note hub-top ${kind}`;
      text.textContent = msg;
      allow.hidden = !canAllow;
      install.hidden = !canInstall;
      const recently = Number(allow.dataset.at || 0) > Date.now() - 60000;
      asked.textContent = canAllow && recently ? (h.perm && h.perm.opens ? `请查看 ${phone}：Android 正在请求授权。` : `请点击 ${phone} 上的通知。`) : '';
      asked.hidden = !asked.textContent;
    };
    return { el: box, render };
  };

  // Over Bluetooth, a page that needs Wi-Fi (the shells' wifiOnly) is shown as it is, with this on
  // top: only over Wi-Fi Direct (or the same network), and the button that moves the session
  // there (netlink.js; Linux has none: join the same network). { el, render(s, off) }.
  UI.wifiGate = () => {
    const { el, api } = UI;
    const text = el('div', { class: 'hub-top-text' });
    const go = UI.button('使用 Wi-Fi 直连', () => api.netWifi(true), 'primary');
    const box = el('div', { class: 'note warn hub-top wifi-note' }, [el('div', { class: 'hub-top-body' }, [text]), el('div', { class: 'hub-top-actions' }, [go])]);
    box.hidden = true;
    const render = (s, off) => {
      box.hidden = !off;
      if (!off) return;
      const n = s.net || {};
      const moving = ['asking', 'hosting', 'joining'].includes(n.state);
      const can = !!api.netWifi;
      text.textContent = moving ? '此功能仅支持 Wi-Fi 直连。正在连接…'
        : n.state === 'failed' ? `此功能仅支持 Wi-Fi 直连。${n.error || 'Wi-Fi 直连未能建立'}。`
          : `此功能仅支持 Wi-Fi 直连${can ? '' : '或同一 Wi-Fi 网络'}：当前通过蓝牙连接。${can ? ' 也可以连接到同一 Wi-Fi 网络。' : ''}`;
      go.hidden = !can;
      go.disabled = moving;
      go.textContent = moving ? '正在连接…' : n.state === 'failed' ? '重试' : '使用 Wi-Fi 直连';
    };
    return { el: box, render };
  };

  UI.initial = (name) => {
    const t = String(name || '').trim();
    return /^[+\d]/.test(t) || !t ? '#' : t.charAt(0).toUpperCase();
  };

  UI.avatar = (name, photo) => {
    const a = UI.el('span', { class: 'hub-avatar', text: photo ? '' : UI.initial(name) });
    if (photo) a.style.backgroundImage = `url("${photo}")`;
    return a;
  };

  UI.clock = (ts) => {
    const d = new Date(ts);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    if (now - d < 6 * 86400000) return d.toLocaleDateString([], { weekday: 'short' });
    return d.toLocaleDateString([], { day: 'numeric', month: 'short', year: d.getFullYear() === now.getFullYear() ? undefined : 'numeric' });
  };

  UI.duration = (s) => {
    s = Math.max(0, Math.round(s));
    return s >= 3600 ? `${Math.floor(s / 3600)}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}` : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };
})();
