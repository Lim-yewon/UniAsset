'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

import Link from 'next/link';

export default function HomePage() {
  const [stats, setStats] = useState({ total: 0, checked: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      const { data } = await supabase.from('assets').select('status');
      if (data) {
        setStats({
          total: data.length,
          checked: data.filter(a => a.status === '점검완료').length
        });
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-gray-800">환영합니다! 👋</h1>
        <p className="text-gray-500">오늘의 재물조사 현황을 확인하세요.</p>
      </header>

      {/* 요약 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
          <p className="text-sm font-semibold text-gray-400 uppercase">전체 관리 자산</p>
          <p className="text-5xl font-bold text-blue-600 mt-2">{stats.total} <span className="text-lg text-gray-400">대</span></p>
        </div>
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
          <p className="text-sm font-semibold text-gray-400 uppercase">점검 완료</p>
          <p className="text-5xl font-bold text-green-500 mt-2">{stats.checked} <span className="text-lg text-gray-400">대</span></p>
        </div>
      </div>

      {/* 퀵 액션 버튼 */}
      <div className="bg-blue-600 p-8 rounded-2xl shadow-lg text-white flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-bold">지금 바로 스캔을 시작할까요?</h2>
          <p className="opacity-80">카메라를 통해 바코드를 즉시 인식합니다.</p>
        </div>
        <Link href="/scanner" className="bg-white text-blue-600 px-8 py-4 rounded-xl font-bold hover:bg-gray-100 transition">
          스캐너 열기 📷
        </Link>
      </div>
    </div>
  );
}