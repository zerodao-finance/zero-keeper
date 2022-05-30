module.exports = {
  apps : [
    {
      name: "keeper",
      cwd: "./packages/keeper",
      script: "yarn",
      args: "start",
      interpreter: "bash",
      instances: 1,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "development",
        REACT_APP_API_URL: "http://localhost:8080",
      },
      env_production: {
        NODE_ENV: "production",
      }
    },
    {
      name: "watcher",
      cwd: "./packages/watcher",
      script: "yarn",
      args: "start",
      interpreter: "bash",
      instances: 1,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "development"
      }
    }
],

  deploy : {
    production : {
      user : 'SSH_USERNAME',
      host : 'SSH_HOSTMACHINE',
      ref  : 'origin/master',
      repo : 'GIT_REPOSITORY',
      path : 'DESTINATION_PATH',
      'pre-deploy-local': '',
      'post-deploy' : 'yarn && pm2 reload ecosystem.config.js --env development',
      'pre-setup': ''
    }
  }
};
