const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Reverses what the session website's encodeSession() does: unwraps the
// "JAGX~<base64 gzip>" string back into the individual auth-state files
// Baileys expects inside the session folder.
function decodeSession(sessionId, targetDir) {
  if (!sessionId || !sessionId.startsWith('JAGX~')) {
    throw new Error('SESSION_ID must start with "JAGX~" — check you copied the whole string.');
  }
  const b64 = sessionId.slice('JAGX~'.length);
  const gz = Buffer.from(b64, 'base64');
  const json = zlib.gunzipSync(gz).toString('utf-8');
  const files = JSON.parse(json);

  fs.mkdirSync(targetDir, { recursive: true });
  for (const [name, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(targetDir, name), content, 'utf-8');
  }
}

module.exports = { decodeSession };
