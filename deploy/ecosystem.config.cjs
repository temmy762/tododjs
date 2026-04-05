// PM2 Ecosystem Config — TodoDJs API
// Place at /var/www/tododjs/server/ecosystem.config.cjs
// Start: pm2 start ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: 'tododjs-api',
      script: './server.js',
      cwd: '/var/www/tododjs/server',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
      max_memory_restart: '512M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/var/log/pm2/tododjs-error.log',
      out_file: '/var/log/pm2/tododjs-out.log',
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_restarts: 10,
      restart_delay: 5000,
    },
  ],
};
