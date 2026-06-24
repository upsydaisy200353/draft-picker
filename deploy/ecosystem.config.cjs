module.exports = {
  apps: [
    {
      name: 'draft-picker',
      script: 'server/index.js',
      cwd: '/opt/draft-picker',
      instances: 1,
      autorestart: true,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        HOST: '0.0.0.0',
      },
    },
  ],
};
