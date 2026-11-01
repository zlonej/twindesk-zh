// TwinDesk — Copyright (C) 2026 inukaasith. GPL-3.0, see LICENSE.
// Quotio/Sparkle-style in-app updater notification:
// Presents a rich update modal with release notes, version comparison, asset details,
// "Skip this version", "Remind me later", and "Download & Install" actions.
// Also provides a sleek in-app banner at the top of content.
(function () {
  'use strict';

  let overlay = null;
  let banner = null;
  let lastUpdates = null;
  let dismissedPromptFor = '';
  let bannerDismissedFor = '';

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatBytes(bytes) {
    if (!bytes || bytes <= 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  }

  function formatDate(isoStr) {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (_) {
      return '';
    }
  }

  function parseMarkdownNotes(raw) {
    if (!raw || typeof raw !== 'string' || !raw.trim()) {
      return '<p class="updater-empty-notes">此版本未提供更新说明。</p>';
    }

    const lines = raw.split(/\r?\n/);
    const html = [];
    let inList = false;

    const closeList = () => {
      if (inList) {
        html.push('</ul>');
        inList = false;
      }
    };

    const formatInline = (text) => {
      let s = escapeHtml(text);
      s = s.replace(/`([^`]+)`/g, '<code class="mono">$1</code>');
      s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
      s = s.replace(/(^|[\s(])#(\d+)([\s),.]|$)/g, '$1<span class="updater-issue">#$2</span>$3');
      s = s.replace(/(^|[\s(])@([a-zA-Z0-9_-]+)([\s),.]|$)/g, '$1<span class="updater-mention">@$2</span>$3');
      // Links stay text: this window doesn't open new windows, so a click would open a bare one
      s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '$1 ($2)');
      return s;
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) {
        closeList();
        continue;
      }

      const hMatch = line.match(/^(#{1,4})\s+(.+)$/);
      if (hMatch) {
        closeList();
        const level = Math.min(hMatch[1].length + 2, 5);
        html.push(`<h${level} class="updater-heading">${formatInline(hMatch[2])}</h${level}>`);
        continue;
      }

      const liMatch = line.match(/^[-*]\s+(.+)$/);
      if (liMatch) {
        if (!inList) {
          html.push('<ul class="updater-list">');
          inList = true;
        }
        html.push(`<li>${formatInline(liMatch[1])}</li>`);
        continue;
      }

      closeList();
      html.push(`<p class="updater-p">${formatInline(line)}</p>`);
    }

    closeList();
    return html.join('\n');
  }

  function createElements() {
    if (overlay) return;

    // --- Modal Overlay ---
    overlay = document.createElement('div');
    overlay.className = 'updater-overlay';
    overlay.hidden = true;
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', '软件更新');

    const modal = document.createElement('div');
    modal.className = 'updater-pop';

    // Head
    const head = document.createElement('div');
    head.className = 'updater-head';

    const icon = document.createElement('div');
    icon.className = 'updater-icon';
    icon.setAttribute('role', 'img');
    icon.setAttribute('aria-label', 'TwinDesk 图标');

    const titleBox = document.createElement('div');
    titleBox.className = 'updater-title-box';

    const title = document.createElement('h2');
    title.className = 'updater-title';
    title.textContent = 'TwinDesk 有新版本可用！';

    const subtitle = document.createElement('p');
    subtitle.className = 'updater-subtitle';

    const badges = document.createElement('div');
    badges.className = 'updater-badges';

    const pillNew = document.createElement('span');
    pillNew.className = 'updater-pill';

    const pillDate = document.createElement('span');
    pillDate.className = 'updater-pill-subtle';

    const pillCur = document.createElement('span');
    pillCur.className = 'updater-pill-current';

    badges.append(pillNew, pillCur, pillDate);
    titleBox.append(title, subtitle, badges);
    head.append(icon, titleBox);

    // Asset Info Bar
    const assetBar = document.createElement('div');
    assetBar.className = 'updater-asset';
    const assetName = document.createElement('span');
    assetName.className = 'updater-asset-name';
    const assetSize = document.createElement('span');
    assetSize.className = 'updater-asset-size';
    assetBar.append(assetName, assetSize);

    // Release Notes
    const notesWrap = document.createElement('div');
    notesWrap.className = 'updater-notes-wrap';
    const notesLabel = document.createElement('div');
    notesLabel.className = 'updater-notes-label';
    notesLabel.textContent = '更新说明';
    const notesBox = document.createElement('div');
    notesBox.className = 'updater-notes selectable';
    notesWrap.append(notesLabel, notesBox);

    // Actions Footer
    const actions = document.createElement('div');
    actions.className = 'updater-actions';

    const leftActions = document.createElement('div');
    leftActions.className = 'updater-actions-left';

    const skipBtn = document.createElement('button');
    skipBtn.className = 'btn updater-btn-skip';
    skipBtn.textContent = '跳过此版本';

    const linkBtn = document.createElement('button');
    linkBtn.className = 'btn updater-btn-link';
    linkBtn.textContent = '在 GitHub 查看 ↗';

    leftActions.append(skipBtn, linkBtn);

    const rightActions = document.createElement('div');
    rightActions.className = 'updater-actions-right';

    const laterBtn = document.createElement('button');
    laterBtn.className = 'btn updater-btn-later';
    laterBtn.textContent = '稍后提醒';

    const updateBtn = document.createElement('button');
    updateBtn.className = 'btn primary updater-btn-update';
    updateBtn.textContent = '立即更新';

    rightActions.append(laterBtn, updateBtn);
    actions.append(leftActions, rightActions);

    modal.append(head, assetBar, notesWrap, actions);
    overlay.append(modal);
    document.body.append(overlay);

    // Event Listeners
    laterBtn.onclick = () => hide();
    skipBtn.onclick = () => {
      const u = lastUpdates;
      if (u && u.latest && window.macshare && window.macshare.skipUpdate) {
        window.macshare.skipUpdate(u.latest);
      }
      hide();
      if (banner) banner.hidden = true;
    };
    linkBtn.onclick = () => {
      const u = lastUpdates;
      const url = (u && u.releaseUrl) || 'https://github.com/InukaAsith/TwinDesk/releases';
      if (window.macshare && window.macshare.openLink) {
        window.macshare.openLink('releases');
      } else {
        window.open(url, '_blank');
      }
    };
    updateBtn.onclick = () => {
      if (window.macshare && window.macshare.openUpdate) {
        window.macshare.openUpdate();
      }
      hide();
    };

    overlay.onclick = (e) => {
      if (e.target === overlay) hide();
    };

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !overlay.hidden) {
        e.preventDefault();
        hide();
      }
    });

    // Save references on overlay for easy populating
    overlay._refs = {
      title,
      subtitle,
      pillNew,
      pillCur,
      pillDate,
      assetBar,
      assetName,
      assetSize,
      notesBox,
      updateBtn,
    };

    // --- Top In-App Banner ---
    createBanner();
  }

  function createBanner() {
    if (banner) return;
    const content = document.getElementById('content');
    if (!content) return;

    banner = document.createElement('section');
    banner.className = 'updater-banner';
    banner.hidden = true;
    banner.setAttribute('role', 'region');
    banner.setAttribute('aria-label', '软件更新通知');

    const text = document.createElement('div');
    text.className = 'updater-banner-text';

    const spark = document.createElement('span');
    spark.className = 'updater-banner-spark';
    spark.textContent = '✨';

    const lead = document.createElement('span');
    lead.className = 'updater-banner-lead';

    const sub = document.createElement('span');
    sub.className = 'updater-banner-sub';

    text.append(spark, lead, sub);

    const bannerActions = document.createElement('div');
    bannerActions.className = 'updater-banner-actions';

    const viewBtn = document.createElement('button');
    viewBtn.className = 'btn small';
    viewBtn.textContent = '更新说明';
    viewBtn.onclick = () => show();

    const getBtn = document.createElement('button');
    getBtn.className = 'btn small primary';
    getBtn.textContent = '下载';
    getBtn.onclick = () => {
      if (window.macshare && window.macshare.openUpdate) {
        window.macshare.openUpdate();
      }
    };

    const closeBtn = document.createElement('button');
    closeBtn.className = 'updater-banner-close';
    closeBtn.textContent = '✕';
    closeBtn.title = '关闭通知栏';
    closeBtn.setAttribute('aria-label', '关闭通知栏');
    closeBtn.onclick = () => {
      banner.hidden = true;
      if (lastUpdates && lastUpdates.latest) {
        bannerDismissedFor = lastUpdates.latest;
      }
    };

    bannerActions.append(viewBtn, getBtn, closeBtn);
    banner.append(text, bannerActions);

    banner._refs = { lead, sub, getBtn };

    const firstChild = content.firstElementChild;
    content.insertBefore(banner, firstChild);
  }

  function show(updatesState) {
    createElements();
    const u = updatesState || lastUpdates;
    if (!u) return;

    const {
      title, subtitle, pillNew, pillCur, pillDate,
      assetBar, assetName, assetSize, notesBox, updateBtn,
    } = overlay._refs;

    const latest = u.latest ? `v${u.latest}` : '新版本';
    const current = u.current ? `v${u.current}` : '';

    title.textContent = `TwinDesk ${u.latest || ''} 已发布`;
    subtitle.textContent = `TwinDesk 新版本已可下载并安装${current ? `（当前版本：${current}）` : ''}。`;

    pillNew.textContent = latest;
    pillCur.textContent = current ? `当前：${current}` : '';
    pillCur.hidden = !current;

    const dateStr = formatDate(u.publishedAt);
    pillDate.textContent = dateStr ? `发布于：${dateStr}` : '';
    pillDate.hidden = !dateStr;

    // Asset
    if (u.download && u.download.name) {
      assetBar.hidden = false;
      assetName.innerHTML = `📦 <span>${escapeHtml(u.download.name)}</span>`;
      assetSize.textContent = formatBytes(u.download.size);
      updateBtn.textContent = '下载并安装';
    } else {
      assetBar.hidden = true;
      updateBtn.textContent = '立即更新';
    }

    // Release Notes
    notesBox.innerHTML = parseMarkdownNotes(u.releaseNotes);

    overlay.hidden = false;
    updateBtn.focus();
  }

  function hide() {
    if (overlay) overlay.hidden = true;
  }

  function syncState(state) {
    if (!state || !state.updates) return;
    const u = state.updates;
    lastUpdates = u;

    createElements();

    // Check banner visibility
    if (banner && banner._refs) {
      const showBanner = u.available && !u.skipped && bannerDismissedFor !== u.latest;
      banner.hidden = !showBanner;
      if (showBanner) {
        banner._refs.lead.textContent = `TwinDesk ${u.latest} 已发布。`;
        banner._refs.sub.textContent = u.current ? `（当前：v${u.current}）` : '';
        banner._refs.getBtn.textContent = u.download ? '下载' : '更新';
      }
    }

    // Auto-prompt modal if newly available and not dismissed yet
    if (u.available && !u.skipped && u.promptUpdate && dismissedPromptFor !== u.latest) {
      dismissedPromptFor = u.latest;
      show(u);
    }
  }

  // Listen to IPC event 'show-update'
  if (window.macshare && window.macshare.onShowUpdate) {
    window.macshare.onShowUpdate(() => {
      show();
    });
  }

  window.addEventListener('macshare-show-update', () => show());

  // Hook state changes
  if (window.macshare && window.macshare.onState) {
    window.macshare.onState((s) => syncState(s));
  }

  // Public API
  window.UpdaterModal = {
    show,
    hide,
    sync: syncState,
  };

  // Ensure DOM is ready before creating banner/modal
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createElements);
  } else {
    createElements();
  }
})();
