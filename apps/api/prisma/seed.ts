import { PrismaClient, Role } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

/** 建立初始管理員與範例牧區/小組，方便本地開發。 */
async function main() {
  const adminEmail = 'admin@church.local';
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash: await argon2.hash('ChangeMe123456'),
      displayName: '系統管理員',
      role: Role.ADMIN,
      consentAt: new Date(),
    },
  });

  const area = await prisma.pastoralArea.create({
    data: {
      name: '恩典牧區',
      description: '範例牧區',
      groups: {
        create: [
          { name: '活水小組', meetingTime: '週三 19:30', meetingPlace: '副堂' },
          { name: '嗎哪小組', meetingTime: '週五 20:00', meetingPlace: '101 室' },
        ],
      },
    },
  });

  console.log('Seed 完成：', { admin: admin.email, area: area.name });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
