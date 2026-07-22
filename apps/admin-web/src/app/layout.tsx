import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: '教會 APP 管理後台',
  description: '同工上稿・小組管理・活動報名・審核・推播',
};

const NAV = [
  { href: '/', label: '總覽' },
  { href: '/articles', label: '靈修佳文 (CMS)' },
  { href: '/groups', label: '牧區・小組' },
  { href: '/events', label: '活動報名簽到' },
  { href: '/prayer', label: '代禱牆審核' },
  { href: '/announcements', label: '公告推播' },
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
            <h1 className="brand">教會 APP 後台</h1>
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
