/**
 * Render 啟動：先 migrate，失敗時 resolve／db push，最後一定啟動 API。
 * 避免 migration checksum／半套用狀態導致 Deploy 一直 Failed、App 卡死。
 */
import { spawnSync } from 'node:child_process';

function run(cmd, args) {
  console.log(`> ${cmd} ${args.join(' ')}`);
  return spawnSync(cmd, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: process.env,
  });
}

console.log('[start-render] prisma migrate deploy…');
let migrate = run('npx', ['prisma', 'migrate', 'deploy']);

if (migrate.status !== 0) {
  console.warn(
    '[start-render] migrate deploy failed — resolve devotion_social + db push fallback',
  );
  run('npx', [
    'prisma',
    'migrate',
    'resolve',
    '--rolled-back',
    '20260831000000_devotion_social',
  ]);
  run('npx', [
    'prisma',
    'migrate',
    'resolve',
    '--applied',
    '20260831000000_devotion_social',
  ]);
  const push = run('npx', ['prisma', 'db', 'push', '--skip-generate', '--accept-data-loss']);
  if (push.status !== 0) {
    console.warn(
      '[start-render] db push also failed; starting API anyway (health / 既有功能優先)',
    );
  }
}

console.log('[start-render] starting node dist/main.js…');
const app = run('node', ['dist/main.js']);
process.exit(app.status ?? 1);
