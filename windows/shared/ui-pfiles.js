// TwinDesk — Copyright (C) 2026 inukaasith. GPL-3.0, see LICENSE.
// Phone Files page (Mac, PC and Linux): the phone's storage, folder by folder, through TwinDesk on
// the phone with All files access (Hub.kt, FsBrowse.kt there), so no ADB: Mount is the drive in the
// file manager, through ADB. Open a folder, Save files and folders here (into Downloads, as Send
// does), Upload into the folder that's open (or drop files on it), New folder, Rename, Delete.
// On USB, Wi-Fi or Wi-Fi Direct; over Bluetooth it says so, with Connect with Wi-Fi Direct.
// Shared folders (shared/foldershare.js), both ways: the folder the phone shares opens here in the
// file manager, and a folder here shows in the phone's Files app.
'use strict';

UI.tab({
  id: 'pfiles',
  group: 'Phone',
  order: 8,
  title: '手机文件',
  icon: 'folder',
  color: 'linear-gradient(#64d2ff, #0a84ff)',
  desc: '浏览手机存储，双向传输文件。由手机上的 TwinDesk 处理，无需 ADB。',
  hidden: (s) => !UI.isPhone(s), // only while a phone is connected
  wifiOnly: true, // files are too big for Bluetooth: Connect with Wi-Fi Direct on top, nothing loads
  master: { get: (s) => !!(s.hub && s.hub.files), set: (v) => UI.api.hub({ do: 'set', what: 'files', on: v }) },
  badge: (s) => (s.hub && s.hub.files ? 'on' : ''),
  build(body, page) {
    const { el, api } = UI;
    const top = UI.hubTop('files');

    let cwd = '';
    let items = []; // {name, dir, size, at, n}
    let hidden = false;
    let asking = '';
    const chosen = new Set(); // names in cwd
    let confirmDelete = false;
    let renaming = ''; // the name being renamed
    let refs = 0;

    const crumbs = el('div', { class: 'hub-crumbs' });
    const upBtn = UI.button('‹', () => cwd && open(cwd.split('/').slice(0, -1).join('/')), 'small');
    upBtn.title = '上一级';
    const refreshBtn = UI.button('刷新', () => open(cwd), 'small');
    const hiddenBtn = UI.button('隐藏文件', () => { hidden = !hidden; hiddenBtn.classList.toggle('on', hidden); open(cwd); }, 'small');
    hiddenBtn.title = '显示名称以点开头的隐藏文件';
    const mkdirBtn = UI.button('新建文件夹', () => { newRow.hidden = false; newName.value = '新建文件夹'; newName.select(); newName.focus(); }, 'small');
    const uploadBtn = UI.button('上传…', () => api.hub({ do: 'upload', path: cwd }), 'small primary');
    const bar = el('div', { class: 'hub-media-bar' }, [upBtn, crumbs, el('span', { class: 'hub-grow' }), hiddenBtn, refreshBtn, mkdirBtn, uploadBtn]);

    // What's chosen: Save, Rename (one), Delete (asks once more).
    const selText = el('span', { class: 'hint' });
    const saveBtn = UI.button('保存', () => save([...chosen]), 'small primary');
    const renameBtn = UI.button('重命名', () => { renaming = [...chosen][0]; paint(); }, 'small');
    const deleteBtn = UI.button('删除', () => {
      if (!confirmDelete) { confirmDelete = true; return paint(); }
      act({ a: 'delete', path: cwd, paths: [...chosen].map(join) });
      chosen.clear();
      confirmDelete = false;
      paint();
    }, 'small');
    const clearBtn = UI.button('完成', () => { chosen.clear(); confirmDelete = false; paint(); }, 'small');
    const selBar = el('div', { class: 'hub-media-bar hub-fs-sel' }, [selText, el('span', { class: 'hub-grow' }), saveBtn, renameBtn, deleteBtn, clearBtn]);

    // A new folder, named here.
    const newName = el('input', { class: 'hub-input hub-grow', type: 'text', attrs: { 'aria-label': '文件夹名称', maxlength: '255' } });
    const newRow = el('div', { class: 'hub-media-bar hub-fs-new', hidden: true }, [UI.icon('folder', 'hub-fs-ico'), newName,
      UI.button('创建', () => mkdir(), 'small primary'), UI.button('取消', () => { newRow.hidden = true; }, 'small')]);
    newName.addEventListener('keydown', (e) => { if (e.key === 'Enter') mkdir(); else if (e.key === 'Escape') newRow.hidden = true; });

    const list = el('div', { class: 'hub-list hub-fs-list' });
    const status = el('div', { class: 'hint hub-fs-status' });
    const listCard = UI.card('', [list]);
    const wrap = el('div', { class: 'hub-fs' }, [bar, selBar, newRow, listCard, status]);
    // Shared folders, both ways (not behind the switch above: they need no All files access here).
    const fm = navigator.platform.startsWith('Mac') ? 'Finder' : navigator.platform.startsWith('Win') ? 'Explorer' : 'the file manager';
    const openBtn = UI.button('打开', () => api.hub({ do: 'share', a: 'open' }), 'small primary');
    const ejectBtn = UI.button('弹出', () => api.hub({ do: 'share', a: 'unmount' }), 'small');
    const autoSw = UI.switch((v) => api.hub({ do: 'share', a: 'auto', on: v }), { label: '手机共享文件夹时自动打开' });
    const phoneRow = UI.row('手机共享的文件夹', '', [openBtn, ejectBtn, autoSw]);
    const chooseBtn = UI.button('选择…', () => api.hub({ do: 'share', a: 'choose' }), 'small');
    const defaultBtn = UI.button('默认', () => api.hub({ do: 'share', a: 'default' }), 'small');
    const serveSw = UI.switch((v) => api.hub({ do: 'share', a: 'serve', on: v }), { label: '向手机共享文件夹' });
    const mineRow = UI.row('向手机共享文件夹', '', [chooseBtn, defaultBtn, serveSw]);
    const shareCard = UI.card('共享文件夹', [phoneRow, mineRow]);
    body.append(top.el, shareCard, wrap);
    const tilde = (p) => String(p || '').replace(/^(\/Users\/[^/]+|\/home\/[^/]+|[A-Z]:\\Users\\[^\\]+)/, '~');
    function renderShare(s) {
      const sh = s.hub && s.hub.share;
      shareCard.hidden = !sh; // over Bluetooth too: Open moves the session onto Wi-Fi Direct first
      if (shareCard.hidden) return;
      const ph = UI.phoneName(s);
      const p = sh.phone;
      phoneRow.label.textContent = `${ph} 共享的文件夹`;
      autoSw.set(p.auto);
      openBtn.hidden = !p.offered;
      openBtn.disabled = !!p.busy;
      openBtn.textContent = p.mounted ? `在${fm === 'the file manager' ? '文件管理器' : fm === 'Explorer' ? '资源管理器' : fm}中显示` : '打开';
      ejectBtn.hidden = !p.mounted;
      phoneRow.setHint(p.message || (p.busy === 'mounting' ? '正在打开…' : p.busy === 'wifi' ? '正在建立 Wi-Fi 直连…'
        : p.wifi ? `“${p.name}”：点击“打开”将使用 Wi-Fi 直连，并在${fm === 'Explorer' ? '资源管理器' : fm === 'the file manager' ? '文件管理器' : fm}中显示`
        : !p.offered ? `未共享文件夹：请在 ${ph} 上打开 TwinDesk › 文件访问 › 共享文件夹`
          : p.mounted ? `“${p.name}”，位于${fm === 'Explorer' ? '资源管理器' : fm === 'the file manager' ? '文件管理器' : fm}${fm === 'Finder' ? '的“位置”下' : ''}` : `“${p.name}”：点击“打开”可在${fm === 'Explorer' ? '资源管理器' : fm === 'the file manager' ? '文件管理器' : fm}中显示`));
      phoneRow.hint.classList.toggle('bad', !!p.message);
      const m = sh.mine;
      mineRow.label.textContent = `向 ${ph} 共享文件夹`;
      serveSw.set(m.on);
      mineRow.setHint(m.error ? `共享失败：${m.error}` : `${tilde(m.folder)}${m.on ? `：显示在 ${ph} 的“文件”应用和文件选择器中${UI.onBle(s) ? '，通过 Wi-Fi 直连传输（在手机上点击“打开”即可连接）' : ''}` : ''}`);
      mineRow.hint.classList.toggle('bad', !!m.error);
    }

    const join = (name) => (cwd ? `${cwd}/${name}` : name);
    const ref = () => `fs${++refs}`;
    const act = (m) => UI.hubAsk({ t: 'fs.do', ref: ref(), ...m });

    function open(path) {
      cwd = path;
      asking = path;
      chosen.clear();
      confirmDelete = false;
      renaming = '';
      newRow.hidden = true;
      UI.hubAsk({ t: 'fs.list', path, hidden });
      paint();
    }

    function mkdir() {
      const name = newName.value.trim();
      if (!name || /[/\\]/.test(name)) return newName.focus();
      act({ a: 'mkdir', path: cwd, name });
      newRow.hidden = true;
    }

    function save(names) {
      if (!names.length) return;
      UI.hubAsk({ t: 'fs.save', paths: names.map(join) });
      status.textContent = `正在将 ${names.length === 1 ? names[0] : `${names.length} 项`} 保存到 ${UI.fill('{me}')} 的 ${UI.receivedName(UI.state)}…`;
      chosen.clear();
      paint();
    }

    function row(it) {
      const check = el('input', { type: 'checkbox', class: 'hub-fs-check', attrs: { 'aria-label': `选择 ${it.name}` } });
      check.checked = chosen.has(it.name);
      check.onchange = () => { if (check.checked) chosen.add(it.name); else chosen.delete(it.name); confirmDelete = false; paint(); };
      const when = it.at ? UI.clock(it.at) : '';
      const hint = it.dir ? [it.n != null ? `${it.n} 项${it.n === 1 ? '' : ''}` : '文件夹', when] : [UI.bytes(it.size || 0), when];
      let r;
      if (renaming === it.name) {
        const input = el('input', { class: 'hub-input hub-grow', type: 'text', value: it.name, attrs: { 'aria-label': '新名称', maxlength: '255' } });
        const done = (ok) => {
          const name = input.value.trim();
          renaming = '';
          if (ok && name && name !== it.name && !/[/\\]/.test(name)) { act({ a: 'rename', path: join(it.name), name }); chosen.clear(); }
          paint();
        };
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') done(true); else if (e.key === 'Escape') done(false); });
        r = UI.row('', '', [UI.button('重命名', () => done(true), 'small primary'), UI.button('取消', () => done(false), 'small')]);
        r.querySelector('.text').replaceChildren(input);
        setTimeout(() => { input.focus(); input.setSelectionRange(0, it.dir ? it.name.length : it.name.replace(/\.[^.]*$/, '').length || it.name.length); });
      } else {
        r = UI.row(it.name, hint.filter(Boolean).join(' · '), it.dir ? [el('span', { class: 'chev', text: '›' })] : [UI.button('保存', () => save([it.name]), 'small')], {
          onClick: () => (it.dir ? open(join(it.name)) : (check.checked = !check.checked, check.onchange())),
        });
      }
      if (renaming !== it.name) { r.label.textContent = it.name; delete r.label.dataset.peer; } // a name as it is, braces too
      r.classList.add('hub-fs-row');
      r.classList.toggle('chosen', chosen.has(it.name));
      r.prepend(check, UI.icon(it.dir ? 'folder' : 'doc', `hub-fs-ico${it.dir ? ' dir' : ''}`));
      return r;
    }

    function paint() {
      const parts = cwd ? cwd.split('/') : [];
      crumbs.replaceChildren(...[{ label: '存储空间', path: '' }].concat(parts.map((p, i) => ({ label: p, path: parts.slice(0, i + 1).join('/') })))
        .flatMap((c, i, all) => {
          const b = el('button', { class: 'hub-crumb', text: c.label });
          b.disabled = i === all.length - 1;
          b.onclick = () => open(c.path);
          return i ? [el('span', { class: 'hub-crumb-sep', text: '›' }), b] : [b];
        }));
      upBtn.disabled = !cwd;
      list.replaceChildren(...items.map(row));
      if (!items.length) list.append(el('div', { class: 'hub-empty', text: asking === cwd ? '正在加载…' : '此文件夹为空' }));
      selBar.hidden = !chosen.size;
      selText.textContent = `已选择 ${chosen.size} 项`;
      saveBtn.textContent = `保存到 ${UI.fill('{me}')}`;
      renameBtn.hidden = chosen.size !== 1;
      deleteBtn.textContent = confirmDelete ? `确定删除 ${chosen.size === 1 ? [...chosen][0] : `${chosen.size} 项`}？` : '删除';
      deleteBtn.classList.toggle('danger', confirmDelete);
    }

    UI.hubOn('fs.list', (m) => {
      if ((m.path || '') !== cwd) return; // an answer for a folder left since
      asking = '';
      if (m.error) {
        items = [];
        status.textContent = m.error;
      } else {
        items = (m.items || []).filter((x) => x && typeof x.name === 'string' && x.name)
          .sort((a, b) => (b.dir - a.dir) || a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
        for (const n of [...chosen]) if (!items.some((x) => x.name === n)) chosen.delete(n);
        const gb = (n) => `${(n / 1e9).toFixed(n >= 1e11 ? 0 : 1)} GB`;
        status.textContent = m.total ? `可用 ${gb(m.free || 0)} / 共 ${gb(m.total)}` : '';
      }
      paint();
    });
    UI.hubOn('fs.done', (m) => {
      if (!m.ok) status.textContent = m.error || '操作失败';
      if ((m.path || '') === cwd) UI.hubAsk({ t: 'fs.list', path: cwd, hidden });
    });

    // Files dropped on the page go into the folder that's open.
    wrap.addEventListener('dragover', (e) => {
      if (!UI.hubReady(UI.state, 'files') || !e.dataTransfer.types.includes('Files')) return;
      e.preventDefault();
      wrap.classList.add('over');
    });
    wrap.addEventListener('dragleave', (e) => { if (!wrap.contains(e.relatedTarget)) wrap.classList.remove('over'); });
    wrap.addEventListener('drop', (e) => {
      wrap.classList.remove('over');
      if (!UI.hubReady(UI.state, 'files')) return;
      e.preventDefault();
      // As an array: a FileList reaches the preload as a plain object, which can't be iterated.
      const paths = api.pathsOf ? api.pathsOf([...e.dataTransfer.files]) : [];
      if (paths.length) {
        api.hub({ do: 'upload', path: cwd, paths });
        status.textContent = `正在发送 ${paths.length === 1 ? '一个文件' : `${paths.length} 项`} 到 ${cwd || '存储空间'}…`;
      }
    });

    let loaded = false;
    UI.onShown(page, (shown) => {
      if (shown && UI.hubReady(UI.state, 'files') && !UI.onBle(UI.state) && !loaded) { loaded = true; open(cwd); }
    });
    paint();
    UI.onDeviceChange(() => { // another device: its folders, from the top
      cwd = '';
      items = [];
      chosen.clear();
      loaded = false;
      paint();
      if (!page.hidden && UI.hubReady(UI.state, 'files') && !UI.onBle(UI.state)) { loaded = true; open(cwd); }
    });

    return (s) => {
      top.render(s);
      renderShare(s);
      const ready = UI.hubReady(s, 'files') && !UI.onBle(s); // over Bluetooth: the Wi-Fi Direct note only
      wrap.hidden = !ready;
      if (!ready) { loaded = false; return; }
      uploadBtn.textContent = `从 ${UI.fill('{me}')} 上传…`;
      if (!loaded && !page.hidden) { loaded = true; open(cwd); }
    };
  },
});
