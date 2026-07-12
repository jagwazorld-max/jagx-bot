const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
  downloadMediaMessage,
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');
const path = require('path');
const fs = require('fs');
const qrcodeTerminal = require('qrcode-terminal');

const config = require('./config');
const db = require('./lib/database');
const { serialize, extractText } = require('./lib/serialize');
const { loadPlugins } = require('./lib/loadPlugins');
const messageStore = require('./lib/messageStore');
const { unwrapViewOnce } = require('./lib/media');
const { decodeSession } = require('./lib/sessionDecode');

const SESSION_DIR = path.join(__dirname, 'session', config.SESSION_NAME);
const OWNER_IMAGE_PATH = path.join(__dirname, config.OWNER_IMAGE);

// Deliberately short/mild starter list — extend as needed for your community.
const BAD_WORDS = ['fuck', 'bitch', 'asshole', 'nigger', 'cunt'];
const spamTracker = new Map(); // "chatJid:senderJid" -> recent message timestamps

// Persists across reconnects so we don't spam a new pairing code every time
// the socket cycles while waiting for the phone to confirm.
let pairingCodeIssuedAt = 0;
const PAIRING_CODE_VALID_MS = 150000; // give the user a full 2.5 minutes before allowing a fresh code
let hasAnnouncedConnection = false; // avoid re-sending the "connected" photo on every reconnect

function isOwnerNumber(jid, cfgOwner) {
  const digits = (jid || '').replace(/[^0-9]/g, '');
  return digits === cfgOwner.replace(/[^0-9]/g, '');
}

async function startBot() {
  // If a SESSION_ID is provided and we don't already have a saved session,
  // decode it into the session folder so login is skipped entirely.
  if (config.SESSION_ID && !fs.existsSync(path.join(SESSION_DIR, 'creds.json'))) {
    try {
      decodeSession(config.SESSION_ID, SESSION_DIR);
      console.log('[AUTH] Loaded session from SESSION_ID — skipping QR/pairing.');
    } catch (e) {
      console.error('[AUTH] Could not use SESSION_ID:', e.message);
    }
  }

  const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false, // we handle QR display ourselves for more control
    auth: state,
    browser: [config.BOT_NAME, 'Chrome', '1.0.0'],
    generateHighQualityLinkPreview: true,
  });

  // ---- Login: QR or pairing code ----
  const needsPairing = config.LOGIN_METHOD === 'pairing' && !sock.authState.creds.registered;
  const codeStillValid = Date.now() - pairingCodeIssuedAt < PAIRING_CODE_VALID_MS;

  if (needsPairing && !codeStillValid) {
    if (!config.PHONE_NUMBER) {
      console.log('[AUTH] LOGIN_METHOD=pairing requires PHONE_NUMBER in .env (digits only, with country code).');
    } else {
      setTimeout(async () => {
        try {
          const code = await sock.requestPairingCode(config.PHONE_NUMBER);
          pairingCodeIssuedAt = Date.now();
          console.log(`\n[AUTH] Your pairing code: ${code}\nEnter this NOW in WhatsApp > Linked Devices > Link with phone number.\nThis code stays valid across reconnects for about 2.5 minutes — don't worry if you see [CONN] messages while you type it in.\n`);
        } catch (e) {
          console.error('[AUTH] Failed to request pairing code:', e.message);
        }
      }, 3000);
    }
  } else if (needsPairing && codeStillValid) {
    console.log('[AUTH] Still waiting on your last pairing code — enter it now if you haven\'t.');
  }

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr && config.LOGIN_METHOD !== 'pairing') {
      console.log('\n[AUTH] Scan this QR code with WhatsApp > Linked Devices:\n');
      qrcodeTerminal.generate(qr, { small: true });
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error instanceof Boom ? lastDisconnect.error.output?.statusCode : undefined;
      const loggedOut = statusCode === DisconnectReason.loggedOut;
      console.log(`[CONN] closed (code: ${statusCode || 'unknown'}). Reconnect: ${!loggedOut}`);
      if (!loggedOut) {
        // Small delay avoids hammering a fresh connection/pairing request
        // while the user is still typing the previous pairing code in WhatsApp.
        setTimeout(() => startBot(), 3000);
      } else {
        console.log('[CONN] Session logged out. Delete the session folder and restart to re-link.');
      }
    } else if (connection === 'open') {
      console.log(`[CONN] ✅ ${config.BOT_NAME} is connected and online.`);
      if (!hasAnnouncedConnection) {
        hasAnnouncedConnection = true;
        const ownerJid = `${config.OWNER_NUMBER.replace(/[^0-9]/g, '')}@s.whatsapp.net`;
        const caption = `✅ *${config.BOT_NAME} connected successfully!*\n\nPrefix: ${config.PREFIX}\nType ${config.PREFIX}menu to see everything I can do.`;
        try {
          if (fs.existsSync(OWNER_IMAGE_PATH)) {
            sock.sendMessage(ownerJid, { image: fs.readFileSync(OWNER_IMAGE_PATH), caption }).catch(() => {});
          } else {
            sock.sendMessage(ownerJid, { text: caption }).catch(() => {});
          }
        } catch (e) {
          console.error('[CONN] Could not send connect announcement:', e.message);
        }
      }
    }
  });

  // ---- Anticall: reject and block callers when enabled ----
  sock.ev.on('call', async (calls) => {
    if (!db.data.settings.anticall) return;
    for (const call of calls) {
      if (call.status !== 'offer') continue;
      try {
        await sock.rejectCall(call.id, call.from);
        await sock.updateBlockStatus(call.from, 'block');
      } catch (e) {
        console.error('[ANTICALL] failed:', e.message);
      }
    }
  });

  // ---- Welcome / goodbye messages ----
  sock.ev.on('group-participants.update', async (evt) => {
    try {
      const group = db.getGroup(evt.id);
      if (!group.welcome) return;
      const meta = await sock.groupMetadata(evt.id);
      for (const participant of evt.participants) {
        const name = `@${participant.split('@')[0]}`;
        if (evt.action === 'add') {
          const template = group.welcomeText || '👋 Welcome {user} to *{group}*!';
          const text = template.replace(/{user}/g, name).replace(/{group}/g, meta.subject);
          await sock.sendMessage(evt.id, { text, mentions: [participant] });
        } else if (evt.action === 'remove') {
          const template = group.goodbyeText || '👋 {user} left {group}.';
          const text = template.replace(/{user}/g, name).replace(/{group}/g, meta.subject);
          await sock.sendMessage(evt.id, { text, mentions: [participant] });
        }
      }
    } catch (e) {
      console.error('[GROUP EVENT] error:', e.message);
    }
  });

  // ---- Deleted-message recovery ----
  async function handleDeletedMessage(raw, protocolMsg) {
    try {
      const chatJid = raw.key.remoteJid;
      const chat = db.getChat(chatJid);
      if (!chat.antidelete) return;

      const originalKey = protocolMsg.key;
      const cached = messageStore.get(originalKey?.id);
      if (!cached) return;

      const originalSender = cached.key.participant || cached.key.remoteJid;
      const header = `🗑️ *Deleted message recovered*\nFrom: @${(originalSender || '').split('@')[0]}\n\n`;
      const mediaContainer = unwrapViewOnce(cached.message);

      if (mediaContainer.imageMessage || mediaContainer.videoMessage || mediaContainer.stickerMessage || mediaContainer.audioMessage || mediaContainer.documentMessage) {
        const buffer = await downloadMediaMessage({ key: cached.key, message: mediaContainer }, 'buffer', {});
        const mtype = mediaContainer.imageMessage ? 'image' : mediaContainer.videoMessage ? 'video' : mediaContainer.stickerMessage ? 'sticker' : mediaContainer.audioMessage ? 'audio' : 'document';
        const content = { [mtype]: buffer };
        if (mtype === 'audio') content.mimetype = 'audio/mpeg';
        else content.caption = header + (extractText(cached) || '');
        await sock.sendMessage(chatJid, content, { mentions: [originalSender] });
      } else {
        await sock.sendMessage(chatJid, { text: header + (extractText(cached) || '(empty message)'), mentions: [originalSender] });
      }
    } catch (e) {
      console.error('[ANTIDELETE] failed:', e.message);
    }
  }

  // ---- View-once auto-capture ----
  async function handleViewOnce(raw, m) {
    try {
      const chat = db.getChat(m.from);
      if (!chat.antiviewonce) return;

      let inner = null;
      const msg = raw.message;
      if (msg.viewOnceMessage || msg.viewOnceMessageV2 || msg.viewOnceMessageV2Extension) {
        inner = unwrapViewOnce(msg);
      } else if (msg.imageMessage?.viewOnce) {
        inner = { imageMessage: msg.imageMessage };
      } else if (msg.videoMessage?.viewOnce) {
        inner = { videoMessage: msg.videoMessage };
      }
      if (!inner) return;

      const mtype = inner.imageMessage ? 'image' : 'video';
      const buffer = await downloadMediaMessage({ key: raw.key, message: inner }, 'buffer', {});
      await sock.sendMessage(m.from, { [mtype]: buffer, caption: `🔓 View-once media captured from @${m.sender.split('@')[0]}`, mentions: [m.sender] });
    } catch (e) {
      console.error('[ANTIVIEWONCE] failed:', e.message);
    }
  }

  // ---- Message handling ----
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const raw of messages) {
      try {
        if (!raw.message) continue;

        // Deletion notices arrive as a protocolMessage of type REVOKE, sent as
        // a normal message referencing the original message's key.
        const protocolMsg = raw.message.protocolMessage;
        if (protocolMsg && (protocolMsg.type === 0 || protocolMsg.type === 'REVOKE')) {
          await handleDeletedMessage(raw, protocolMsg);
          continue;
        }

        const m = serialize(sock, raw, config);

        // Self-bot mode: if the bot is linked to your own WhatsApp account,
        // your own messages arrive with fromMe=true. We still want to run
        // commands you type, but we skip cache/enforcement side-effects for
        // your own messages (no point antidelete-tracking or antilink-checking yourself).
        if (!raw.key.fromMe) {
          // Cache every message we see so a later delete can be recovered.
          messageStore.set(raw.key.id, raw);

          // Auto-forward view-once media if enabled for this chat.
          await handleViewOnce(raw, m);
        }

        if (config.AUTO_READ) {
          sock.readMessages([raw.key]).catch(() => {});
        }

        // Antilink enforcement (runs on every group message, not just commands)
        if (m.isGroup && !raw.key.fromMe) {
          const group = db.getGroup(m.from);
          if (group.antilink && /chat\.whatsapp\.com\/[A-Za-z0-9]+/.test(m.body)) {
            const meta = await sock.groupMetadata(m.from);
            const participant = meta.participants.find((p) => p.id === m.sender);
            const senderIsAdmin = participant && (participant.admin === 'admin' || participant.admin === 'superadmin');
            if (!senderIsAdmin) {
              await sock.sendMessage(m.from, { delete: m.key }).catch(() => {});
              await m.reply('🔗 Group links are not allowed here.').catch(() => {});
              continue;
            }
          }
          if (group.antibadword && m.body && BAD_WORDS.some((w) => m.body.toLowerCase().includes(w))) {
            const meta = await sock.groupMetadata(m.from);
            const participant = meta.participants.find((p) => p.id === m.sender);
            const senderIsAdmin = participant && (participant.admin === 'admin' || participant.admin === 'superadmin');
            if (!senderIsAdmin) {
              await sock.sendMessage(m.from, { delete: m.key }).catch(() => {});
              await m.reply('🤬 Watch your language.').catch(() => {});
              continue;
            }
          }
          if (group.antispam) {
            const key = `${m.from}:${m.sender}`;
            const now = Date.now();
            const times = (spamTracker.get(key) || []).filter((t) => now - t < 10000);
            times.push(now);
            spamTracker.set(key, times);
            if (times.length > 5) {
              await sock.sendMessage(m.from, { delete: m.key }).catch(() => {});
              continue;
            }
          }
        }

        // Keyword auto-replies (owner-configured, any chat)
        if (!m.isCmd && m.body) {
          const replies = db.data.settings.autoreplies || {};
          const hit = Object.keys(replies).find((k) => m.body.toLowerCase().includes(k));
          if (hit) {
            await sock.sendMessage(m.from, { text: replies[hit] }, { quoted: m.raw }).catch(() => {});
          }
        }

        if (!m.isCmd || !m.command) continue;


        const commands = loadedCommands;
        const cmd = commands.get(m.command);
        if (!cmd) continue;

        const user = db.getUser(m.sender);
        if (user.banned) {
          await m.reply('🚫 You are banned from using this bot.');
          continue;
        }

        const isOwner = isOwnerNumber(m.sender, config.OWNER_NUMBER);
        if (!config.PUBLIC_MODE && !isOwner) {
          await m.reply('🔒 This bot is currently in owner-only mode.');
          continue;
        }

        let isSenderAdmin = false;
        if (m.isGroup) {
          const meta = await sock.groupMetadata(m.from).catch(() => null);
          if (meta) {
            const participant = meta.participants.find((p) => p.id === m.sender);
            isSenderAdmin = !!participant && (participant.admin === 'admin' || participant.admin === 'superadmin');
          }
        }

        const ctx = { config, db, isOwner, isSenderAdmin, ownerImagePath: OWNER_IMAGE_PATH };

        try {
          await cmd.run(sock, m, m.args, ctx);
        } catch (e) {
          console.error(`[CMD:${cmd.name}] error:`, e);
          await m.reply(`⚠️ Something went wrong running that command: ${e.message}`).catch(() => {});
        }
      } catch (outerErr) {
        console.error('[MESSAGE HANDLER] error:', outerErr);
      }
    }
  });

  return sock;
}

let loadedCommands = loadPlugins();

console.log(`\n=== ${config.BOT_NAME} starting ===`);
console.log(`Prefix: ${config.PREFIX} | Login method: ${config.LOGIN_METHOD} | Public mode: ${config.PUBLIC_MODE}\n`);

startBot();

process.on('uncaughtException', (err) => console.error('[UNCAUGHT]', err));
process.on('unhandledRejection', (err) => console.error('[UNHANDLED]', err));
