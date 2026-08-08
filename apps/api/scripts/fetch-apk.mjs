/**
 * Download APK into public/downloads during API build (Render).
 * Avoids GitHub/Expo download stalls for testers in TW.
 */
import { createWriteStream, existsSync, mkdirSync, renameSync, unlinkSync, copyFileSync } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.resolve(__dirname, '..');
const outDir = path.join(apiRoot, 'public', 'downloads');

const APK_URL =
  process.env.APK_MIRROR_URL ||
  'https://expo.dev/artifacts/eas/AOOjCLJjDJWr6mt6wUKax73xBE_VGjgFCtrN7cKAfU0.apk';
const FILE_NAME = process.env.APK_FILE_NAME || 'churchsheep-1.1.3.apk';
const LATEST_NAME = 'churchsheep-latest.apk';

async function main() {
  mkdirSync(outDir, { recursive: true });
  const finalPath = path.join(outDir, FILE_NAME);
  const latestPath = path.join(outDir, LATEST_NAME);
  const tmpPath = `${finalPath}.part`;

  if (existsSync(finalPath)) {
    console.log(`APK already present: ${finalPath}`);
    if (!existsSync(latestPath)) copyFileSync(finalPath, latestPath);
    return;
  }

  console.log(`Fetching APK: ${APK_URL}`);
  const res = await fetch(APK_URL, { redirect: 'follow' });
  if (!res.ok || !res.body) {
    console.warn(`APK fetch failed HTTP ${res.status}; continuing without mirror`);
    return;
  }

  try {
    if (existsSync(tmpPath)) unlinkSync(tmpPath);
    await pipeline(Readable.fromWeb(res.body), createWriteStream(tmpPath));
    renameSync(tmpPath, finalPath);
    copyFileSync(finalPath, latestPath);
    console.log(`Wrote ${finalPath}`);
  } catch (err) {
    console.warn('APK write failed:', err instanceof Error ? err.message : err);
    try {
      if (existsSync(tmpPath)) unlinkSync(tmpPath);
    } catch {
      /* ignore */
    }
  }
}

main();
