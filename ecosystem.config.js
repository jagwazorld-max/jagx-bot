// Run with: pm2 start ecosystem.config.js
// This template shows ONE instance. To run many independent bot instances
// on the same server (e.g. for different WhatsApp numbers/servers you manage),
// duplicate the object below, give each a unique `name` and a unique
// SESSION_NAME in `env`, then run `pm2 start ecosystem.config.js` again.

module.exports = {
  apps: [
    {
      name: 'jagx-bot-1',
      script: 'index.js',
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      env: {
        SESSION_NAME: 'jagx-session-1',
      },
    },
    // {
    //   name: 'jagx-bot-2',
    //   script: 'index.js',
    //   autorestart: true,
    //   watch: false,
    //   env: { SESSION_NAME: 'jagx-session-2' },
    // },
  ],
};
