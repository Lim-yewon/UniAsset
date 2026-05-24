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

    // 1. Supabase Auth 로그인 시도
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
      // 2. 권한 식별 로직 (교직원 -> 교수 -> 학생 순으로 검색)
      
      // [교직원 확인]
      const { data: staffData } = await supabase.from('Staff').select('dept_id').eq('user_uuid', userId).single();
      if (staffData) {
        router.push('/admin'); // 교직원은 관리자 페이지로 이동 (RLS에 의해 본인 학과만 보임)
        return;
      }

      // [교수 확인]
      const { data: profData } = await supabase.from('Professor').select('dept_id').eq('user_uuid', userId).single();
      if (profData) {
        router.push('/admin'); // 교수도 관리자 페이지로 이동 (RLS 적용됨)
        return;
      }

      // [학생 확인 (일반 vs 근로학생)]
      const { data: studentData } = await supabase.from('student').select('is_work_study').eq('user_uuid', userId).single();
      if (studentData) {
        if (studentData.is_work_study) {
          router.push('/admin'); // 근로학생은 관리자 페이지 접근 허용
        } else {
          router.push('/student'); // 일반 학생은 대여 신청/조회만 가능한 학생 전용 페이지로 이동
        }
        return;
      }

      // 아무 정보도 없는 경우
      setErrorMsg('등록된 권한 정보가 없습니다. 관리자에게 문의하세요.');
      await supabase.auth.signOut();

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