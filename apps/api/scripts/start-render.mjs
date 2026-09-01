/**
 * Render 啟動：只啟動 API（立刻通過健康檢查）。
 * Schema 同步改在 Nest bootstrap 後背景執行，避免 Deploy 因 migrate 過慢被判 Failed。
 */
import { spawn } from 'node:child_process';

console.log('[start-render] node dist/main.js');
const app = spawn('node', ['dist/main.js'], {
  stdio: 'inherit',
  shell: true,
  env: process.env,
});

app.on('exit', (code, signal) => {
  if (signal) {
    console.error(`[start-render] API killed by signal ${signal}`);
    process.exit(1);
  }
  process.exit(code ?? 1);
});

app.on('error', (err) => {
  console.error('[start-render] failed to start API', err);
  process.exit(1);
});
