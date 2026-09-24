/**
 * Single API endpoint: POST /api/rpc  { fn, args, adminKey? }
 * Replies { ok: true, result } or { ok: false, error }.
 */

const core = require('../lib/core');

const PUBLIC = [
  'getState', 'setPin', 'getMyResponse', 'submitPreferences', 'getResults',
  'freezeShortlist', 'castVote', 'reopenVoting', 'resetVoting',
  'aiFillPreferences', 'aiExplainResults'
];
const ADMIN = [
  'adminOverview', 'adminSaveConfig', 'adminSaveDestinations', 'adminAddSamples',
  'adminRemoveSamples', 'adminSampleVotes', 'adminResetVoting', 'adminResetPin',
  'adminResetAllPins', 'adminDeleteResponse', 'adminTestAi'
];

function appUrl(req) {
  const host = req.headers['x-forwarded-host'] || req.headers.host || '';
  const proto = req.headers['x-forwarded-proto'] || (host.startsWith('localhost') ? 'http' : 'https');
  return host ? proto + '://' + host + '/' : '';
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ ok: false, error: 'Use POST.' }));
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body || '{}'); } catch (e) { body = {}; }
  }
  body = body || {};
  const fn = String(body.fn || '');
  const args = Array.isArray(body.args) ? body.args : [];
  const ctx = { appUrl: appUrl(req) };

  let payload;
  try {
    let result;
    if (PUBLIC.indexOf(fn) > -1) {
      result = await core[fn](ctx, ...args);
    } else if (ADMIN.indexOf(fn) > -1) {
      core.requireAdmin(body.adminKey);
      result = await core[fn](ctx, ...args);
    } else {
      throw Object.assign(new Error('Unknown function: ' + fn), { userFacing: true });
    }
    payload = { ok: true, result: result };
  } catch (e) {
    if (!e.userFacing) console.error(e);
    payload = { ok: false, error: e.userFacing ? e.message : 'Server error: ' + e.message };
  }
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
};
