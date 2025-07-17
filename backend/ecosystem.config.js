module.exports = {
  apps: [
    {
      name: 'mosaic-blur-backend',
      script: 'app.js',
      cwd: '/var/www/mosaic-blur-app/backend',
      instances: process.env.NODE_ENV === 'production' ? 'max' : 1,
      exec_mode: 'cluster',
      
      // Environment variables
      env: {
        NODE_ENV: 'development',
        PORT: 5000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000
      },

      // Resource limits
      max_memory_restart: '1G',
      max_restarts: 10,
      min_uptime: '10s',

      // Logging
      log_file: '/var/log/mosaic-blur-app/combined.log',
      out_file: '/var/log/mosaic-blur-app/out.log',
      error_file: '/var/log/mosaic-blur-app/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Monitoring
      pmx: true,
      
      // Auto restart settings
      autorestart: true,
      watch: false,
      ignore_watch: [
        'node_modules',
        'logs',
        'uploads'
      ],

      // Advanced settings
      kill_timeout: 5000,
      listen_timeout: 8000,
      
      // Source map support
      source_map_support: true,
      
      // Graceful shutdown
      shutdown_with_message: true,
      
      // Health check
      health_check_grace_period: 3000,
      
      // Cron restart (restart daily at 2 AM)
      cron_restart: '0 2 * * *',
      
      // Environment-specific settings
      node_args: process.env.NODE_ENV === 'production' ? 
        ['--max-old-space-size=1024'] : 
        ['--max-old-space-size=512', '--inspect=0.0.0.0:9229'],

      // Custom environment variables
      env_file: '.env.production'
    }
  ],

  // Deployment configuration
  deploy: {
    production: {
      user: 'deploy',
      host: ['your-server-ip'],
      ref: 'origin/main',
      repo: 'https://github.com/yourusername/mosaic-blur-app.git',
      path: '/var/www/mosaic-blur-app',
      
      // Pre-deploy commands
      'pre-deploy-local': '',
      
      // Post-receive hook
      'post-deploy': `
        cd backend && 
        npm ci --production && 
        npm run migrate && 
        pm2 reload ecosystem.config.js --env production && 
        pm2 save
      `,
      
      // Pre-setup
      'pre-setup': '',
      
      // Post-setup
      'post-setup': `
        ls -la
      `,

      // SSH options
      ssh_options: 'StrictHostKeyChecking=no',
      
      // Environment
      env: {
        NODE_ENV: 'production'
      }
    },

    staging: {
      user: 'deploy',
      host: ['staging-server-ip'],
      ref: 'origin/develop',
      repo: 'https://github.com/yourusername/mosaic-blur-app.git',
      path: '/var/www/mosaic-blur-app-staging',
      
      'post-deploy': `
        cd backend && 
        npm ci && 
        npm run migrate && 
        pm2 reload ecosystem.config.js --env staging && 
        pm2 save
      `,
      
      env: {
        NODE_ENV: 'staging'
      }
    }
  }
};