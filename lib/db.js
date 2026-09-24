/**
 * Database layer.
 * - Supabase (Postgres) when SUPABASE_URL + a service-role/secret key are set
 *   (added automatically when Supabase is connected to the Vercel project).
 * - In-memory for local development and tests.
 * Tables are created by supabase/schema.sql.
 */

class DbError extends Error {
  constructor(msg) { super(msg); this.userFacing = true; }
}

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

/* ============================================================
   SUPABASE
   ============================================================ */

function supabaseDb() {
  const { createClient } = require('@supabase/supabase-js');
  const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  const check = (res, what) => {
    if (!res.error) return res.data;
    const e = res.error;
    const missingTable = e.code === '42P01' || e.code === 'PGRST205' || e.code === 'PGRST202' ||
      /could not find the (table|function)|does not exist/i.test(e.message || '');
    if (missingTable) {
      throw new DbError('Database tables are not set up yet. In Supabase open SQL Editor, paste supabase/schema.sql and click Run.');
    }
    throw new Error('Database error (' + what + '): ' + (e.message || e.code));
  };

  return {
    kind: 'supabase',

    /* key / value */
    async kvGet(k) {
      const d = check(await sb.from('tp_kv').select('value').eq('key', k).maybeSingle(), 'kvGet');
      return d ? d.value : null;
    },
    async kvSet(k, v) {
      check(await sb.from('tp_kv').upsert({ key: k, value: String(v), updated_at: new Date().toISOString() }), 'kvSet');
    },
    async kvSetIfAbsent(k, v) {
      const res = await sb.from('tp_kv').insert({ key: k, value: String(v) });
      if (res.error && res.error.code === '23505') return false;
      check(res, 'kvSetIfAbsent');
      return true;
    },
    async kvDel(k) { check(await sb.from('tp_kv').delete().eq('key', k), 'kvDel'); },

    /* counters */
    async counterGet(k) {
      const d = check(await sb.from('tp_counters').select('count, expires_at').eq('key', k).maybeSingle(), 'counterGet');
      return d && new Date(d.expires_at) > new Date() ? d.count : 0;
    },
    async counterIncr(k, ttlSec) {
      return check(await sb.rpc('tp_incr', { p_key: k, p_ttl: ttlSec }), 'counterIncr');
    },
    async counterDel(keys) {
      if (keys.length) check(await sb.from('tp_counters').delete().in('key', keys), 'counterDel');
    },

    /* responses */
    async getResponses() {
      const rows = check(await sb.from('tp_responses').select('name, home_city, data, updated_at'), 'getResponses');
      const out = {};
      rows.forEach((r) => { out[r.name] = { updatedAt: r.updated_at, homeCity: r.home_city || '', data: r.data }; });
      return out;
    },
    async upsertResponses(list) {
      if (!list.length) return;
      check(await sb.from('tp_responses').upsert(list.map((r) => ({
        name: r.name, home_city: r.homeCity, data: r.data, updated_at: r.updatedAt
      }))), 'upsertResponses');
    },
    async deleteResponses(names) {
      if (names.length) check(await sb.from('tp_responses').delete().in('name', names), 'deleteResponses');
    },

    /* PINs */
    async getPinNames() {
      return check(await sb.from('tp_pins').select('name'), 'getPinNames').map((r) => r.name);
    },
    async getPin(name) {
      const d = check(await sb.from('tp_pins').select('hash').eq('name', name).maybeSingle(), 'getPin');
      return d ? d.hash : null;
    },
    async insertPinIfAbsent(name, hash) {
      const res = await sb.from('tp_pins').insert({ name: name, hash: hash });
      if (res.error && res.error.code === '23505') return false;
      check(res, 'insertPin');
      return true;
    },
    async deletePins(names) {
      if (names.length) check(await sb.from('tp_pins').delete().in('name', names), 'deletePins');
    },
    async deleteAllPins() { check(await sb.from('tp_pins').delete().neq('name', ''), 'deleteAllPins'); },

    /* votes */
    async getVotes() {
      return check(await sb.from('tp_votes').select('name, option_key, answer, at'), 'getVotes');
    },
    async upsertVotes(rows) {
      if (rows.length) check(await sb.from('tp_votes').upsert(rows, { onConflict: 'name,option_key' }), 'upsertVotes');
    },
    async deleteAllVotes() { check(await sb.from('tp_votes').delete().neq('name', ''), 'deleteAllVotes'); },

    /* voting round */
    async getVoting() {
      const d = check(await sb.from('tp_voting').select('*').eq('id', 1).maybeSingle(), 'getVoting');
      return {
        shortlist: d && d.shortlist ? d.shortlist : null,
        frozenAt: (d && d.frozen_at) || '',
        mode: (d && d.mode) || '',
        decision: (d && d.decision) || '',
        decidedAt: (d && d.decided_at) || ''
      };
    },
    async setVoting(p) {
      const row = { id: 1 };
      if ('shortlist' in p) row.shortlist = p.shortlist;
      if ('frozenAt' in p) row.frozen_at = p.frozenAt;
      if ('mode' in p) row.mode = p.mode;
      if ('decision' in p) row.decision = p.decision;
      if ('decidedAt' in p) row.decided_at = p.decidedAt;
      check(await sb.from('tp_voting').upsert(row), 'setVoting');
    }
  };
}

/* ============================================================
   IN-MEMORY (local dev + tests)
   ============================================================ */

function memoryDb() {
  const g = globalThis;
  if (!g.__tpDb) {
    g.__tpDb = { kv: {}, counters: {}, responses: {}, pins: {}, votes: {}, voting: { shortlist: null, frozenAt: '', mode: '', decision: '', decidedAt: '' } };
  }
  const m = g.__tpDb;
  const clone = (x) => JSON.parse(JSON.stringify(x));
  return {
    kind: 'memory',
    async kvGet(k) { return k in m.kv ? m.kv[k] : null; },
    async kvSet(k, v) { m.kv[k] = String(v); },
    async kvSetIfAbsent(k, v) { if (k in m.kv) return false; m.kv[k] = String(v); return true; },
    async kvDel(k) { delete m.kv[k]; },

    async counterGet(k) { const c = m.counters[k]; return c && c.exp > Date.now() ? c.count : 0; },
    async counterIncr(k, ttl) {
      const c = m.counters[k];
      if (!c || c.exp < Date.now()) m.counters[k] = { count: 1, exp: Date.now() + ttl * 1000 };
      else c.count++;
      return m.counters[k].count;
    },
    async counterDel(keys) { keys.forEach((k) => { delete m.counters[k]; }); },

    async getResponses() { return clone(m.responses); },
    async upsertResponses(list) {
      list.forEach((r) => { m.responses[r.name] = clone({ updatedAt: r.updatedAt, homeCity: r.homeCity, data: r.data }); });
    },
    async deleteResponses(names) { names.forEach((n) => { delete m.responses[n]; }); },

    async getPinNames() { return Object.keys(m.pins); },
    async getPin(name) { return m.pins[name] || null; },
    async insertPinIfAbsent(name, hash) { if (m.pins[name]) return false; m.pins[name] = hash; return true; },
    async deletePins(names) { names.forEach((n) => { delete m.pins[n]; }); },
    async deleteAllPins() { m.pins = {}; },

    async getVotes() { return Object.values(m.votes).map(clone); },
    async upsertVotes(rows) { rows.forEach((r) => { m.votes[r.name + '\u0001' + r.option_key] = clone(r); }); },
    async deleteAllVotes() { m.votes = {}; },

    async getVoting() { return clone(m.voting); },
    async setVoting(p) { Object.keys(p).forEach((k) => { m.voting[k] = clone(p[k]); }); }
  };
}

/* ============================================================
   PICK ONE
   ============================================================ */

let db;
if (url && key) {
  db = supabaseDb();
} else if (process.env.VERCEL) {
  const fail = async () => {
    throw new DbError('Database not connected. In Vercel: open the project → Storage → connect a Supabase database to this project, then redeploy.');
  };
  db = new Proxy({}, { get: (t, p) => (p === 'kind' ? 'missing' : fail) });
} else {
  db = memoryDb();
}

module.exports = { db };
