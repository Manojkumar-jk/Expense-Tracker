// Configuration Example for Personal Dashboard
// Copy this file to config.js and fill in your actual values

module.exports = {
  // Server Configuration
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || 3000,
  
  // Database Configuration
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_USER: process.env.DB_USER || 'root',
  DB_PASSWORD: process.env.DB_PASSWORD || 'root',
  DB_NAME: process.env.DB_NAME || 'personal_dashboard',
  
  // Security Configuration
  SESSION_SECRET: process.env.SESSION_SECRET || 'your_very_secure_session_secret_change_this_in_production',
  
  // Weather API (Optional)
  WEATHER_API_KEY: process.env.WEATHER_API_KEY || '5f56d525d1619d0a2cd2eac4ce55588e',
  
  // Production Settings (set NODE_ENV=production)
  // SESSION_SECRET should be a long, random string in production
  // Use HTTPS in production
  // Set secure cookies in production
};
