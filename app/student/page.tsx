'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase'; // 본인의 supabase 설정 경로에 맞게 수정

export default function StudentPage() {
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">학생 대여 서비스</h1>
          <p className="text-sm text-gray-500 mt-1">기자재 대여 신청 및 현황을 확인하는 공간입니다.</p>
        </div>
        <button 
          onClick={handleLogout}
          className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg font-bold hover:bg-gray-200 transition"
        >
          로그아웃
        </button>
      </div>

      {/* 추후 대여 가능한 기자재 목록과 신청 폼이 들어갈 자리 */}
      <div className="bg-blue-50 p-8 rounded-2xl border border-blue-100 text-center">
        <p className="text-blue-600 font-medium">대여 신청 화면 준비 중...</p>
      </div>
    </div>
  );
}