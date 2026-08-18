/**
 * 建置時把 APK 拉到 public/downloads，讓測試者從後台網域下載
 *（避開 GitHub Releases 在台灣／LINE 常卡住的問題）。
 */
import { createWriteStream, existsSync, mkdirSync, renameSync, unlinkSync } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const adminRoot = path.resolve(__dirname, '..');
const outDir = path.join(adminRoot, 'public', 'downloads');

const APK_URL =
  process.env.APK_MIRROR_URL ||
  'https://github.com/davidping-happy/sheep/releases/download/v1.1.9-preview/churchsheep-1.1.9.apk';
const FILE_NAME = process.env.APK_FILE_NAME || 'churchsheep-1.1.9.apk';
const LATEST_NAME = 'churchsheep-latest.apk';

async function main() {
  mkdirSync(outDir, { recursive: true });
  const finalPath = path.join(outDir, FILE_NAME);
  const latestPath = path.join(outDir, LATEST_NAME);
  const tmpPath = `${finalPath}.part`;

  // 本機若已有檔（例如手動複製），略過下載
  if (existsSync(finalPath)) {
    console.log(`已有 ${finalPath}，略過下載`);
    if (!existsSync(latestPath)) {
      try {
        const { copyFileSync } = await import('node:fs');
        copyFileSync(finalPath, latestPath);
      } catch {
        /* ignore */
      }
    }
    return;
  }

  console.log(`下載 APK：${APK_URL}`);
  const res = await fetch(APK_URL, { redirect: 'follow' });
  if (!res.ok || !res.body) {
    console.warn(`APK 下載失敗 HTTP ${res.status}，略過（下載頁仍可用備用連結）`);
    return;
  }

  try {
    if (existsSync(tmpPath)) unlinkSync(tmpPath);
    await pipeline(Readable.fromWeb(res.body), createWriteStream(tmpPath));
    renameSync(tmpPath, finalPath);
    const { copyFileSync } = await import('node:fs');
    copyFileSync(finalPath, latestPath);
    console.log(`已寫入 ${finalPath}`);
  } catch (err) {
    console.warn('APK 下載寫入失敗，略過：', err instanceof Error ? err.message : err);
    try {
      if (existsSync(tmpPath)) unlinkSync(tmpPath);
    } catch {
      /* ignore */
    }
  }
}

main();
