require('dotenv').config();

module.exports = {
  // Identity
  BOT_NAME: process.env.BOT_NAME || 'JagX',
  PREFIX: process.env.BOT_PREFIX || '.',
  OWNER_NUMBER: process.env.OWNER_NUMBER || '2340000000000', // digits only, country code, no +

  // Session — change SESSION_NAME per-server so many deployments never collide
  SESSION_NAME: process.env.SESSION_NAME || 'jagx-session',

  // Paste a session ID from the JagX session website here to skip QR/pairing
  // entirely on startup. Leave blank to use LOGIN_METHOD below as normal.
  SESSION_ID: process.env.SESSION_ID || '',

  // Path to an image shown on connect and in .menu. Ships with a default —
  // replace assets/owner.jpg with your own photo to rebrand it.
  OWNER_IMAGE: process.env.OWNER_IMAGE || 'assets/owner.jpg',

  // Login method: "qr" or "pairing"
  // "qr" is more reliable for first-time linking. Use "pairing" only if you
  // can't scan a QR code (e.g. no camera access to the terminal).
  LOGIN_METHOD: (process.env.LOGIN_METHOD || 'qr').toLowerCase(),
  PHONE_NUMBER: process.env.PHONE_NUMBER || '', // required only for pairing mode, digits only

  // Behaviour
  AUTO_READ: process.env.AUTO_READ === 'true',
  PUBLIC_MODE: process.env.PUBLIC_MODE !== 'false', // true = anyone can use, false = owner only
  WORK_DIR: __dirname,

  // Optional API keys — leave blank to disable the feature gracefully
  OPENWEATHER_KEY: process.env.OPENWEATHER_KEY || '',
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '',

  // Economy tuning
  DAILY_AMOUNT: 500,
  WORK_MIN: 100,
  WORK_MAX: 400,
};
