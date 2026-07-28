/** 集中式設定讀取（勿在程式碼寫死金鑰，一律走環境變數，§四.6）*/
export default () => ({
  env: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  corsOrigins: (process.env.CORS_ORIGINS ?? '').split(',').filter(Boolean),
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? '',
    accessTtl: process.env.JWT_ACCESS_TTL ?? '900s',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? '',
    refreshTtl: process.env.JWT_REFRESH_TTL ?? '30d',
  },
  fieldEncryptionKey: process.env.FIELD_ENCRYPTION_KEY ?? '',
  youtube: {
    apiKey: process.env.YOUTUBE_API_KEY ?? '',
    channelId: process.env.YOUTUBE_CHANNEL_ID ?? 'UCdcDDnZj76AwNqj18jtTAgw',
    channelUrl:
      process.env.YOUTUBE_CHANNEL_URL ??
      'https://www.youtube.com/@breadoflifechristianchurch9830',
  },
  fcm: {
    projectId: process.env.FCM_PROJECT_ID ?? '',
    serviceAccountPath: process.env.FCM_SERVICE_ACCOUNT_PATH ?? '',
  },
  lineNotifyToken: process.env.LINE_NOTIFY_TOKEN ?? '',
  storage: {
    bucket: process.env.STORAGE_BUCKET ?? '',
    region: process.env.STORAGE_REGION ?? '',
  },
  throttle: {
    ttl: parseInt(process.env.THROTTLE_TTL ?? '60', 10),
    limit: parseInt(process.env.THROTTLE_LIMIT ?? '100', 10),
  },
});
