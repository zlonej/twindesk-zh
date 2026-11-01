// TwinDesk — Copyright (C) 2026 inukaasith, Erdoğan Yeşil. GPL-3.0, see LICENSE.
// Multi-device tab with it on (docs/multi-device.md): what only several devices need, in one place.
// Turn off (TwinDesk restarts one to one), where the devices sit (the shared layout's grid, docs/mesh.md
// "Shared layout"), and Join every device automatically (docs/mesh.md "Joining everyone").
'use strict';

UI.tab({
  id: 'multi',
  order: 95,
  title: "多设备",
  heading: "多设备 · 网状模式",
  tag: "测试版",
  color: 'linear-gradient(#5e5ce6, #3634a3)',
  desc: "同时连接多台电脑和手机",
  bottom: true,
  build(body) {
    const { api } = UI;
    const turnOff = UI.button("关闭", () => {
      turnOff.disabled = true;
      turnOff.textContent = "正在重启…";
      api.setMulti(false);
    }, 'small');

    // ---- the layout: a grid of tiles ----
    // Every paired device is a tile; its edges lead to the nearest tile on its row or column. Click a tile
    // and then an empty place to move it there, or then another tile to swap the two. Each change goes
    // through setLayoutCell, so every computer shows the same grid.
    // Tiles sit side by side, with no empty space between them: a tile goes only next to another one by a
    // side (not a corner), the places it may go are lit (layout.targets), and the rest close up behind it.
    let picked = null; // the device id picked, waiting for a place or another tile
    let last = null; // the last state, to draw the grid again
    const layoutHint = UI.note('info', '');
    const reachNote = UI.note('warn', ''); // the devices the pointer can't get to from here, and why
    const gridEl = UI.el('div', { class: 'layout-grid' });

    const cellOf = (id) => (last && last.layout && last.layout.cells[id]) || null;

    // An empty place the picked tile may go to: next to another tile by a side (layout.targets, from
    // shared/layout.js). A tile on its own may go anywhere.
    function canGo(id, x, y) {
      const lay = last && last.layout;
      const t = lay && lay.targets && lay.targets[id];
      if (!Array.isArray(t) || Object.keys(lay.cells).length < 2) return true;
      return t.includes(x + ',' + y);
    }

    function move(id, x, y) {
      api.setLayoutCell(id, x, y).then((ok) => {
        if (ok === false) layoutHint.set("无法移动：设备必须紧邻另一台设备摆放。");
      });
    }

    function pick(id) {
      picked = id;
      if (last) drawLayout(last);
    }

    // A tile was clicked: it is picked; a picked tile clicked again is put down; with a tile already picked,
    // the two swap places.
    function onTile(id) {
      if (picked === id) return pick(null);
      if (!picked) return pick(id);
      const from = picked;
      const to = cellOf(id);
      pick(null);
      if (to) move(from, to.x, to.y);
    }

    // An empty place was clicked: the picked device moves there.
    function onPlace(x, y) {
      if (!picked || !canGo(picked, x, y)) return;
      const id = picked;
      pick(null);
      move(id, x, y);
    }

    // reach (L.reach, from layout-sync): 'blocked', the pointer stops before it, shown red when the device
    // is in the mesh but not connected to this PC (one that is off is just off); 'behind', only past such a
    // device, greyed: the mouse and keyboard here get to neither (docs/mesh.md, "Chains").
    function tile(id, info, reach) {
      const red = reach === 'blocked' && info.via;
      const state = info.self ? "本电脑" : red ? "未与本机配对" : reach === 'behind' ? "无法到达"
        : info.connected ? "已连接" : "未连接";
      const why = red ? "：未连接到本电脑，指针无法进入该设备"
        : reach === 'behind' ? "：要到达这里，指针必须经过当前无法到达的设备" : '';
      return UI.el('button', {
        class: 'lay-tile' + (info.self ? ' here' : '') + (info.connected || info.self || red ? '' : ' off') + (red ? ' blocked' : '')
          + (reach === 'behind' ? ' behind' : '') + (picked === id ? ' picked' : ''),
        attrs: { type: 'button', title: info.name + ' — ' + state + why },
        onclick: () => onTile(id),
      }, [
        UI.osIcon(info.os),
        UI.el('span', { class: 'lay-name', text: info.name }),
        UI.el('span', { class: 'lay-state', text: state }),
      ]);
    }

    function place(x, y) {
      const ok = !!picked && canGo(picked, x, y);
      return UI.el('button', {
        class: 'lay-place' + (ok ? ' target' : ''),
        disabled: !!picked && !ok,
        attrs: { type: 'button', 'aria-label': ok ? "移动到此处" : "空白位置" },
        onclick: () => onPlace(x, y),
      });
    }

    function drawLayout(s) {
      const lay = s && s.layout;
      if (!lay || !lay.grid || !s.device) return;
      if (picked && !lay.cells[picked]) picked = null; // a device that is gone cannot be moved
      const people = new Map([[s.device.id, { name: s.device.name || "本电脑", os: 'win', connected: true, self: true }]]);
      for (const d of s.peers || []) {
        if (d && d.id) people.set(d.id, { name: d.name || d.id.slice(0, 8), os: d.os, connected: !!d.connected, self: false, via: d.state === 'via' });
      }
      const at = new Map();
      for (const id of Object.keys(lay.cells)) at.set(lay.cells[id].x + ',' + lay.cells[id].y, id);
      const g = lay.grid;
      gridEl.style.gridTemplateColumns = `repeat(${g.maxX - g.minX + 1}, minmax(96px, 1fr))`;
      const cells = [];
      for (let y = g.minY; y <= g.maxY; y++) {
        for (let x = g.minX; x <= g.maxX; x++) {
          const id = at.get(x + ',' + y);
          cells.push(id ? tile(id, people.get(id) || { name: id.slice(0, 8), os: '', connected: false, self: false }, lay.reach && lay.reach[id]) : place(x, y));
        }
      }
      gridEl.replaceChildren(...cells);
      const reach = lay.reach || {};
      const red = Object.keys(reach).filter((id) => reach[id] === 'blocked' && (people.get(id) || {}).via);
      const them = red.length > 1 ? "这些设备" : "该设备";
      reachNote.set(red.length ? red.map((id) => people.get(id).name).join(', ') + (red.length > 1 ? " 尚未" : " 尚未")
        + "连接到本电脑，因此鼠标指针无法进入" + them
        + (Object.values(reach).includes('behind') ? "，也无法到达其后方的设备：" + them : '')
        + "。请将" + them + "与本电脑配对" + ((s.mesh || {}).autoJoin === true ? '' : "，或开启“自动加入所有设备”") + '.' : '');
      layoutHint.set(picked
        ? "现在点击另一台设备旁的高亮空位即可移动；点击另一台设备则交换位置。"
        : "先点击一台设备，再点击另一台设备旁的空位以移动，或点击另一台设备以交换位置。设备必须紧邻摆放，中间不能留空。");
    }

    const joinSw = UI.switch((v) => api.setMesh({ autoJoin: v }), { label: "自动加入所有设备" });
    const joinRow = UI.row("自动加入所有设备", '', [joinSw]);

    body.append(
      UI.card("网状模式", [
        UI.row("同时使用多台设备", "已开启，功能处于测试阶段。开启或关闭时 TwinDesk 会重启", [turnOff]),
      ]),
      UI.card("布局", [gridEl, reachNote, layoutHint], { cls: 'keep-on' }),
      UI.card("自动加入", [joinRow]),
    );

    return (s) => {
      last = s;
      drawLayout(s);
      const jn = (s.mesh || {}).autoJoin === true;
      joinSw.set(jn);
      joinRow.setHint(jn ? "与一台设备配对后，其余设备会自动连接到本机。已配对设备可引入其他设备，无需配对码"
        : "关闭后：本机不会向其他设备引入新设备，也不会接受引入。请逐台手动配对");
    };
  },
});
