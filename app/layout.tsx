'use client';

import './globals.css';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '../lib/AuthContext';

function NavLink({
  href,
  label,
  color = 'text-slate-300',
  emoji,
  onClick,
}: {
  href: string;
  label: string;
  color?: string;
  emoji?: string;
  onClick?: () => void;
}) {
  const pathname = usePathname();
  const active = pathname === href;
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
        active
          ? 'bg-sky-500/15 text-sky-300 border border-sky-500/20 font-semibold'
          : `${color} font-medium hover:bg-slate-700/50 hover:text-white`
      }`}
    >
      {emoji ? (
        <span className="w-5 text-center shrink-0">{emoji}</span>
      ) : (
        <span className="w-1 shrink-0" />
      )}
      <span className="flex-1">{label}</span>
      {active && <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0" />}
    </Link>
  );
}

function Sidebar() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user]);

  if (loading) {
    return (
      <>
        <div className="md:hidden sticky top-0 bg-slate-900 h-14 flex items-center px-4 z-50">
          <div className="w-6 h-6 border-2 border-slate-700 border-t-slate-400 rounded-full animate-spin" />
        </div>
        <nav className="hidden md:flex bg-slate-900 w-60 shrink-0 items-center justify-center min-h-screen">
          <div className="w-6 h-6 border-2 border-slate-700 border-t-slate-400 rounded-full animate-spin" />
        </nav>
      </>
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
    ? user.role === 'PROFESSOR' ? '교수' : '교직원'
    : isWorker ? '근로장학생' : '일반 학생';

  const NavContent = ({ onClose }: { onClose?: () => void }) => (
    <>
      <div className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="text-[10px] font-bold text-slate-600 px-3 pb-2 uppercase tracking-widest">
          서비스
        </p>
        {isAdmin && <NavLink href="/" label="홈 대시보드" onClick={onClose} />}
        {!isAdmin && (
          <>
            <NavLink href="/rentals" label="기자재 대여/반납" onClick={onClose} />
            <NavLink href="/fault-report" label="고장 신고" color="text-red-400" onClick={onClose} />
          </>
        )}
        {isWorker && (
          <>
            <div className="pt-3 pb-1.5">
              <p className="text-[10px] font-bold text-slate-600 px-3 uppercase tracking-widest">
                근로 공간
              </p>
            </div>
            <NavLink href="/scanner" label="재물조사 스캐너" color="text-emerald-400" onClick={onClose} />
          </>
        )}
        {isAdmin && (
          <>
            <div className="pt-3 pb-1.5">
              <p className="text-[10px] font-bold text-slate-600 px-3 uppercase tracking-widest">
                관리
              </p>
            </div>
            <NavLink href="/register" emoji="➕" label="신규 기자재 등록" color="text-sky-400" onClick={onClose} />
            <NavLink href="/admin" label="자산 관리 대장" color="text-violet-400" onClick={onClose} />
            <NavLink href="/admin/faults" label="고장 신고 관리" color="text-red-400" onClick={onClose} />
            <NavLink href="/auth-manage" label="권한 및 근로 배정" color="text-amber-400" onClick={onClose} />
          </>
        )}
      </div>
      <div className="px-3 py-3 border-t border-slate-700/60 space-y-1.5">
        <div className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold border ${roleBadgeStyle}`}>
          <span className="w-2 h-2 rounded-full bg-current opacity-80 shrink-0" />
          <span className="flex-1 truncate">{user.name} · {roleLabel}</span>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-800 hover:text-red-400 transition"
        >
          <span>↪</span>
          <span>로그아웃</span>
        </button>
      </div>
    </>
  );

  // 다크 배경(사이드바)용: 흰색 반전 필터 적용
  const DarkLogo = ({ cls }: { cls: string }) => (
    <img
      src="/logo.png"
      alt="UniAssets"
      className={`${cls} w-auto object-contain`}
      style={{ filter: 'brightness(0) invert(1)' }}
    />
  );

  return (
    <>
      {/* ── 모바일 상단 바 ── */}
      <div className="md:hidden sticky top-0 bg-slate-900 text-white flex items-center justify-between px-4 py-2.5 shadow-lg z-50">
        <DarkLogo cls="h-10" />
  <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-xl hover:bg-slate-700 transition text-slate-300"
          aria-label="메뉴 열기"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* ── 모바일 드로어 ── */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative w-64 bg-slate-900 flex flex-col shadow-2xl">
            <div className="px-4 py-3 border-b border-slate-700/60 flex items-center justify-between">
              <DarkLogo cls="h-10" />
              <button
                onClick={() => setMobileOpen(false)}
                className="p-2 rounded-xl hover:bg-slate-700 transition text-slate-400"
                aria-label="메뉴 닫기"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <NavContent onClose={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      {/* ── 데스크탑 사이드바 ── */}
      <nav className="hidden md:flex bg-slate-900 text-white w-60 shrink-0 flex-col shadow-2xl z-50 min-h-screen">
        <div className="px-5 py-5 border-b border-slate-700/60 flex items-center justify-center">
          <DarkLogo cls="h-14" />
        </div>
        <NavContent />
      </nav>
    </>
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
      <main className="flex-1 bg-slate-50">
        <div className="p-4 md:p-8">{children}</div>
      </main>
    </div>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0f172a" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="UniAssets" />
        <link rel="apple-touch-icon" href="/logo.png" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
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
