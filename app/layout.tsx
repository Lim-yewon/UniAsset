'use client';

import './globals.css';
import Link from 'next/link';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '../lib/AuthContext';

function NavLink({
  href,
  emoji,
  label,
  color = 'text-slate-300',
}: {
  href: string;
  emoji: string;
  label: string;
  color?: string;
}) {
  const pathname = usePathname();
  const active = pathname === href;
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
        active
          ? 'bg-sky-500/15 text-sky-300 border border-sky-500/20 font-semibold'
          : `${color} font-medium hover:bg-slate-700/50 hover:text-white`
      }`}
    >
      <span className="w-5 text-center">{emoji}</span>
      <span className="flex-1">{label}</span>
      {active && <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0" />}
    </Link>
  );
}

function Sidebar() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user]);

  if (loading) {
    return (
      <nav className="bg-slate-900 w-full md:w-60 shrink-0 flex items-center justify-center md:min-h-screen">
        <div className="w-6 h-6 border-2 border-slate-700 border-t-slate-400 rounded-full animate-spin" />
      </nav>
    );
  }

  if (!user) return null;

  const isAdmin = user.role === 'STAFF' || user.role === 'PROFESSOR';
  const isWorker = user.role === 'STUDENT' && user.isWorkStudy;

  const roleBadgeStyle = isAdmin
    ? 'bg-purple-500/10 text-purple-300 border-purple-500/20'
    : isWorker
    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
    : 'bg-sky-500/10 text-sky-300 border-sky-500/20';

  const roleLabel = isAdmin
    ? user.role === 'PROFESSOR'
      ? '교수'
      : '교직원'
    : isWorker
    ? '근로장학생'
    : '일반 학생';

  return (
    <nav className="bg-slate-900 text-white w-full md:w-60 shrink-0 flex flex-col shadow-2xl z-50 md:min-h-screen">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-700/60">
        <div className="text-xl font-black tracking-tight text-white">
          Uni<span className="text-sky-400">Asset</span>
        </div>
        <p className="text-[11px] text-slate-500 mt-0.5 font-medium">대학 통합 자산 관리 시스템</p>
      </div>

      {/* Navigation */}
      <div className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="text-[10px] font-bold text-slate-600 px-3 pb-2 uppercase tracking-widest">
          서비스
        </p>

        {isAdmin && <NavLink href="/" emoji="🏠" label="홈 대시보드" />}

        {!isAdmin && (
          <>
            <NavLink href="/rentals" emoji="📦" label="기자재 대여/반납" />
            <NavLink href="/fault-report" emoji="🚨" label="고장 신고" color="text-red-400" />
          </>
        )}

        {isWorker && (
          <>
            <div className="pt-3 pb-1.5">
              <p className="text-[10px] font-bold text-slate-600 px-3 uppercase tracking-widest">
                근로 공간
              </p>
            </div>
            <NavLink href="/scanner" emoji="📷" label="재물조사 스캐너" color="text-emerald-400" />
          </>
        )}

        {isAdmin && (
          <>
            <div className="pt-3 pb-1.5">
              <p className="text-[10px] font-bold text-slate-600 px-3 uppercase tracking-widest">
                관리
              </p>
            </div>
            <NavLink href="/register" emoji="➕" label="신규 기자재 등록" color="text-sky-400" />
            <NavLink href="/admin" emoji="📊" label="자산 관리 대장" color="text-violet-400" />
            <NavLink href="/admin/faults" emoji="🛠️" label="고장 신고 관리" color="text-red-400" />
            <NavLink href="/auth-manage" emoji="🔑" label="권한 및 근로 배정" color="text-amber-400" />
          </>
        )}
      </div>

      {/* Footer: user badge + logout */}
      <div className="px-3 py-3 border-t border-slate-700/60 space-y-1.5">
        <div
          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold border ${roleBadgeStyle}`}
        >
          <span className="w-2 h-2 rounded-full bg-current opacity-80 shrink-0" />
          <span className="flex-1 truncate">
            {user.name} · {roleLabel}
          </span>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-800 hover:text-red-400 transition"
        >
          <span>↪</span>
          <span>로그아웃</span>
        </button>
      </div>
    </nav>
  );
}

function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname === '/login') {
    return <>{children}</>;
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      <Sidebar />
      <main className="flex-1 min-h-screen overflow-y-auto bg-slate-50">
        <div className="p-4 md:p-8">{children}</div>
      </main>
    </div>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-slate-100 antialiased">
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
