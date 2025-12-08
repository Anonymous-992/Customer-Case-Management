module.exports = {
  apps: [{
    name: 'case-management',
    script: 'dist/index.js',
    instances: 1,
    autorestart: true,
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    }
  }]
};
