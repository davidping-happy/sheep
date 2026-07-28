/**
 * 變更帳號密碼（管理員或會友）— 不在指令中留下明文密碼。
 *
 * 用法：
 *   npm run set-password                          # 互動輸入 email 與新密碼
 *   npm run set-password -- --email a@b.c         # 指定帳號，只問密碼
 *
 * 變更後該帳號既有的 refresh token 會全部失效（其他裝置需重新登入）。
 */
import * as readline from 'node:readline';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const MIN_LENGTH = 12;
const WEAK = ['ChangeMe123456', 'changeme123456'];

const prisma = new PrismaClient();

function prompt(question: string, mask = false): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
  });

  if (mask) {
    const internal = rl as unknown as {
      _writeToOutput: (text: string) => void;
      output: NodeJS.WritableStream;
    };
    internal._writeToOutput = (text: string) => {
      internal.output.write(text.includes(question) ? question : '*');
    };
  }

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      if (mask) process.stdout.write('\n');
      resolve(answer.trim());
    });
  });
}

function argValue(name: string): string | undefined {
  const prefix = `--${name}=`;
  const withEquals = process.argv.find((a) => a.startsWith(prefix));
  if (withEquals) return withEquals.slice(prefix.length);
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main() {
  const email =
    argValue('email') ||
    (await prompt('要變更的帳號 Email（預設 admin@church.local）：')) ||
    'admin@church.local';

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new Error(`找不到帳號：${email}`);
  }

  console.log(`帳號：${user.email}（${user.displayName}／${user.role}）`);

  let password = process.env.NEW_PASSWORD ?? '';
  if (!password) {
    password = await prompt(`新密碼（至少 ${MIN_LENGTH} 個字）：`, true);
    const again = await prompt('再輸入一次新密碼：', true);
    if (password !== again) throw new Error('兩次輸入的密碼不一致');
  }

  if (password.length < MIN_LENGTH) {
    throw new Error(`密碼太短，至少要 ${MIN_LENGTH} 個字`);
  }
  if (WEAK.includes(password)) {
    throw new Error('這是文件中的預設密碼，請換一組只有你知道的密碼');
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(password, 12) },
  });

  const revoked = await prisma.refreshToken.updateMany({
    where: { userId: user.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  console.log('密碼已更新。');
  console.log(`已失效的登入工作階段：${revoked.count}`);
}

main()
  .catch((e: unknown) => {
    console.error(`\n失敗：${e instanceof Error ? e.message : String(e)}`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
