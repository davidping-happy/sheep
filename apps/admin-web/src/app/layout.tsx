import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: '成二牧區 管理後台',
  description: '同工上稿・小組管理・活動報名・審核・推播',
};

const NAV = [
  { href: '/', label: '總覽' },
  { href: '/livestream', label: '主日崇拜' },
  { href: '/articles', label: '靈修佳文 (CMS)' },
  { href: '/groups', label: '牧區・小組' },
  { href: '/announcements', label: '公告推播' },
  { href: '/events', label: '活動報名簽到' },
  { href: '/prayer', label: '代禱牆審核' },
  { href: '/audit', label: '稽核紀錄' },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-Hant">
      <body>
        <div className="layout">
          <aside className="sidebar">
            <h1 className="brand">成二牧區</h1>
            <p className="brand-sub">管理後台 · 屬靈家庭</p>
            <nav>
              {NAV.map((item) => (
                <Link key={item.href} href={item.href}>
                  {item.label}
                </Link>
              ))}
            </nav>
          </aside>
          <main className="content">{children}</main>
        </div>
      </body>
    </html>
  );
}
