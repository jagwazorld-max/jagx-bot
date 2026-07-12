```
     ██╗ █████╗  ██████╗ ██╗  ██╗
     ██║██╔══██╗██╔════╝ ╚██╗██╔╝
     ██║███████║██║  ███╗ ╚███╔╝
██   ██║██╔══██║██║   ██║ ██╔██╗
╚█████╔╝██║  ██║╚██████╔╝██╔╝ ██╗
 ╚════╝ ╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝
```

<div align="center">

**A full-time, self-hosted WhatsApp bot with 115+ commands**

`Node.js` · `Baileys` · `Runs anywhere Node runs` · `No browser required`

Built by **JRI** · [License](#-license) · [Report an issue](#-troubleshooting)

</div>

---

## 📖 Table of contents

1. [What's included](#-whats-included)
2. [Requirements](#-requirements)
3. [Quick install](#-quick-install)
4. [Login methods](#-login-methods)
5. [Run it on Termux (Android)](#-run-it-on-termux-android)
6. [Run it on Windows (Command Prompt)](#-run-it-on-windows-command-prompt)
7. [Run it on Linux/macOS (Terminal)](#-run-it-on-linuxmacos-terminal)
8. [Run it on a VPS, full-time](#-run-it-on-a-vps-full-time)
9. [Running many servers at once](#-running-many-servers-at-once)
10. [Docker](#-docker)
11. [Privacy/recovery features](#-privacyrecovery-features--use-responsibly)
12. [Optional API keys](#-optional-api-keys)
13. [Command list](#-command-list)
14. [Adding your own commands](#-adding-your-own-commands)
15. [Troubleshooting](#-troubleshooting)
16. [License](#-license)

---

## ✨ What's included

- **115+ commands** across 11 categories — general, group admin, moderation, privacy/recovery, tools, fun, info/search, downloader, economy, owner, and more.
- A **plugin system** — every file in `plugins/` auto-loads. Add a command by adding an object to a file, no registration step.
- A tiny **JSON file database** — no MySQL/MongoDB/native modules, so it behaves identically on Termux and a VPS.
- **Three login methods**: QR code, pairing code, or a portable `SESSION_ID` string (see the companion [JagX Session Generator](../jagx-session) website) — the bot tries them in that priority order automatically.
- A **branded connect message and `.menu`** — both show a photo (`assets/owner.jpg`, swap for your own anytime).
- **Self-bot mode supported** — link your own WhatsApp number directly (no second SIM needed), and the bot still recognizes your own commands correctly.
- Auto-reconnect, antilink, antibadword, antispam, anticall, warnings, customizable welcome/goodbye messages, antidelete, antiviewonce, a full economy game, optional AI chat, optional weather, reminders, auto-replies, and a lot more.

Run **`.menu`** in any chat once the bot is online to see the live, always-current command list.

---

## ✅ Requirements

- **Node.js 18 or newer** — check with `node -v`
- **npm** (comes with Node)
- A WhatsApp account to dedicate to the bot — a secondary number/SIM is strongly recommended over your main personal number

---

## 🚀 Quick install

Works the same everywhere — Termux, Windows, Linux, macOS, a VPS. Platform-specific notes are in the sections below if you hit anything unusual.

```bash
cd jagx-bot
npm install
cp .env.example .env
```

Open `.env` and set at minimum:

```env
OWNER_NUMBER=234xxxxxxxxxx      # your number, digits only, country code, no +
SESSION_NAME=jagx-session-1     # unique per install if running more than one
LOGIN_METHOD=qr                 # or "pairing" — see Login methods below
```

Then start it:

```bash
npm start
```

---

## 🔐 Login methods

The bot checks these in order, every time it starts:

1. **`SESSION_ID`** — if set in `.env` and valid, it connects instantly with no scanning at all. Generate one with the companion [JagX Session Generator](../jagx-session) website.
2. **`LOGIN_METHOD=qr`** *(default, most reliable)* — a QR code prints in the terminal. Scan it: WhatsApp → Settings → Linked Devices → Link a Device.
3. **`LOGIN_METHOD=pairing`** — set `PHONE_NUMBER=234xxxxxxxxxx` in `.env` too. A short code prints instead of a QR. **WhatsApp's pairing codes expire fast (under a minute)** — have WhatsApp already open on the "Link with phone number" screen before starting the bot, so you can type the code in the instant it appears.

If `SESSION_ID` is set but invalid or expired, the bot logs a warning and automatically falls back to whichever `LOGIN_METHOD` is set — it won't crash, so it's safe to leave more than one configured at once.

**Linking your own personal number (self-bot mode)?** Totally supported — just scan/pair with your own phone. The one thing to know: any command you type from your own phone in *any* chat gets processed (that's what makes self-bot mode useful), so the person you're chatting with will see you typed `.command` before the bot's reply. Test commands in your own "Message yourself" chat to keep it private.

---

## 📱 Run it on Termux (Android)

```bash
pkg update && pkg upgrade -y
pkg install nodejs-lts git -y
```

Get the project onto the device — easiest is transferring the zip and extracting it, or:

```bash
termux-setup-storage                      # allow Termux to see your Downloads folder, tap Allow
cp ~/storage/downloads/jagx-bot.zip ~/
cd ~
unzip jagx-bot.zip
cd jagx-bot
```

Then the normal install steps:

```bash
npm install
cp .env.example .env
nano .env          # fill in OWNER_NUMBER, save with Ctrl+O, Enter, exit with Ctrl+X
npm start
```

**Keeping it alive on Android:**
- Run `termux-wake-lock` so Android doesn't kill the process to save battery.
- Run it inside `tmux` so it survives closing the Termux app:
  ```bash
  pkg install tmux -y
  tmux new -s jagx
  npm start
  # detach: Ctrl+B then D  —  reattach later: tmux attach -t jagx
  ```
- The optional `sharp` package (used for `.sticker`) has prebuilt binaries for most Android/ARM devices. If it fails to install, the bot still runs fine — `.sticker` just explains it's unavailable instead of crashing anything else.

---

## 🖥️ Run it on Windows (Command Prompt)

```cmd
cd C:\Users\you\Downloads
```

Extract the zip here first (right-click → **Extract All**), then:

```cmd
cd jagx-bot
dir
```

**Confirm before continuing:** `dir` should show `package.json`, `index.js`, `config.js`, and folders `plugins` and `lib` *directly* in this listing. If it instead shows another `jagx-bot` folder inside, `cd jagx-bot` once more first — zip extraction sometimes nests a folder inside itself.

```cmd
npm install
copy .env.example .env
notepad .env
```

Set `OWNER_NUMBER`, `SESSION_NAME`, `LOGIN_METHOD`, save, close Notepad, then:

```cmd
npm start
```

A QR code prints right in Command Prompt — scan it with WhatsApp.

---

## 🐧 Run it on Linux/macOS (Terminal)

```bash
cd ~/Downloads
unzip jagx-bot.zip
cd jagx-bot
npm install
cp .env.example .env
nano .env      # or: open -e .env  /  code .env
npm start
```

Everything here behaves the same as the Quick Install section — Linux/macOS terminals don't need any special-casing.

---

## 🌐 Run it on a VPS, full-time

This is the setup for genuine 24/7 uptime with auto-restart on crash or reboot:

```bash
sudo apt update && sudo apt install -y nodejs npm git
git clone <your-repo-url> jagx-bot     # or transfer the folder directly
cd jagx-bot
npm install
cp .env.example .env && nano .env
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save
pm2 startup       # follow the printed instructions so it survives reboots
```

```bash
pm2 logs jagx-bot-1       # view live logs
pm2 restart jagx-bot-1    # restart
pm2 stop jagx-bot-1       # stop
```

---

## 🧩 Running many servers at once

Because the bot only depends on its own `session/` and `data/` folders, you can run as many independent copies as you want.

**Real separate servers (the normal case for 40+ deployments):** just repeat the install on each server with its own `.env`. They never need to know about each other.

**Several numbers on one machine:**
```bash
cp fleet.example.json fleet.json
nano fleet.json      # one entry per number: name, ownerNumber, sessionId
node scripts/generate-fleet.js
pm2 start ecosystem.fleet.config.js
```
This spins up one fully isolated pm2 process per entry, each with its own `SESSION_NAME` and `SESSION_ID` (generate session IDs from the companion website — no interactive login needed per instance at all).

---

## 🐳 Docker

```dockerfile
FROM node:18-slim
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=optional
COPY . .
CMD ["node", "index.js"]
```

```bash
docker build -t jagx-bot .
docker run -d --name jagx-bot \
  -v $(pwd)/session:/app/session \
  -v $(pwd)/data:/app/data \
  --env-file .env jagx-bot
```

---

## 🔒 Privacy/recovery features — use responsibly

`.antidelete` and `.antiviewonce` are **off by default**, per chat.

- **Antidelete** — if someone deletes a message "for everyone" in a chat where this is on, the bot reposts what it said automatically.
- **Antiviewonce** — view-once photos/videos get captured the moment they arrive and reposted as normal, re-viewable media.
- `.vv` and `.save` are on-demand versions triggered by replying to a specific message — no toggle needed.

These are genuinely useful for moderation, but they mean "deleted" or "view once" content isn't really gone from that chat. Turn them on only where the people involved are okay with that, and be upfront about it — especially in groups.

---

## 🔑 Optional API keys

| Feature | Env variable | Get one at |
|---|---|---|
| `.weather` | `OPENWEATHER_KEY` | openweathermap.org (free tier) |
| `.ai` / `.gpt` | `ANTHROPIC_API_KEY` | console.anthropic.com |

Leave them blank and those two commands explain what's missing instead of crashing — nothing else is affected.

---

## 📋 Command list

Run **`.menu`** in chat for the live, always-accurate list. Summary:

| Category | Commands |
|---|---|
| **General** | menu (with photo), ping, alive, owner, runtime, jid, speedtest, script, donate, time, whoami |
| **Group admin** | kick, add, promote, demote, groupinfo, tagall, hidetag, tagadmins, listadmins, setgname, setgdesc, setgpp, getpp, revoke, mute, unmute, antilink, welcome, setwelcome, setgoodbye, leavegroup, anon |
| **Moderation** | warn, delwarn, warnings, resetwarns, antibadword, antispam, ban, unban |
| **Privacy/recovery** | antidelete, antiviewonce, vv, save |
| **Tools** | sticker, toimg, take, qrcode, shortlink, translate, tts, calculate, currency, poll, location, vcard, password, base64, hex, bmi, age, remind, remindlist, whois |
| **Fun** | quote, meme, joke, fact, truth, dare, ship, rate, trivia, coinflip, dice, eightball, zodiac, namegen, roast, compliment, advice |
| **Info/Search** | wiki, define, weather*, lyrics, ai* |
| **Downloader** | ytmp3, ytmp4, tiktok, instagram, facebook, twitter, pinterest |
| **Economy** | balance, daily, work, rob, deposit, withdraw, leaderboard |
| **Owner** | broadcast, setprefix, restart, eval, stats, block, unblock, anticall, setbio, setpname, listgroups, autoreply, exportdata, cleardb |

\* Needs a free API key — see [Optional API keys](#-optional-api-keys).

---

## 🛠️ Adding your own commands

Add an object (or array of objects) to any file in `plugins/`, or create a new file there:

```js
module.exports = [
  {
    name: 'hello',
    alias: ['hi'],
    category: 'general',
    desc: 'Say hello',
    run: async (sock, m, args, ctx) => {
      await m.reply('Hello there!');
    },
  },
];
```

`m` gives you `m.from`, `m.sender`, `m.isGroup`, `m.args`, `m.text`, `m.mentioned`, `m.reply(text)`.
`ctx` gives you `ctx.config`, `ctx.db`, `ctx.isOwner`, `ctx.isSenderAdmin`, `ctx.ownerImagePath`.

No restart-time registration needed — just drop the file in and restart the process.

---

## 🩺 Troubleshooting

| Symptom | Fix |
|---|---|
| QR keeps expiring / won't connect | Check your server's clock is correct (`date`), and your connection is stable |
| "Session logged out" | Delete the `session/<SESSION_NAME>` folder and restart to re-link from scratch |
| `.sticker` doesn't work | The optional `sharp` package failed to build — try `npm install sharp` again, or install build tools first (`pkg install python make clang` on Termux, `apt install build-essential` on Debian/Ubuntu) |
| Bot randomly stops on Termux | Android killed the background process — use `termux-wake-lock` and run inside `tmux`, or move to a VPS |
| Commands don't respond in self-bot mode | Make sure you're typing them from the same account you linked, and try your own "Message yourself" chat first |
| Multiple instances interfering | Double-check each has a unique `SESSION_NAME`, ideally its own project folder |
| `npm install` fails with ENOENT / can't find package.json | You're not standing in the right folder — run `dir` (Windows) or `ls` (Termux/Linux/Mac) and `cd` into the folder that actually contains `package.json` |

---

## 📄 License

This project is released under the **JRI License** — see [`LICENSE`](./LICENSE). In short: free to use, modify, and self-host, with credit to **JagX** and **JRI** kept intact.

> This project automates a personal WhatsApp account using an unofficial library and isn't affiliated with WhatsApp/Meta. Automating WhatsApp can violate their Terms of Service — use a secondary number, keep message volume reasonable, and never use it for spam.

<div align="center">

**JagX** · built by **JRI**

</div>
