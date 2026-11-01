// TwinDesk — Copyright (C) 2026 inukaasith. GPL-3.0, see LICENSE.
// Pairing as the guest (link.js on every platform): each phase that waits on the other computer has
// a time limit, so a click never spins forever, and the reasons say what to do. Connecting: nothing
// answered at that address. Starting: it answered but never sent its half of the code. Waiting: its
// user never pressed Allow. Reading the code ('code') waits on our own user and has none. Through
// Bluetooth (an address 'ble:…') every limit is three times as long.
'use strict';

const P = require('./protocol.js');

const LIMIT_MS = { connecting: 8000, starting: 15000, waiting: 60000 };

function limitMessage(phase, name, address) {
  if (phase === 'connecting' && /^ble:/.test(String(address || ''))) return `无法通过蓝牙连接 ${name}。请确认对方已打开 TwinDesk，且设备就在附近。`;
  if (phase === 'connecting') return `无法连接 ${address} 上的 ${name}。请确认对方已打开 TwinDesk，且两台设备连接到同一 Wi-Fi。访客网络通常会隔离设备。`;
  if (phase === 'starting') return `${name} 未开始配对，请重试；若问题持续，请更新对方设备上的 TwinDesk。`;
  return `${name} 未响应。`;
}

// A version_mismatch from the host ("… speaks protocol v7"): which side to update. Null: unknown.
function versionMessage(msg, name) {
  const m = /\bv(\d+)\b/.exec(String((msg && msg.message) || ''));
  if (!m) return null;
  const theirs = Number(m[1]);
  if (theirs < P.PROTOCOL_VERSION) return `${name} 的 TwinDesk 版本较旧，请更新对方设备上的应用。`;
  if (theirs > P.PROTOCOL_VERSION) return `本机的 TwinDesk 比 ${name} 上的版本旧，请更新本机应用。`;
  return null;
}

// Arms the limit for the pairing state's phase; call update() whenever it may have changed.
// expire(message) fails the pairing.
class PairLimit {
  constructor(expire) {
    this.expire = expire;
    this.for = null; // the pairing state and phase the timer is for
    this.phase = null;
    this.timer = null;
  }

  update(ps, name, address) {
    const phase = ps && ps.phase in LIMIT_MS ? ps.phase : null;
    if (ps === this.for && phase === this.phase) return;
    clearTimeout(this.timer);
    this.for = ps;
    this.phase = phase;
    if (!phase) return;
    this.timer = setTimeout(() => {
      if (this.for === ps && ps.phase === phase) this.expire(limitMessage(phase, name, address));
    }, LIMIT_MS[phase] * (/^ble:/.test(String(address || '')) ? 3 : 1));
  }
}

module.exports = { LIMIT_MS, PairLimit, limitMessage, versionMessage };
