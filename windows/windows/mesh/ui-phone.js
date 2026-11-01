// TwinDesk — Copyright (C) 2026 inukaasith, Erdoğan Yeşil. GPL-3.0, see LICENSE.
// Phone page (opened from the phone tile above Overview): the connected phone, its screen in a
// window, its apps in windows of their own, wireless debugging setup, and Disconnect. Port of
// mac/ui-phone.js.
'use strict';

UI.tab({
  id: 'phone',
  order: -1,
  navHidden: true, // the phone tile in the sidebar opens it
  title: "手机",
  heading: "手机",
  desc: '',
  color: 'linear-gradient(#34c759, #248a3d)',
  build(body, page) {
    const { el, api } = UI;
    const h1 = page.querySelector('h1 span');
    const desc = page.querySelector('.page-head p');

    // ---- hero ----
    const dev = el('div', { class: 'device phone big' });
    const name = el('div', { class: 'hero-name' });
    const sub = el('div', { class: 'hero-status' });
    const showBtn = UI.button("显示手机屏幕", () => api.phoneScreen(true), 'primary');
    const discBtn = UI.button("断开连接", () => api.disconnectPhone());
    // On Bluetooth: onto a direct Wi-Fi link on request, until Back to Bluetooth (netlink.js 'user').
    let wifiOn = false;
    const wifiBtn = UI.button("通过 Wi-Fi 直连", () => api.netWifi(!wifiOn));
    const hotspotBtn = UI.button("通过热点连接", () => { api.netWifi('hotspot'); UI.go('overview'); }); // its name and password there
    // How the mouse and keyboard reach the phone (settings.phone.input; the phone's own toggle too).
    const via = UI.segmented([
      { value: 'adb', label: 'ADB', title: "无线调试：完整控制" },
      { value: 'phone', label: "无障碍服务", title: "由手机上的 TwinDesk 执行点击和输入，支持 Wi-Fi、Wi-Fi 直连和蓝牙，无需开发者选项" },
    ], (v) => api.setPhone({ input: v, inputPicked: true })); // picked: no longer automatic
    // What plays on the phone, on the card's right, while it plays (shared/ui-nowplaying.js).
    const media = UI.nowPlaying();
    const hero = el('div', { class: 'card hero phone-hero' }, [
      dev,
      el('div', { class: 'phone-hero-text' }, [
        name, sub,
        el('div', { class: 'phone-hero-actions' }, [showBtn, wifiBtn, hotspotBtn, discBtn]),
      ]),
      media.el,
    ]);

    // ---- wireless debugging ----
    const adbRow = UI.row("无线调试", '', []);
    const adbPill = el('span', { class: 'pill muted' });
    adbRow.querySelector('.controls').append(adbPill, UI.button("重试", () => api.phoneRetry(), 'small'));
    const code = el('input', { type: 'text', placeholder: '123456', maxLength: 6, inputMode: 'numeric', autocomplete: 'off', spellcheck: false, attrs: { 'aria-label': "配对码" } });
    const where = el('input', { type: 'text', placeholder: "地址:端口（可选）", autocomplete: 'off', spellcheck: false, attrs: { 'aria-label': "配对地址" } });
    const pairBtn = UI.button("配对", () => api.phonePair({ code: code.value, where: where.value }), 'small primary');
    code.onkeydown = where.onkeydown = (e) => { if (e.key === 'Enter') pairBtn.click(); };
    const pairRow = UI.row("配对码", "也可在手机的 TwinDesk 通知中输入", [code, where, pairBtn]);
    const steps = UI.note('info', '');
    // Wireless debugging off: one line, the steps behind Show me how.
    let howOpen = false;
    const howBtn = UI.button("查看操作步骤", () => { howOpen = !howOpen; render(UI.state); }, 'small');
    adbRow.querySelector('.controls').prepend(howBtn);
    const how = el('ol', { class: 'how-steps' }, [
      "在手机上打开“设置 › 关于手机 › 软件信息”，连续点击“版本号”7 次，即可启用开发者选项。",
      "打开“设置 › 开发者选项”，开启“USB 调试”。",
      "在同一页面开启“无线调试”。手机必须连接 Wi-Fi 网络（仅有 Wi-Fi 直连还不够）。",
      "点击“无线调试 › 使用配对码配对设备”，在此处或手机的 TwinDesk 通知中输入配对码。",
      "设置完成。首次配对后，TwinDesk 会自动开启无线调试。",
    ].map((t) => el('li', { text: t })));
    // The phone runs the standard build (no notification access): install the full one over it.
    const fullBtn = UI.button("安装", () => api.phoneInstallFull(), 'small primary');
    const fullRow = UI.row("来自手机的通知", '', [fullBtn]);
    const adbCard = UI.card("屏幕、鼠标和键盘", [adbRow, how, pairRow, steps, fullRow]);

    // ---- apps ----
    const search = el('input', { type: 'search', placeholder: "搜索应用", autocomplete: 'off', spellcheck: false, attrs: { 'aria-label': "搜索应用" } });
    const grid = el('div', { class: 'app-grid' });
    const appsNote = UI.note('info', '');
    search.oninput = () => { appsKey = ''; render(UI.state); };
    const appsCard = UI.card("应用", [el('div', { class: 'row' }, [search]), appsNote, grid]);

    // ---- open windows ----
    const winList = el('div');
    const winCard = UI.card("在本电脑中打开的窗口", [winList]);

    // ---- settings ----
    const sound = UI.switch((v) => api.setPhone({ sound: v }), { label: "手机声音" });
    const quality = UI.select([
      { value: '4', label: "节省流量（4 Mb/s）" }, { value: '8', label: "均衡（8 Mb/s）" },
      { value: '16', label: "清晰（16 Mb/s）" }, { value: '24', label: "最清晰（24 Mb/s）" },
    ], (v) => api.setPhone({ bitrateMbps: Number(v) }));
    const wall = UI.switch((v) => api.setPhone({ wallpaper: v }), { label: "壁纸" });
    const enterSends = UI.switch((v) => api.setPhone({ enterSends: v }), { label: "按 Enter 发送消息" });
    const arrowSwipe = UI.switch((v) => api.setPhone({ arrowSwipe: v }), { label: "用方向键滑动" });
    const controls = UI.select([
      { value: 'top', label: "标题栏" }, { value: 'side', label: "侧边栏" }, { value: 'bottom', label: "底部栏" },
    ], (v) => api.setPhone({ controls: v }));
    const optsCard = UI.card("设置", [
      UI.row("在屏幕窗口中播放手机声音", "Android 11 或更高版本", [sound]),
      UI.row("画质", "适用于手机屏幕窗口和应用窗口", [quality]),
      UI.row("窗口控制栏", "标题栏：返回、主屏幕、最近任务等按钮位于顶部。侧边栏：上述按钮及音量、旋转、截图等位于手机窗口右侧。底部栏：返回、主屏幕、最近任务位于画面下方", [controls]),
      UI.row("按 Enter 发送消息", "适用于手机窗口中，或通过本机键盘在手机上使用 WhatsApp、Instagram、Telegram。Shift+Enter 换行", [enterSends]),
      UI.row("用方向键滑动", "在手机窗口中：上下键滚动信息流和短视频，左右键切换页面。关闭后，方向键用于移动光标", [arrowSwipe]),
      UI.row("在此显示手机壁纸", "允许手机上的 TwinDesk 读取壁纸（需通过无线调试设置）", [wall]),
      UI.row("鼠标和键盘", "将指针移出屏幕边缘即可操作手机。连按两次快捷键返回本机。", [UI.button("指针设置", () => UI.go('cursor'), 'small')]),
    ]);

    const notConnected = UI.note('info', '');
    // Below the phone's card: how the mouse and keyboard reach it (automatic until one is picked).
    const viaRow = UI.row("鼠标和键盘", '', [via.el]);
    const viaCard = UI.card('', [viaRow]);
    body.append(notConnected, hero, viaCard, adbCard, appsCard, winCard, optsCard);

    let appsKey = '';
    let winKey = '';
    const STATES = {
      ready: ['good', "就绪"], connecting: ['muted', "正在连接…"], needsPair: ['bad', "需要配对"],
      waitingWifi: ['bad', "已关闭"], missing: ['bad', "缺少组件"], error: ['bad', "出现问题"], off: ['muted', '—'],
    };

    function render(s) {
      media.update(s);
      const ph = s.phone || {};
      const c = ph.connected;
      const info = ph.info || {};
      const br = ph.bridge || { state: 'off' };
      for (const x of [hero, viaCard, adbCard, appsCard, winCard, optsCard]) x.hidden = !c;
      notConnected.set(c ? '' : ph.nearby && ph.nearby.length ? "点击“概览”上方的手机即可连接。" : "尚未连接手机。请在手机上打开 TwinDesk，然后从“概览 › 附近设备”进行配对。");
      if (!c) return;

      h1.textContent = c.name;
      desc.textContent = [info.maker && info.model ? `${info.maker} ${info.model}` : info.model, info.release && `Android ${info.release}`].filter(Boolean).join(' · ');
      name.textContent = c.name;
      sub.textContent = [c.usb ? "USB 数据线" : '', c.rttMs != null ? `${c.rttMs} ms` : "已连接", info.battery != null ? `电量 ${info.battery}%${info.charging ? "，充电中" : ''}` : ''].filter(Boolean).join(' · ');
      if (UI.phoneWall) dev.style.setProperty('--phone-wall', UI.phoneWall);
      else if (info.colors && info.colors.length) dev.style.setProperty('--phone-wall', `linear-gradient(160deg, ${info.colors.join(', ')}${info.colors.length === 1 ? `, ${info.colors[0]}` : ''})`);
      else dev.style.removeProperty('--phone-wall');

      const ready = br.state === 'ready';
      showBtn.disabled = !ready;
      const n = s.net || {};
      wifiOn = (n.why || []).includes('user') || !!n.linked; // made for the screen or files too
      wifiBtn.textContent = wifiOn ? "切回蓝牙" : "通过 Wi-Fi 直连";
      wifiBtn.hidden = !(wifiOn || !!(s.net && s.net.transport === 'ble'));
      hotspotBtn.hidden = wifiOn || n.state === 'hotspot' || !(s.net && s.net.transport === 'ble');
      const off = br.state === 'waitingWifi';
      howBtn.hidden = !off;
      howBtn.textContent = howOpen ? "收起" : "查看操作步骤";
      how.hidden = !off || !howOpen;
      const [cls, label] = STATES[br.state] || STATES.off;
      adbPill.className = `pill ${ready && br.inputBlocked ? 'bad' : cls}`;
      adbPill.textContent = ready && br.inputBlocked ? "触控被阻止" : label;
      adbRow.setHint(off ? (/direct Wi-Fi/.test(br.message) ? br.message : "手机的无线调试已关闭。显示屏幕和 ADB 控制需要开启此功能；无障碍服务无需开启。") : ready && br.inputBlocked ? "屏幕可正常显示，但小米手机阻止了本机的触控、鼠标和键盘操作。请在手机“设置 › 开发者选项”中开启“USB 调试（安全设置）”（需要小米账号）。"
        : ready ? "手机屏幕、触控、鼠标和键盘，以及后台剪贴板共享" : br.message);
      pairRow.hidden = br.state !== 'needsPair' && !br.canPair;
      steps.set(br.state === 'needsPair' ? "TwinDesk 只需与手机的无线调试配对一次。之后使用手机屏幕、应用、鼠标和键盘无需重复此步骤。" : '');
      if (UI.adbBle(s, adbCard, adbRow, adbPill)) { pairRow.hidden = how.hidden = howBtn.hidden = true; steps.set(''); }

      // The standard build can't read notifications (Play Protect blocks downloaded apps that do).
      const full = !ph.adb || ph.adb.full !== false;
      const inst = br.install;
      fullRow.hidden = full && !(inst && inst.state === 'done');
      fullBtn.hidden = full;
      fullBtn.disabled = !ready || !br.fullApk || (inst && inst.state === 'installing');
      fullRow.setHint(inst && inst.state !== 'failed' && inst.message ? inst.message
        : !br.fullApk ? "此版本的 TwinDesk 未包含 Android 应用。"
          : `${inst && inst.state === 'failed' ? `${inst.message} ` : ''}下载的 TwinDesk 无法读取手机通知（Play Protect 会拦截具备此权限的下载应用）。请覆盖安装完整版本，设置和配对记录会保留。${ready ? '' : " 需要开启无线调试。"}`);

      const settings = ph.settings || {};
      sound.set(!!settings.sound);
      quality.set(String(settings.bitrateMbps || 8));
      wall.set(settings.wallpaper !== false);
      enterSends.set(settings.enterSends !== false);
      arrowSwipe.set(settings.arrowSwipe === true);
      controls.set(settings.controls || 'top');
      via.set(br.input || (settings.input === 'phone' ? 'phone' : 'adb'));
      viaRow.setHint(br.inputMode === 'auto' ? (br.state === 'ready' ? "自动：ADB，无线调试已就绪" : "自动：无线调试就绪前使用无障碍服务")
        : br.input === 'phone' ? "由手机上的 TwinDesk 执行点击和输入，首次使用时需在手机的“无障碍”设置中授权" : "无线调试：完整控制");

      // apps (icons come with UI.phoneAssets)
      const apps = (UI.phoneAssets && UI.phoneAssets.apps) || [];
      const term = search.value.trim().toLowerCase();
      const shown = term ? apps.filter((a) => a.name.toLowerCase().includes(term)) : apps;
      appsNote.set(!ready ? "设置好无线调试后，应用会在独立窗口中打开。" : !apps.length ? "正在加载手机应用…" : '');
      const ak = JSON.stringify([shown.length, term, ph.assets, ph.activeId, ready]);
      if (ak !== appsKey) {
        appsKey = ak;
        grid.replaceChildren(...shown.slice(0, 400).map((a) => {
          const img = UI.appIcon(a.icon);
          const b = el('button', { class: 'app-tile', title: `打开 ${a.name} 的独立窗口（右键可固定到“开始”菜单）`, disabled: !ready }, [img, el('span', { text: a.name })]);
          b.onclick = () => api.phoneOpenApp({ id: a.id, name: a.name });
          b.oncontextmenu = (e) => { e.preventDefault(); api.phoneAppMenu({ id: a.id, name: a.name }); }; // Pin to Start
          return b;
        }));
      }

      const wins = br.windows || [];
      winCard.hidden = !wins.length;
      const wk = JSON.stringify(wins);
      if (wk !== winKey) {
        winKey = wk;
        winList.replaceChildren(...wins.map((w) => UI.row(w.kind === 'screen' ? "手机屏幕" : w.title, w.kind === 'screen' ? "镜像" : w.app, [UI.button("关闭", () => api.phoneCloseView(w.id), 'small')])));
      }
    }
    return render;
  },
});
