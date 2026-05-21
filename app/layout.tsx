import './globals.css';
import Link from 'next/link';

export const metadata = {
  title: 'UniAsset - 교내 자산 관리 시스템',
  description: 'IT 기자재 재물조사 솔루션',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="bg-gray-100 min-h-screen flex flex-col md:flex-row">
        {/* 네비게이션 사이드바 */}
        <nav className="bg-blue-900 text-white w-full md:w-64 p-6 space-y-6 shadow-xl z-50">
          <div className="text-2xl font-bold tracking-tighter border-b border-blue-800 pb-4">
            UniAsset 🖥️
          </div>
          <div className="flex flex-col space-y-2">
            <Link href="/" className="hover:bg-blue-800 p-3 rounded-lg transition flex items-center gap-3">
              🏠 홈 대시보드
            </Link>
            <Link href="/scanner" className="hover:bg-blue-800 p-3 rounded-lg transition flex items-center gap-3">
              📷 바코드 스캐너
            </Link>
            <Link href="/admin" className="hover:bg-blue-800 p-3 rounded-lg transition flex items-center gap-3">
              📊 자산 관리 대장
            </Link>
          </div>
          <div className="pt-10 text-xs text-blue-300 opacity-50">
            © 2026 UniAsset Project<br/>Admin System v1.0
          </div>
        </nav>

        {/* 메인 콘텐츠 영역 */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          {children}
        </main>
      </body>
    </html>
  );
}