const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

test('profile panel receives friend badge data and the composer has no voice action', () => {
  const relay = fs.readFileSync(path.join(ROOT, 'src/features/social/RelayPage.jsx'), 'utf8');
  const profile = fs.readFileSync(path.join(ROOT, 'src/features/social/UserProfilePanel.jsx'), 'utf8');
  const badges = fs.readFileSync(path.join(ROOT, 'src/features/social/Badges.jsx'), 'utf8');

  assert.match(relay, /badges: friend\.badges \|\| \[\]/);
  assert.match(relay, /isVerified: Boolean\(friend\.isVerified\)/);
  assert.doesNotMatch(relay, /relay-voice-btn|handleVoiceNote|<Mic\b/);
  assert.match(profile, /np-profile-badges/);
  assert.match(profile, /np-card np-activity/, 'activity card is restored for launcher and game status');
  assert.doesNotMatch(profile, /user\.status/, 'raw status is not rendered as bio text');
  assert.doesNotMatch(badges, /verifiedBadge|id:\s*'verified'/, 'verified badge is removed');
});
