import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import {
  ArticleCategory,
  PushAudience,
  Role,
} from '../src/common/enums';

const prisma = new PrismaClient();

/** Phase 1 MVP 種子：管理員、牧區小組、佳文、公告 */
async function main() {
  const adminEmail = 'admin@church.local';
  // 密碼優先取環境變數；未設定時用開發預設值，但會提醒改掉（勿用於對外環境）
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe123456';
  if (!process.env.SEED_ADMIN_PASSWORD) {
    console.warn(
      '[警告] 使用開發預設管理員密碼。API 對外開放前請執行：npm run set-password',
    );
  }
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash: await bcrypt.hash(adminPassword, 12),
      displayName: '系統管理員',
      role: Role.ADMIN,
      consentAt: new Date(),
    },
  });

  let area = await prisma.pastoralArea.findFirst({
    where: { name: '成二牧區' },
  });
  if (!area) {
    const legacy = await prisma.pastoralArea.findFirst({
      where: { name: '恩典牧區' },
    });
    if (legacy) {
      area = await prisma.pastoralArea.update({
        where: { id: legacy.id },
        data: {
          name: '成二牧區',
          description: '成二牧區：歡迎新朋友認識小組生活，一起成為屬靈家庭。',
        },
      });
    }
  }
  if (!area) {
    area = await prisma.pastoralArea.create({
      data: {
        name: '成二牧區',
        description: '成二牧區示範：歡迎新朋友認識小組生活，一起成為屬靈家庭。',
        groups: {
          create: [
            {
              name: '活水小組',
              intro: '注重重讀經與彼此代禱，適合渴望扎根的弟兄姊妹。',
              meetingTime: '週三 19:30',
              meetingPlace: '副堂',
            },
            {
              name: '嗎哪小組',
              intro: '以生活分享與關懷為主，歡迎家庭與青年一同參與。',
              meetingTime: '週五 20:00',
              meetingPlace: '101 室',
            },
          ],
        },
      },
    });
  }

  const articles = [
    {
      slug: 'daily-bread-psalm-23',
      title: '每日靈糧：詩篇二十三篇',
      category: ArticleCategory.DAILY_BREAD,
      body:
        '「耶和華是我的牧者，我必不致缺乏。」\n\n' +
        '今天思想：神在生命的高山與低谷都與我們同行。' +
        '試著在晨禱中寫下你此刻最需要主帶領的一件事。',
    },
    {
      slug: 'pastor-column-welcome',
      title: '牧者專欄：歡迎來到教會家庭',
      category: ArticleCategory.PASTOR_COLUMN,
      body:
        '親愛的弟兄姊妹，歡迎你透過 App 與我們同行。\n\n' +
        '無論你是初訪或久未見面，都歡迎加入小組、參與主日崇拜。' +
        '若有需要代禱或關懷，請透過代禱牆或聯繫牧區同工。',
    },
    {
      slug: 'testimony-new-life',
      title: '見證分享：在小組中經歷新生活',
      category: ArticleCategory.TESTIMONY,
      body:
        '加入小組後，我學會在生活中實踐信仰，也找到可以彼此守望的同伴。\n\n' +
        '邀請你勇敢踏出一步，認識一位新朋友。',
    },
  ];

  for (const a of articles) {
    await prisma.article.upsert({
      where: { slug: a.slug },
      update: {
        title: a.title,
        body: a.body,
        category: a.category,
        isPublished: true,
        publishedAt: new Date(),
      },
      create: {
        ...a,
        authorId: admin.id,
        isPublished: true,
        publishedAt: new Date(),
      },
    });
  }

  const existingAnn = await prisma.announcement.findFirst({
    where: { title: '歡迎使用教會 APP（MVP）' },
  });
  if (!existingAnn) {
    await prisma.announcement.create({
      data: {
        title: '歡迎使用教會 APP（MVP）',
        body:
          '第一階段功能已上線：主日崇拜、靈修佳文、牧區小組介紹、最新公告。' +
          '請多加使用，並將意見告訴同工。',
        audience: PushAudience.ALL,
        isPublished: true,
        publishedAt: new Date(),
        pushSentAt: new Date(),
        createdBy: admin.id,
      },
    });
  }

  const existingAnn2 = await prisma.announcement.findFirst({
    where: { title: '本週主日崇拜提醒' },
  });
  if (!existingAnn2) {
    await prisma.announcement.create({
      data: {
        title: '本週主日崇拜提醒',
        body: '主日上午 10:00 敬拜，歡迎準時參加。無法到場者可於 App 觀看 YouTube 直播／回放。',
        audience: PushAudience.ALL,
        isPublished: true,
        publishedAt: new Date(),
        createdBy: admin.id,
      },
    });
  }

  // ── Phase 3：示範活動 + 管理員加入小組（小組代禱／分眾用）──
  const group = await prisma.smallGroup.findFirst({
    where: { pastoralAreaId: area.id },
    orderBy: { name: 'asc' },
  });
  if (group) {
    await prisma.groupMember.upsert({
      where: {
        groupId_userId: { groupId: group.id, userId: admin.id },
      },
      update: {},
      create: { groupId: group.id, userId: admin.id },
    });
  }

  const eventTitle = '青年聚會（階段三示範）';
  let demoEvent = await prisma.event.findFirst({ where: { title: eventTitle } });
  if (!demoEvent) {
    const start = new Date();
    start.setDate(start.getDate() + 10);
    start.setHours(19, 30, 0, 0);
    demoEvent = await prisma.event.create({
      data: {
        title: eventTitle,
        description: '示範活動：報名後可用動態 QR 簽到。',
        location: '副堂',
        startAt: start,
        capacity: 50,
        createdBy: admin.id,
      },
    });
  }

  const privatePrayer = await prisma.prayerRequest.findFirst({
    where: { content: '為教會全家代禱（種子私人）' },
  });
  if (!privatePrayer) {
    await prisma.prayerRequest.create({
      data: {
        authorId: admin.id,
        content: '為教會全家代禱（種子私人）',
        visibility: 'PRIVATE',
        isAnonymous: false,
        moderationStatus: 'APPROVED',
        sensitiveCategory: 'NONE',
      },
    });
  }

  console.log('Seed 完成（含 Phase 3 示範）：', {
    admin: admin.email,
    area: area.name,
    articles: articles.length,
    event: demoEvent.title,
    group: group?.name,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
