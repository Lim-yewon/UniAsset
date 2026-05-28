'use client';

import './globals.css';
import Link from 'next/link';
import { useState } from 'react';
import { usePathname } from 'next/navigation';

type Role = 'student' | 'worker' | 'admin';

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<Role>('admin');

  return (
    <html lang="ko">
      <body className="bg-slate-100 min-h-screen flex flex-col md:flex-row antialiased">
        <nav className="bg-slate-900 text-white w-full md:w-60 shrink-0 flex flex-col shadow-2xl z-50 md:min-h-screen">
          {/* Logo */}
          <div className="px-5 py-5 border-b border-slate-700/60">
            <div className="text-xl font-black tracking-tight text-white">
              Uni<span className="text-sky-400">Asset</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 font-medium">대학 통합 자산 관리 시스템</p>
          </div>

          {/* Role Switcher */}
          <div className="px-3 py-3 border-b border-slate-700/60 bg-slate-800/40">
            <p className="text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest px-1">
              뷰 모드 (테스트용)
            </p>
            <div className="grid grid-cols-3 gap-1 bg-slate-950/40 p-1 rounded-lg">
              {(['student', 'worker', 'admin'] as Role[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  className={`py-1.5 text-[11px] font-bold rounded-md transition-all ${
                    role === r
                      ? r === 'student'
                        ? 'bg-sky-500 text-white'
                        : r === 'worker'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-purple-500 text-white'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {r === 'student' ? '학생' : r === 'worker' ? '근로생' : '교직원'}
                </button>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
            <p className="text-[10px] font-bold text-slate-600 px-3 pb-2 uppercase tracking-widest">
              서비스
            </p>
            <NavLink href="/" emoji="🏠" label="홈 대시보드" />

            {(role === 'student' || role === 'worker') && (
              <>
                <NavLink href="/rentals" emoji="📦" label="기자재 대여/반납" />
                <NavLink href="/fault-report" emoji="🚨" label="고장 신고" color="text-red-400" />
              </>
            )}

            {(role === 'worker' || role === 'admin') && (
              <>
                <div className="pt-3 pb-1.5">
                  <p className="text-[10px] font-bold text-slate-600 px-3 uppercase tracking-widest">
                    근로 공간
                  </p>
                </div>
                <NavLink href="/scanner" emoji="📷" label="재물조사 스캐너" color="text-emerald-400" />
              </>
            )}

            {role === 'admin' && (
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

          {/* Footer */}
          <div className="px-3 py-3 border-t border-slate-700/60">
            <div
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold border ${
                role === 'admin'
                  ? 'bg-purple-500/10 text-purple-300 border-purple-500/20'
                  : role === 'worker'
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                  : 'bg-sky-500/10 text-sky-300 border-sky-500/20'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-current opacity-80 shrink-0" />
              {role === 'admin' ? '관리자 (Staff)' : role === 'worker' ? '근로장학생' : '일반 학생'}
            </div>
          </div>
        </nav>

        <main className="flex-1 min-h-screen overflow-y-auto bg-slate-50">
          <div className="p-4 md:p-8">{children}</div>
        </main>
      </body>
    </html>
  );
}
