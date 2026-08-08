/**
 * Export apps/mobile as static web into public/app (iPhone Safari testing).
 * Runs before next build on Render / local.
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
  console.error('apps/mobile not found');
  process.exit(1);
}

console.log('Installing mobile dependencies...');
run('npm', ['install', '--legacy-peer-deps', '--include=dev'], mobileRoot);

console.log(`Exporting Expo Web (API=${apiBase}, base=/app)...`);
run('npx', ['expo', 'export', '--platform', 'web'], mobileRoot, {
  EXPO_PUBLIC_API_BASE: apiBase,
  EXPO_WEB_BASE_URL: '/app',
  CI: '1',
});

if (!existsSync(distDir)) {
  console.error('expo export did not produce dist/');
  process.exit(1);
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
cpSync(distDir, outDir, { recursive: true });
console.log(`Wrote ${outDir}`);
