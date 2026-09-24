const assert = require('assert');
const core = require('../lib/core');
const ctx = { appUrl: 'http://localhost/' };

(async () => {
  // adminSaveDestinations still works after the cleanDestinations refactor
  const sample = [{
    name: 'Testville', region: 'Test', vibes: ['beach'], pace: 2, minDays: 2, idealDays: 3,
    dailyCost: 2000, bestMonths: [1, 2], tags: ['food'],
    travel: { Bangalore: { hrs: 5, cost: 5000 } }
  }];
  let r = await core.adminSaveDestinations(ctx, JSON.stringify(sample));
  assert.strictEqual(JSON.parse(r.destinationsJSON)[0].name, 'Testville');
  console.log('adminSaveDestinations OK, custom destinations active:', r.destinationsCustom);

  // Fill in samples for everyone, confirm they show up as submitted
  r = await core.adminAddSamples(ctx);
  assert.strictEqual(r.state.submitted.length, r.state.config.friends.length);
  console.log('adminAddSamples OK, submitted:', r.state.submitted.length, 'of', r.state.config.friends.length);

  // Freeze + vote everyone in, so voting.decision gets set (the "stuck final screen" case)
  const organizer = r.state.config.organizer;
  await core.setPin(ctx, organizer, '1234'); // sample flow doesn't set pins, so create one for the organiser
  const frozen = await core.freezeShortlist(ctx, organizer, '1234', 'weakest');
  assert.ok(frozen.voting.shortlist && frozen.voting.shortlist.length, 'shortlist should be frozen');
  console.log('freezeShortlist OK, shortlist size:', frozen.voting.shortlist.length);

  // Reset everything: this is the new fix
  const reset = await core.adminResetAll(ctx);
  assert.strictEqual(reset.state.submitted.length, 0, 'responses should be cleared');
  assert.strictEqual(reset.state.voting.shortlist, null, 'voting shortlist should be cleared');
  assert.strictEqual(reset.state.voting.decision, null, 'decision should be cleared');
  assert.ok(reset.state.pinSet.indexOf(organizer) > -1, 'PIN should be KEPT after reset');
  console.log('adminResetAll OK: responses cleared, voting cleared, PIN kept');

  // Diagnosis: a group with no shared trip length should explain why, not just show an empty table
  const prefs = (lengths) => ({
    homeCity: 'Bangalore', lengths: lengths, leaveDays: 2, budgetComfort: 15000, budgetMax: 25000,
    blockedWeekends: [], vibes: { beach: 2, mountains: 2, city: 2, heritage: 2, nature: 2 }, pace: 2,
    maxTravelHrs: 8, international: 'maybe', dealbreakers: [], interests: [], notes: ''
  });
  const split = [['Riya', ['short']], ['Siddharth', ['medium']], ['Karan', ['short']], ['Aisha', ['medium']], ['Preethi', ['short']]];
  for (const [name, lengths] of split) {
    await core.setPin(ctx, name, '1234').catch(() => {}); // organizer already has one from freezeShortlist above
    await core.submitPreferences(ctx, name, '1234', prefs(lengths));
  }
  const noFit = await core.getResults(ctx, 'weakest');
  assert.strictEqual(noFit.top.length, 0, 'nothing should fit when lengths never overlap');
  assert.strictEqual(noFit.diagnosis && noFit.diagnosis.reason, 'no-common-length');
  assert.strictEqual(noFit.diagnosis.people.length, 5);
  console.log('diagnoseNoFit OK: correctly identified the trip-length split as the blocker');

  console.log('\nALL SMOKE TESTS PASSED');
})().catch((e) => { console.error('SMOKE TEST FAILED:', e); process.exit(1); });
