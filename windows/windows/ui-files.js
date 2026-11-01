// TwinDesk — Copyright (C) 2026 inukaasith. GPL-3.0, see LICENSE.
// Files tab: Send files (drop zone + Choose…) and copy/paste files with shortcuts,
// then two direction cards — files and the Mac's folder coming here, files and
// this PC's folder going to the Mac — then transfers. Drags across the edge,
// Monitor 2 drops, network drives in one switch each.
'use strict';

UI.tab({
  id: 'files',
  order: 50,
  title: '文件',
  color: 'linear-gradient(#64d2ff, #0a84ff)',
  desc: '在计算机之间拖放文件，或共享文件夹。',
  badge: (s) => (s.files.dropToMac || s.files.acceptFromMac ? 'on' : ''),
  build(body) {
    const { el, api } = UI;
    const sw = (label, set) => UI.switch(set, { label });
    const mount = sw('在本机访问 {Name} 的文件夹', (v) => api.setFiles({ mountMac: v }));
    const openBtn = UI.button('打开', () => api.openMacDrive(), 'small');
    const macDrive = UI.row('打开 {name} 的共享文件夹', '', [openBtn, mount]);
    const share = sw('在 {name} 上访问 {me} 的文件夹', (v) => api.setShareOn(v));
    const chooseBtn = UI.button('选择…', () => api.chooseShareFolder(), 'small');
    const sharePill = el('span', { class: 'pill' });
    const pcShare = UI.row('向 {name} 共享文件夹', '', [sharePill, chooseBtn, share]);
    const pair = UI.dirCards(
      { on: { get: (s) => s.files.acceptFromMac, set: (v) => api.setFiles({ acceptFromMac: v }) }, label: '在 {me} 上接收 {name} 的文件', rows: [
        macDrive,
      ] },
      { on: { get: (s) => s.files.dropToMac, set: (v) => api.setFiles({ dropToMac: v }) }, label: '从 {me} 向 {name} 发送文件', rows: [
        pcShare,
      ] },
    );
    // Send files: drop zone + Choose…
    const zoneText = el('div', { class: 'big', text: '将文件或文件夹拖放到此处' });
    const zoneHint = el('div', { class: 'hint', text: '' });
    const zone = el('div', { class: 'dropzone' }, [el('div', {}, [zoneText, zoneHint])]);
    const sendBtn = UI.button('选择…', () => api.chooseSendFiles(), 'small');
    const sendRow = UI.row('发送文件', '', [sendBtn]);
    const sendBar = el('div', { class: 'bar' }, [el('span')]);
    sendBar.hidden = true;
    sendRow.querySelector('.text').append(sendBar);
    let canSend = false;
    zone.ondragover = (e) => { e.preventDefault(); if (canSend) zone.classList.add('over'); };
    zone.ondragleave = () => zone.classList.remove('over');
    zone.ondrop = (e) => {
      e.preventDefault();
      zone.classList.remove('over');
      // As an array: a FileList reaches the preload as a plain object, which can't be iterated.
      if (canSend) api.sendFiles(api.pathsOf([...e.dataTransfer.files]));
    };
    // Dropping anywhere else in the window must not open the file.
    window.addEventListener('dragover', (e) => e.preventDefault());
    window.addEventListener('drop', (e) => e.preventDefault());

    // Copy and paste files with shortcuts
    const keysSw = sw('使用快捷键复制和粘贴文件', (v) => api.setFiles({ shortcuts: v }));
    const copyRec = UI.keyRecorder((v) => api.setFiles({ copyKeys: v }));
    const pasteRec = UI.keyRecorder((v) => api.setFiles({ pasteKeys: v }));
    const keysRow = UI.row('复制和粘贴文件', '', [keysSw]);
    const copyRow = UI.row('复制', '先在文件资源管理器中选择文件', [copyRec]);
    const pasteRow = UI.row('粘贴', '', [pasteRec]);

    const edgeDrag = sw('跨越屏幕边缘拖放文件', (v) => api.setFiles({ edgeDrag: v }));
    const edgeRow = UI.row('在计算机之间拖放文件', '', [edgeDrag]);
    const cancelBtn = UI.button('取消', () => api.cancelDrop(), 'small');
    const outRow = UI.row('', '', [cancelBtn]);
    const inRow = UI.row('', '');
    body.append(
      UI.card('', [sendRow, zone], { cls: 'keep-on' }),
      UI.card('', [keysRow, copyRow, pasteRow], { cls: 'keep-on' }),
      pair.el,
      UI.card('', [edgeRow]),
      UI.card('最近记录', [outRow, inRow]),
    );
    const mb = (n) => (n / 1048576).toFixed(1) + ' MB';
    return (s) => {
      const f = s.files;
      const m = f.smb;
      const p = UI.peer(s);
      pair.update(s);
      // Send files
      canSend = s.link.state === 'connected';
      zone.classList.toggle('off', !canSend);
      zoneText.textContent = canSend ? '将文件或文件夹拖放到此处' : '连接后即可发送文件';
      zoneHint.textContent = !canSend ? '' : p.phone ? '文件将保存到 ' + p.the + ' 的下载文件夹'
        : '文件将保存到 ' + p.the + ' 的下载文件夹或其指定的接收文件夹';
      sendBtn.disabled = !canSend;
      const b = f.batch;
      sendBar.hidden = !b;
      if (b) sendBar.firstChild.style.width = Math.floor((100 * b.sent) / Math.max(1, b.bytes)) + '%';
      sendRow.setHint(b ? (b.kind === 'paste' ? '正在粘贴 ' : '正在发送 ') + b.name + ' 到 ' + p.the + (b.files > 1 ? ' · ' + (b.index + 1) + ' / ' + b.files : '') : canSend ? '发往 ' + p.the : '');
      // Shortcuts
      const ck = f.clip;
      keysSw.set(f.shortcuts);
      copyRec.set(f.copyKeys);
      pasteRec.set(f.pasteKeys);
      keysRow.setHint(ck.error || '选择文件后按 ' + UI.keysLabel(f.copyKeys) + '，然后在 ' + p.the + ' 上按 ' + UI.keysLabel(f.pasteKeys));
      keysRow.hint.classList.toggle('bad', !!ck.error);
      copyRow.hidden = pasteRow.hidden = !f.shortcuts;
      pasteRow.setHint(ck.pasting ? '正在粘贴…'
        : ck.incoming ? p.them + ' 已复制 ' + (ck.incoming.name || ck.incoming.items + ' 项') + ' · 请按 ' + UI.keysLabel(f.pasteKeys)
          : '粘贴到当前应用（聊天、邮件等）或文件资源管理器中打开的文件夹，否则保存到桌面');
      edgeDrag.set(f.edgeDrag);
      edgeRow.setHint(f.edgeDrag && f.macDrags === false ? '{name} 上已关闭' : f.edgeDrag ? '将文件拖过屏幕边缘，在任意位置松开' : '');
      mount.set(f.mountMac);
      openBtn.hidden = !m.drive && !m.wifi;
      macDrive.setHint(m.mountMessage || (!f.mountMac ? '' : m.drive ? '驱动器 ' + m.drive : m.busy === 'mount' ? '正在连接…'
        : m.wifi ? '当前使用蓝牙：点击“打开”后将通过 Wi-Fi Direct 连接' : '正在等待 {name} 共享文件夹'));
      share.set(f.shareOn);
      const busy = m.busy === 'setup' ? '正在设置…' : m.busy === 'remove' ? '正在移除…' : '';
      sharePill.hidden = !f.shareOn && !busy;
      sharePill.textContent = busy || (m.peer && m.peer.mounted ? '已在 {name} 上挂载' : m.peer && m.peer.error ? '出现问题' : '已共享');
      sharePill.className = 'pill ' + (busy ? 'muted' : m.peer && m.peer.mounted ? 'good' : m.peer && m.peer.error ? 'bad' : 'muted');
      chooseBtn.disabled = !!m.busy;
      pcShare.setHint(m.message || (m.peer && m.peer.error) || m.folder);

      cancelBtn.hidden = !f.current;
      if (f.current) {
        const c = f.current;
        outRow.label.textContent = '正在发送 ' + c.name + (c.count > 1 ? ' (' + (c.index + 1) + ' / ' + c.count + ')' : '');
        outRow.setHint(mb(c.sent) + ' / ' + mb(c.size) + (f.queued ? ' · ' + f.queued + ' 项正在等待' : ''));
      } else {
        outRow.label.textContent = f.last ? (f.last.ok ? '已发送 ' : '未发送：') + (f.last.name || '') : '尚未发送文件';
        outRow.setHint(f.last ? f.last.text + ' · ' + UI.ago(f.last.at) : '');
      }
      const inc = f.incoming;
      const dr = f.drag;
      if (dr.state) {
        inRow.label.textContent = (dr.state === 'copying' ? '正在复制 ' : '正在拖动 ') + dr.name;
        inRow.setHint(dr.state === 'copying' ? '' : '按 Esc 取消');
        return;
      }
      if (dr.last && (!inc.last || dr.last.at > inc.last.at)) {
        inRow.label.textContent = dr.last.ok ? '已从 {name} 接收' : '未接收';
        inRow.setHint(dr.last.text + ' · ' + UI.ago(dr.last.at));
        return;
      }
      inRow.label.textContent = inc.receiving ? '正在接收 ' + inc.receiving + ' 个文件' + (inc.receiving > 1 ? '' : '') + '（来自 {name}）'
        : inc.last ? (inc.last.ok ? '已接收 ' : '未接收：') + inc.last.name : '尚未接收文件';
      inRow.setHint(inc.receiving ? '' : inc.last ? inc.last.text + ' · ' + UI.ago(inc.last.at) : '');
    };
  },
});
