import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <h1 className="text-4xl font-bold text-blue-700 mb-4">UniAsset</h1>
      <p className="text-gray-600 mb-8 text-center text-lg">
        교내 PC 및 모니터 재물조사 시스템
      </p>
      
      <Link 
        href="/scanner" 
        className="px-8 py-4 bg-blue-600 text-white text-lg font-bold rounded-xl shadow-lg hover:bg-blue-700 transition"
      >
        재물조사 스캐너 열기
      </Link>
    </div>
  );
}