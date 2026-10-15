import test from 'node:test';
import assert from 'node:assert/strict';
import {reminderClock,reminderCopy} from '../../supabase/functions/gift-api/mood-reminder.mjs';
test('Beijing 10am and 6pm use independent daily delivery slots',()=>{
  assert.deepEqual(reminderClock(new Date('2026-10-15T02:00:00Z')),{date:'2026-10-15',slot:'morning'});
  assert.deepEqual(reminderClock(new Date('2026-10-15T10:00:00Z')),{date:'2026-10-15',slot:'evening'});
  assert.deepEqual(reminderClock(new Date('2026-10-15T18:00:00Z')),{date:'2026-10-16',slot:'morning'});
  assert.deepEqual(reminderClock(new Date('2026-12-15T10:00:00Z')),{date:'2026-12-15',slot:'evening'});
});
test('Evening reminders use an evening greeting and invalid slots fail',()=>{
  assert.match(reminderCopy('morning').title,/早安/);
  assert.match(reminderCopy('evening').title,/傍晚/);
  assert.doesNotMatch(Object.values(reminderCopy('evening')).join(''),/早安/);
  assert.throws(()=>reminderCopy('afternoon'),/INVALID_INPUT/);
});
