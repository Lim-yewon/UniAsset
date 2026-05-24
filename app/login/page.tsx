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

  // 1. Supabase Auth 로그인
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
    // 2. 구조에 맞춘 권한 식별 로직 (존재 여부만 확인)
    
    // [교직원 확인] - Staff 테이블에 해당 user_uuid를 가진 행이 있는지 확인
    const { data: staffData } = await supabase
      .from('Staff')
      .select('staff_id')
      .eq('user_uuid', userId)
      .maybeSingle(); // single() 대신 maybeSingle()을 쓰면 데이터가 없을 때 에러를 뿜지 않고 null을 반환합니다.

    if (staffData) {
      router.push('/admin'); // 교직원 관리자 페이지로 이동
      return;
    }

    // [교수 확인] - Professor 테이블에 해당 user_uuid가 있는지 확인
    const { data: profData } = await supabase
      .from('Professor')
      .select('prof_id')
      .eq('user_uuid', userId)
      .maybeSingle();

    if (profData) {
      router.push('/admin'); // 교수도 관리자 페이지로 이동
      return;
    }

    // [학생 확인] - student 테이블 확인
    const { data: studentData } = await supabase
      .from('student')
      .select('is_work_study')
      .eq('user_uuid', userId)
      .maybeSingle();

    if (studentData) {
      if (studentData.is_work_study) {
        router.push('/admin'); // 근로학생은 관리자 페이지 접근
      } else {
        router.push('/student'); // 일반학생 페이지 이동
      }
      return;
    }

    // 어떤 테이블에도 유저 정보가 매핑되어 있지 않은 경우
    setErrorMsg('등록된 사용자 정보가 없습니다. 학과 사무실에 문의하세요.');
    await supabase.auth.signOut();

  } catch (err) {
    setErrorMsg('권한을 확인하는 중 시스템 오류가 발생했습니다.');
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