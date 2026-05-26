'use client';

import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);
  setErrorMsg('');

  // 1. Supabase Auth 인증
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError || !authData.user) {
    setErrorMsg('로그인 실패: 이메일이나 비밀번호를 확인해주세요.');
    setLoading(false);
    return;
  }

  const userId = authData.user.id;

  try {
    // 2. 통합 User 테이블에서 내 권한(role) 단번 조회
    const { data: userData } = await supabase
      .from('User') // 🌟 대문자 주의
      .select('user_id, role')
      .eq('user_uuid', userId)
      .maybeSingle();

    if (!userData) {
      setErrorMsg('등록된 통합 사용자 정보가 없습니다. 관리자에게 문의하세요.');
      await supabase.auth.signOut();
      return;
    }

    // 3. 역할에 따른 화면 분기
    if (userData.role === 'STAFF' || userData.role === 'PROFESSOR') {
      router.push('/admin'); // 교직원 및 교수는 관리자 대시보드로 직행
      
    } else if (userData.role === 'STUDENT') {
      // 학생인 경우, 자식 테이블(student)에서 근로여부 추가 확인
      const { data: studentData } = await supabase
        .from('student') // 🌟 소문자
        .select('is_work_study')
        .eq('user_id', userData.user_id)
        .maybeSingle();

      if (studentData?.is_work_study) {
        router.push('/admin'); // 근로학생은 관리자 뷰 접근
      } else {
        router.push('/student'); // 일반 학생은 대여 전용 뷰
      }
    }
  } catch (err) {
    setErrorMsg('권한 확인 중 오류가 발생했습니다.');
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black text-gray-800">통합 자산관리 시스템</h1>
          <p className="text-gray-500 mt-2 text-sm">학교 계정으로 로그인해주세요.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">이메일</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:border-blue-500 transition"
              placeholder="example@hs.ac.kr"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">비밀번호</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:border-blue-500 transition"
              placeholder="••••••••"
              required
            />
          </div>

          {errorMsg && <p className="text-red-500 text-sm font-bold">{errorMsg}</p>}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition disabled:bg-blue-300 mt-4"
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>
      </div>
    </div>
  );
}