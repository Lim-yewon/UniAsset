'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../lib/AuthContext';

// ── 유틸 ─────────────────────────────────────────────────────
const ageYears = (introDate: string | null) => {
  if (!introDate) return null;
  return (Date.now() - new Date(introDate).getTime()) / (365.25 * 86400000);
};

const AGING_LEVEL = (yrs: number | null) => {
  if (yrs === null) return null;
  if (yrs >= 5) return 'danger';
  if (yrs >= 3) return 'warning';
  return 'ok';
};

const BAR_COLORS = [
  'bg-sky-500', 'bg-violet-500', 'bg-emerald-500', 'bg-amber-500',
  'bg-rose-500', 'bg-teal-500', 'bg-orange-500', 'bg-indigo-500',
];

// ── 컴포넌트 ─────────────────────────────────────────────────
function HBar({ label, value, max, color, suffix = '건' }: { label: string; value: number; max: number; color: string; suffix?: string }) {
  const pct = max === 0 ? 0 : Math.round((value / max) * 100);
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-slate-600 w-28 shrink-0 truncate">{label}</span>
      <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
        <div className={`${color} h-full rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm font-bold text-slate-700 w-12 text-right shrink-0">{value}{suffix}</span>
    </div>
  );
}

export default function StatsPage() {
  const { user } = useAuth();
  const [assets,  setAssets]  = useState<any[]>([]);
  const [rentals, setRentals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const [{ data: assetData }, { data: rentalData }] = await Promise.all([
        supabase.from('assets').select('asset_id, model_name, barcode, department, category, status, is_rentable, intro_date, owning_major_id'),
        supabase.from('rentals').select('rental_id, status, rental_date, return_date, due_date, asset_id, user_id, assets(model_name, barcode, department, category), User(name)'),
      ]);
      setAssets(assetData || []);
      setRentals(rentalData || []);
      setLoading(false);
    };
    fetch();
  }, []);

  // ── 통계 계산 ────────────────────────────────────────────────

  // 전체 대여 (신청포함)
  const allRentals    = rentals;
  const completedOrActive = rentals.filter(r => ['대여중','반납신청','반납완료'].includes(r.status));

  // 이번 달 대여 신청 건수
  const thisMonth = useMemo(() => {
    const m = new Date().toISOString().slice(0, 7);
    return rentals.filter(r => r.rental_date?.startsWith(m)).length;
  }, [rentals]);

  // 연체
  const today   = new Date().toISOString().split('T')[0];
  const overdue = rentals.filter(r => r.status === '대여중' && r.due_date && r.due_date < today).length;

  // 노후화 (3년 이상)
  const agingAssets = useMemo(() => assets.filter(a => {
    const lvl = AGING_LEVEL(ageYears(a.intro_date));
    return lvl === 'warning' || lvl === 'danger';
  }), [assets]);

  // 학과별 대여 건수
  const byDept = useMemo(() => {
    const map: Record<string, number> = {};
    completedOrActive.forEach(r => {
      const d = (r.assets as any)?.department || '미지정';
      map[d] = (map[d] || 0) + 1;
    });
    return Object.entries(map).sort(([, a], [, b]) => b - a);
  }, [completedOrActive]);

  // 카테고리별 자산 수
  const byCat = useMemo(() => {
    const map: Record<string, number> = {};
    assets.filter(a => a.is_rentable).forEach(a => {
      const c = a.category || '기타';
      map[c] = (map[c] || 0) + 1;
    });
    return Object.entries(map).sort(([, a], [, b]) => b - a);
  }, [assets]);

  // 상태별 자산 수
  const byStatus = useMemo(() => {
    const map: Record<string, number> = {};
    assets.forEach(a => { map[a.status] = (map[a.status] || 0) + 1; });
    return Object.entries(map).sort(([, a], [, b]) => b - a);
  }, [assets]);

  // Top 10 많이 빌린 기자재
  const topBorrowed = useMemo(() => {
    const map: Record<string, { name: string; count: number }> = {};
    completedOrActive.forEach(r => {
      const id   = r.asset_id;
      const name = (r.assets as any)?.model_name || id;
      if (!map[id]) map[id] = { name, count: 0 };
      map[id].count++;
    });
    return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 10);
  }, [completedOrActive]);

  // 월별 대여 추이 (최근 6개월)
  const monthlyTrend = useMemo(() => {
    const counts: Record<string, number> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      counts[d.toISOString().slice(0, 7)] = 0;
    }
    rentals.forEach(r => {
      const m = r.rental_date?.slice(0, 7);
      if (m && counts[m] !== undefined) counts[m]++;
    });
    return Object.entries(counts).map(([m, c]) => ({
      label: m.slice(5) + '월',
      count: c,
    }));
  }, [rentals]);

  const maxMonthly = Math.max(...monthlyTrend.map(m => m.count), 1);

  // 노후화 목록
  const agingList = useMemo(() => assets
    .map(a => ({ ...a, age: ageYears(a.intro_date), level: AGING_LEVEL(ageYears(a.intro_date)) }))
    .filter(a => a.level === 'warning' || a.level === 'danger')
    .sort((a, b) => (b.age ?? 0) - (a.age ?? 0)),
  [assets]);

  // ── CSV 내보내기 ─────────────────────────────────────────────
  const exportCSV = useCallback(async () => {
    setExporting(true);
    const { data } = await supabase
      .from('rentals')
      .select('rental_date, return_date, due_date, status, assets(model_name, barcode, department, category), User(name)')
      .order('rental_date', { ascending: false });

    const headers = ['학생명','기자재명','바코드','학과','카테고리','대여 신청일','반납 기한','반납일','상태'];
    const rows = (data || []).map((r: any) => [
      r.User?.name ?? '',
      r.assets?.model_name ?? '',
      r.assets?.barcode ?? '',
      r.assets?.department ?? '',
      r.assets?.category ?? '',
      r.rental_date ? new Date(r.rental_date).toLocaleDateString('ko-KR') : '',
      r.due_date ?? '',
      r.return_date ? new Date(r.return_date).toLocaleDateString('ko-KR') : '',
      r.status,
    ]);

    const csv = [headers, ...rows].map(row => row.map((v: any) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `대여내역_${new Date().toLocaleDateString('ko-KR').replace(/\. /g, '').replace('.', '')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setExporting(false);
  }, []);

  const exportAgingCSV = useCallback(() => {
    const headers = ['기자재명','바코드','학과','카테고리','도입일','경과 연수','노후 등급'];
    const rows = agingList.map((a: any) => [
      a.model_name, a.barcode, a.department ?? '', a.category ?? '',
      a.intro_date ?? '',
      a.age ? a.age.toFixed(1) : '',
      a.level === 'danger' ? '교체 권고' : '노후 주의',
    ]);
    const csv  = [headers, ...rows].map(row => row.map((v: any) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `노후화자산_${new Date().toLocaleDateString('ko-KR').replace(/\. /g, '').replace('.', '')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [agingList]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin" />
        <p className="text-sm text-slate-400 font-medium">통계 데이터를 불러오는 중...</p>
      </div>
    </div>
  );

  const STATUS_STYLE: Record<string, string> = {
    정상:    'bg-emerald-100 text-emerald-700',
    점검완료: 'bg-emerald-100 text-emerald-700',
    수리중:  'bg-sky-100 text-sky-700',
    수리요망: 'bg-amber-100 text-amber-700',
    폐기:    'bg-red-100 text-red-700',
    미점검:  'bg-slate-100 text-slate-500',
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">통계 및 리포트</h1>
          <p className="text-slate-500 text-sm mt-1">기자재 대여 현황, 상태 분포, 노후화 현황을 확인하세요.</p>
        </div>
        <button onClick={exportCSV} disabled={exporting}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition disabled:opacity-50 shadow-sm">
          {exporting
            ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />내보내는 중...</>
            : <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>대여 내역 CSV</>}
        </button>
      </div>

      {/* ── 요약 카드 ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: '전체 대여 건수', value: completedOrActive.length, sub: '대여신청 포함',      color: 'text-sky-700',   bg: 'bg-sky-50 border-sky-100' },
          { label: '이번 달 신청',  value: thisMonth,                sub: new Date().toLocaleDateString('ko-KR',{month:'long'}), color: 'text-violet-700', bg: 'bg-violet-50 border-violet-100' },
          { label: '현재 연체',     value: overdue,                 sub: '반납 기한 초과',        color: 'text-red-700',   bg: 'bg-red-50 border-red-100' },
          { label: '노후화 자산',   value: agingAssets.length,      sub: '3년 이상 경과',         color: 'text-amber-700', bg: 'bg-amber-50 border-amber-100' },
        ].map(c => (
          <div key={c.label} className={`${c.bg} border rounded-2xl p-4 md:p-5`}>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{c.label}</p>
            <p className={`text-3xl font-black mt-1 ${c.color}`}>{c.value}</p>
            <p className="text-xs text-slate-400 mt-1">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* ── 월별 대여 추이 ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 md:p-6">
        <h2 className="text-base font-bold text-slate-800 mb-5">월별 대여 신청 추이 (최근 6개월)</h2>
        <div className="flex items-end justify-between gap-2 h-36">
          {monthlyTrend.map((m, i) => {
            const pct = maxMonthly === 0 ? 0 : Math.round((m.count / maxMonthly) * 100);
            return (
              <div key={m.label} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs font-bold text-slate-600">{m.count}</span>
                <div className="w-full bg-slate-100 rounded-t-lg relative" style={{ height: '100px' }}>
                  <div
                    className={`absolute bottom-0 left-0 right-0 rounded-t-lg transition-all duration-700 ${i === monthlyTrend.length - 1 ? 'bg-sky-500' : 'bg-sky-200'}`}
                    style={{ height: `${pct}%`, minHeight: m.count > 0 ? '4px' : '0' }}
                  />
                </div>
                <span className="text-xs text-slate-400 font-medium">{m.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 학과별 + Top 10 ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 학과별 대여 현황 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 md:p-6">
          <h2 className="text-base font-bold text-slate-800 mb-4">학과별 대여 현황</h2>
          {byDept.length === 0
            ? <p className="text-slate-400 text-sm">데이터 없음</p>
            : <div className="space-y-3">
                {byDept.map(([dept, cnt], i) => (
                  <HBar key={dept} label={dept} value={cnt} max={byDept[0][1]} color={BAR_COLORS[i % BAR_COLORS.length]} />
                ))}
              </div>
          }
        </div>

        {/* Top 10 기자재 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 md:p-6">
          <h2 className="text-base font-bold text-slate-800 mb-4">많이 빌린 기자재 Top 10</h2>
          {topBorrowed.length === 0
            ? <p className="text-slate-400 text-sm">데이터 없음</p>
            : <div className="space-y-3">
                {topBorrowed.map((item, i) => (
                  <div key={item.name} className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black shrink-0 ${i < 3 ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-500'}`}>{i + 1}</span>
                    <HBar label={item.name} value={item.count} max={topBorrowed[0].count} color={i < 3 ? 'bg-sky-500' : 'bg-slate-300'} />
                  </div>
                ))}
              </div>
          }
        </div>
      </div>

      {/* ── 카테고리별 + 상태별 ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 카테고리별 자산 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 md:p-6">
          <h2 className="text-base font-bold text-slate-800 mb-4">카테고리별 대여용 자산</h2>
          {byCat.length === 0
            ? <p className="text-slate-400 text-sm">데이터 없음</p>
            : <div className="space-y-3">
                {byCat.map(([cat, cnt], i) => (
                  <HBar key={cat} label={cat} value={cnt} max={byCat[0][1]} color={BAR_COLORS[i % BAR_COLORS.length]} suffix="개" />
                ))}
              </div>
          }
        </div>

        {/* 상태별 분포 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 md:p-6">
          <h2 className="text-base font-bold text-slate-800 mb-4">전체 자산 상태 분포</h2>
          <div className="space-y-3">
            {byStatus.map(([status, cnt]) => {
              const pct = assets.length === 0 ? 0 : Math.round((cnt / assets.length) * 100);
              return (
                <div key={status} className="flex items-center gap-3">
                  <span className={`shrink-0 px-2 py-0.5 rounded-full text-[11px] font-bold w-20 text-center ${STATUS_STYLE[status] ?? 'bg-slate-100 text-slate-500'}`}>{status}</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-500 ${status === '정상' || status === '점검완료' ? 'bg-emerald-500' : status === '수리요망' ? 'bg-amber-500' : status === '폐기' ? 'bg-red-500' : 'bg-sky-400'}`}
                      style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-sm font-bold text-slate-700 w-16 text-right shrink-0">{cnt}개 ({pct}%)</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── 노후화 현황 (9) ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-800">자산 노후화 현황</h2>
            <p className="text-xs text-slate-400 mt-0.5">도입일 기준 3년 이상 경과 기자재</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 text-xs font-semibold">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-400 inline-block" />노후 주의 (3-5년): {agingList.filter(a => a.level === 'warning').length}대</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500 inline-block" />교체 권고 (5년+): {agingList.filter(a => a.level === 'danger').length}대</span>
            </div>
            {agingList.length > 0 && (
              <button onClick={exportAgingCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-50 transition">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                CSV
              </button>
            )}
          </div>
        </div>

        {agingList.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="font-semibold text-slate-600">노후화 대상 자산이 없습니다</p>
            <p className="text-sm text-slate-400 mt-1">모든 기자재가 3년 미만입니다.</p>
          </div>
        ) : (
          <>
            {/* 모바일 카드 */}
            <div className="md:hidden divide-y divide-slate-100">
              {agingList.map((a: any) => (
                <div key={a.asset_id} className="p-4 flex items-start gap-3">
                  <div className={`shrink-0 w-2 h-full min-h-10 rounded-full ${a.level === 'danger' ? 'bg-red-500' : 'bg-amber-400'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-sm">{a.model_name}</p>
                    <p className="text-xs text-slate-400 font-mono">{a.barcode}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {a.category && <span className="text-[11px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{a.category}</span>}
                      {a.department && <span className="text-[11px] bg-sky-50 text-sky-600 px-1.5 py-0.5 rounded">{a.department}</span>}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${a.level === 'danger' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                      {a.level === 'danger' ? '교체 권고' : '노후 주의'}
                    </span>
                    <p className="text-xs text-slate-400 mt-1">{a.age ? a.age.toFixed(1) : '-'}년</p>
                    <p className="text-xs text-slate-400">{a.intro_date ?? '-'}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* 데스크탑 테이블 */}
            <table className="hidden md:table w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">기자재</th>
                  <th className="px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">학과</th>
                  <th className="px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">카테고리</th>
                  <th className="px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">도입일</th>
                  <th className="px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">경과</th>
                  <th className="px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">등급</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {agingList.map((a: any) => (
                  <tr key={a.asset_id} className={`hover:bg-slate-50 transition-colors ${a.level === 'danger' ? 'border-l-4 border-l-red-400' : 'border-l-4 border-l-amber-400'}`}>
                    <td className="px-5 py-3">
                      <p className="font-semibold text-slate-800 text-sm">{a.model_name}</p>
                      <p className="text-xs text-slate-400 font-mono">{a.barcode}</p>
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-600">{a.department ?? '-'}</td>
                    <td className="px-5 py-3 text-sm text-slate-600">{a.category ?? '-'}</td>
                    <td className="px-5 py-3 text-sm text-slate-500">{a.intro_date ?? '-'}</td>
                    <td className="px-5 py-3 text-sm font-bold text-slate-700">{a.age ? `${a.age.toFixed(1)}년` : '-'}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${a.level === 'danger' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                        {a.level === 'danger' ? '교체 권고' : '노후 주의'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}
