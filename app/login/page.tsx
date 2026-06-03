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

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      setErrorMsg('이메일 또는 비밀번호가 올바르지 않습니다.');
      setLoading(false);
      return;
    }

    try {
      const { data: userData } = await supabase
        .from('User')
        .select('user_id, role')
        .eq('user_uuid', authData.user.id)
        .maybeSingle();

      if (!userData) {
        setErrorMsg('등록된 사용자 정보가 없습니다. 관리자에게 문의하세요.');
        await supabase.auth.signOut();
        return;
      }

      if (userData.role === 'STAFF' || userData.role === 'PROFESSOR') {
        router.push('/admin');
      } else if (userData.role === 'STUDENT') {
        const { data: studentData } = await supabase
          .from('student')
          .select('is_work_study')
          .eq('user_id', userData.user_id)
          .maybeSingle();

        router.push('/rentals');
      }
    } catch {
      setErrorMsg('권한 확인 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <img src="/logo.png" alt="UniAssets" className="h-24 w-auto object-contain" />
          </div>
          <p className="text-slate-500 mt-1 text-sm">학교 계정으로 로그인하세요.</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">이메일</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition text-sm"
                placeholder="example@hs.ac.kr"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition text-sm"
                placeholder="••••••••"
                required
              />
            </div>

            {errorMsg && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
                <span>⚠️</span>
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-sky-600 text-white font-bold rounded-xl hover:bg-sky-700 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  로그인 중...
                </span>
              ) : (
                '로그인'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          로그인 문제가 있다면 관리자에게 문의하세요.
        </p>
      </div>
    </div>
  );
}
