/**
 * 將 apps/mobile 匯出為靜態網頁，放到 public/app（iPhone Safari 測試用）。
 * 在 Render／本機於 next build 前執行。
 */
import { spawnSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  rmSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const adminRoot = path.resolve(__dirname, '..');
const mobileRoot = path.resolve(adminRoot, '../mobile');
const distDir = path.join(mobileRoot, 'dist');
const outDir = path.join(adminRoot, 'public', 'app');

const apiBase =
  process.env.EXPO_PUBLIC_API_BASE ||
  process.env.NEXT_PUBLIC_API_BASE ||
  'https://churchsheep-api.onrender.com/api';

function run(cmd, args, cwd, env = {}) {
  const result = spawnSync(cmd, args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

if (!existsSync(mobileRoot)) {
  console.error('找不到 apps/mobile，略過網頁版嵌入');
  process.exit(1);
}

console.log('安裝 mobile 依賴…');
run('npm', ['install', '--legacy-peer-deps', '--include=dev'], mobileRoot);

console.log(`匯出 Expo Web（API=${apiBase}, base=/app）…`);
run('npx', ['expo', 'export', '--platform', 'web'], mobileRoot, {
  EXPO_PUBLIC_API_BASE: apiBase,
  EXPO_WEB_BASE_URL: '/app',
  CI: '1',
});

if (!existsSync(distDir)) {
  console.error('expo export 未產生 dist/');
  process.exit(1);
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
cpSync(distDir, outDir, { recursive: true });
console.log(`已寫入 ${outDir}`);
