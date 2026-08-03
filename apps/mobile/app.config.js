const { expo } = require('./app.json');

/** EXPO_WEB_BASE_URL=/app 時靜態匯出給後台 public/app 託管 */
module.exports = {
  expo: {
    ...expo,
    experiments: {
      ...(expo.experiments || {}),
      ...(process.env.EXPO_WEB_BASE_URL
        ? { baseUrl: process.env.EXPO_WEB_BASE_URL }
        : {}),
    },
  },
};
