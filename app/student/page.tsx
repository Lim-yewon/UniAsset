'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function StudentPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/rentals');
  }, [router]);

  return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin" />
        <p className="text-sm text-slate-400 font-medium">이동 중...</p>
      </div>
    </div>
  );
}
