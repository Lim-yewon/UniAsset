'use client';

import './globals.css';
import Link from 'next/link';
import { useState } from 'react';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // 프로토타입용 권한 스위처: 'student' | 'worker' | 'admin'
  const [role, setRole] = useState<'student' | 'worker' | 'admin'>('admin');

  return (
    <html lang="ko">
      <body className="bg-gray-50 min-h-screen flex flex-col md:flex-row font-sans">
        
        {/* 네비게이션 사이드바 */}
        <nav className="bg-[#0f172a] text-white w-full md:w-72 p-6 flex flex-col shadow-2xl z-50">
          <div className="text-3xl font-bold tracking-tighter border-b border-gray-700 pb-6 mb-6 text-sky-400">
            UniAsset <span className="text-xl">🎓</span>
          </div>

          {/* 🌟 역할(Role) 선택 토글 (프로토타입 테스트용) */}
          <div className="bg-gray-800 p-2 rounded-xl mb-8 flex flex-col gap-2 border border-gray-600">
            <p className="text-xs text-gray-400 font-bold px-2">👁️ 뷰 모드 전환 (테스트용)</p>
            <div className="flex gap-1">
              <button onClick={() => setRole('student')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${role === 'student' ? 'bg-sky-500 text-white' : 'text-gray-400 hover:bg-gray-700'}`}>
                일반학생
              </button>
              <button onClick={() => setRole('worker')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${role === 'worker' ? 'bg-green-500 text-white' : 'text-gray-400 hover:bg-gray-700'}`}>
                근로장학생
              </button>
              <button onClick={() => setRole('admin')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${role === 'admin' ? 'bg-purple-500 text-white' : 'text-gray-400 hover:bg-gray-700'}`}>
                교직원
              </button>
            </div>
          </div>

          {/* 메뉴 리스트 */}
          <div className="flex flex-col space-y-2 flex-grow">
            {/* 1. 모두에게 보이는 공통 메뉴 */}
            <p className="text-xs font-bold text-gray-500 mt-4 mb-2">SERVICE</p>
            <Link href="/" className="hover:bg-gray-800 p-3 rounded-lg transition flex items-center gap-3">
              🏠 홈 대시보드
            </Link>

            {/* 2. 일반 학생 / 근로장학생 메뉴 */}
            {(role === 'student' || role === 'worker') && (
              <>
                <Link href="/rentals" className="hover:bg-gray-800 p-3 rounded-lg transition flex items-center gap-3">
                  📦 기자재 대여/반납
                </Link>
                <Link href="/fault-report" className="hover:bg-gray-800 p-3 rounded-lg transition flex items-center gap-3 text-red-400">
                  🚨 고장 신고
                </Link>
              </>
            )}

            {/* 3. 근로장학생 (근로여부 O) 이상 메뉴 */}
            {(role === 'worker' || role === 'admin') && (
              <>
                <p className="text-xs font-bold text-gray-500 mt-6 mb-2">WORK SPACE</p>
                <Link href="/scanner" className="hover:bg-gray-800 p-3 rounded-lg transition flex items-center gap-3 text-green-400 font-bold bg-gray-800/50">
                  📷 재물조사 스캐너
                </Link>
              </>
            )}

            {/* 4. 관리자 (교직원) 전용 메뉴 */}
            {role === 'admin' && (
              <>
                <p className="text-xs font-bold text-gray-500 mt-6 mb-2">ADMINISTRATION</p>
                <Link href="/register" className="hover:bg-gray-800 p-3 rounded-lg transition flex items-center gap-3 text-sky-400">
  ➕ 신규 기자재 등록
</Link>
                <Link href="/admin" className="hover:bg-gray-800 p-3 rounded-lg transition flex items-center gap-3 text-purple-400">
                  📊 전체 자산 관리 대장
                </Link>
                <Link href="/auth-manage" className="hover:bg-gray-800 p-3 rounded-lg transition flex items-center gap-3 text-purple-400">
                  🔑 권한 및 근로 배정
                </Link>
              </>
            )}
          </div>
          
          <div className="pt-6 text-xs text-gray-500 border-t border-gray-700 mt-4">
            로그인 됨: {role === 'admin' ? '관리자(Staff)' : role === 'worker' ? '근로장학생' : '일반학생'}
          </div>
        </nav>

        {/* 메인 콘텐츠 영역 */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto bg-gray-100 shadow-inner">
          {children}
        </main>
      </body>
    </html>
  );
}