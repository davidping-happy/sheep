/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    // 預設連 Render 雲端；本機 API 請在 .env.local 覆寫
    NEXT_PUBLIC_API_BASE:
      process.env.NEXT_PUBLIC_API_BASE ??
      'https://churchsheep-api.onrender.com/api',
  },
};

export default nextConfig;
