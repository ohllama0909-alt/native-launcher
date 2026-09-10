const test = require('node:test');
const assert = require('node:assert/strict');
const { pngBuffer, usernameOf } = require('../skin-server/server');

test('skin API accepts valid Minecraft usernames only', () => {
  assert.equal(usernameOf('Player_123'), 'Player_123');
  assert.throws(() => usernameOf('../player'));
  assert.throws(() => usernameOf('ab'));
});

test('skin API rejects non-PNG uploads', () => {
  assert.equal(pngBuffer(null), null);
  assert.throws(() => pngBuffer(Buffer.from('not a png').toString('base64')));
});
