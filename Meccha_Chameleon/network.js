/* ============================================================
   network.js — Multijoueur Supabase Realtime (broadcast + presence)
   - Salon = channel 'chameleon:CHM-XXXX'
   - Le createur du salon fait autorite (roles, timer, inspections)
   - Les autres clients envoient leurs intentions et rendent l'etat
   Le client Supabase est charge dynamiquement depuis ../auth/supabase.js
   uniquement quand connect() est appele : le mode solo n'importe rien.
   ============================================================ */
'use strict';

(function (root) {

  const state = {
    supabase: null,
    channel: null,
    room: null,
    selfId: null,
    isHost: false,
    connected: false,
    handlers: {},
    presenceCb: null,
  };

  function genId() {
    return 'p' + Math.random().toString(36).substring(2, 10);
  }

  function selfId() {
    if (state.selfId) return state.selfId;
    let id = null;
    try { id = sessionStorage.getItem('chm_pid'); } catch (e) {}
    if (!id) {
      id = genId();
      try { sessionStorage.setItem('chm_pid', id); } catch (e) {}
    }
    state.selfId = id;
    return id;
  }

  async function loadSupabase() {
    if (state.supabase) return state.supabase;
    const mod = await import('../auth/supabase.js');
    state.supabase = mod.supabase;
    return state.supabase;
  }

  /**
   * Rejoint (ou cree) le salon `room`. Resout une fois abonne + presence tracee.
   * @param {Object} opts { room, name, isHost }
   */
  async function connect(opts) {
    const sb = await loadSupabase();
    state.room = opts.room;
    state.isHost = !!opts.isHost;
    const id = selfId();

    const ch = sb.channel('chameleon:' + opts.room, {
      config: {
        broadcast: { self: false },
        presence: { key: id },
      },
    });

    ch.on('broadcast', { event: 'game' }, (msg) => {
      const p = msg.payload || {};
      const h = state.handlers[p.t];
      if (h) h(p);
    });

    ch.on('presence', { event: 'sync' }, () => {
      if (state.presenceCb) state.presenceCb(players());
    });

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('TIMEOUT')), 10000);
      ch.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          clearTimeout(timeout);
          try {
            await ch.track({ name: opts.name, isHost: state.isHost, joinedAt: Date.now() });
          } catch (e) { /* presence best-effort */ }
          resolve();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          clearTimeout(timeout);
          reject(new Error(status));
        }
      });
    });

    state.channel = ch;
    state.connected = true;
  }

  /** Liste des joueurs presents : [{ id, name, isHost, joinedAt }] tries par arrivee. */
  function players() {
    if (!state.channel) return [];
    const ps = state.channel.presenceState();
    const list = Object.keys(ps).map((id) => {
      const meta = (ps[id] && ps[id][0]) || {};
      return { id, name: meta.name || '???', isHost: !!meta.isHost, joinedAt: meta.joinedAt || 0 };
    });
    list.sort((a, b) => a.joinedAt - b.joinedAt);
    return list;
  }

  /** Diffuse un message de jeu a tous les autres clients du salon. */
  function send(type, data) {
    if (!state.channel || !state.connected) return;
    const payload = Object.assign({ t: type, from: selfId() }, data || {});
    state.channel.send({ type: 'broadcast', event: 'game', payload });
  }

  function on(type, fn)   { state.handlers[type] = fn; }
  function onPresence(fn) { state.presenceCb = fn; }

  function leave() {
    if (state.channel && state.supabase) {
      try { state.supabase.removeChannel(state.channel); } catch (e) {}
    }
    state.channel = null;
    state.connected = false;
  }

  root.ChameleonNet = {
    connect, send, on, onPresence, players, leave,
    get selfId()    { return selfId(); },
    get isHost()    { return state.isHost; },
    get connected() { return state.connected; },
    get room()      { return state.room; },
  };

})(typeof window !== 'undefined' ? window : globalThis);
