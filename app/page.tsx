'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import Link from 'next/link';

export default function HomePage() {
  const { user } = useAuth();
  const [assets, setAssets]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDept, setSelectedDept] = useState('전체');
  const [pendingRental,  setPendingRental]  = useState(0);
  const [pendingReturn,  setPendingReturn]  = useState(0);
  const [pendingFault,   setPendingFault]   = useState(0);
  const [overdueRentals, setOverdueRentals] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [{ data: assetData }, { data: rentalData }, { data: faultData }] = await Promise.all([
        supabase.from('assets').select(`*, room:room_id(room_number, locations:location_id(location_name)), rentals(status)`),
        supabase.from('rentals').select('status, due_date').in('status', ['대여신청', '반납신청', '대여중']),
        supabase.from('fault_reports').select('id').eq('status', '접수대기'),
      ]);
      if (assetData) setAssets(assetData);

      if (rentalData) {
        setPendingRental(rentalData.filter(r => r.status === '대여신청').length);
        setPendingReturn(rentalData.filter(r => r.status === '반납신청').length);
        const today = new Date().toISOString().split('T')[0];
        setOverdueRentals(rentalData.filter(r => r.status === '대여중' && r.due_date && r.due_date < today).length);
      }
      setPendingFault(faultData?.length ?? 0);
      setLoading(false);
    };
    fetchData();
  }, []);

  const rentalStats = useMemo(() => {
    const rentables = assets.filter(a => a.is_rentable);
    const total     = rentables.length;
    const rented    = rentables.filter(a => a.rentals?.some((r: any) => r.status === '대여중')).length;
    const available = total - rented;
    const rentedPercent = total === 0 ? 0 : Math.round((rented / total) * 100);
    return { total, rented, available, rentedPercent };
  }, [assets]);

  const departments = useMemo(() => {
    const depts = assets.map(a => a.department || '미지정');
    return ['전체', ...Array.from(new Set(depts))];
  }, [assets]);

  const faultStats = useMemo(() => {
    const filtered = assets.filter(a => selectedDept === '전체' || a.department === selectedDept);
    const total = filtered.length;
    const faultyAssets = filtered.filter(a => ['수리요망','수리중','폐기'].includes(a.status));
    const faultyCount = faultyAssets.length;
    const faultyPercent = total === 0 ? 0 : Math.round((faultyCount / total) * 100);
    const roomBreakdown = faultyAssets.reduce((acc, asset) => {
      const loc  = asset.room?.locations?.location_name || '미지정';
      const room = asset.room?.room_number || '';
      const key  = `${loc} ${room}`.trim();
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const sortedRooms = (Object.entries(roomBreakdown) as [string, number][]).sort((a, b) => b[1] - a[1]);
    return { total, faultyCount, faultyPercent, sortedRooms };
  }, [assets, selectedDept]);

  const totalFaulty = useMemo(
    () => assets.filter(a => ['수리요망','수리중','폐기'].includes(a.status)).length,
    [assets]
  );

  const summaryCards = [
    { label: '전체 자산',  value: assets.length,                                   sub: '등록된 기자재 수',      bg: 'bg-white border-slate-200',     valueColor: 'text-slate-800' },
    { label: '고정 자산',  value: assets.filter(a => !a.is_rentable).length,        sub: '강의실 배치 기자재',     bg: 'bg-violet-50 border-violet-100', valueColor: 'text-violet-700' },
    { label: '대여 가능',  value: rentalStats.available,                            sub: `전체 대여용 ${rentalStats.total}개 중`, bg: 'bg-sky-50 border-sky-100', valueColor: 'text-sky-700' },
    { label: '고장 / 노후', value: totalFaulty,                                    sub: '수리요망 + 수리중 + 폐기', bg: 'bg-red-50 border-red-100',      valueColor: 'text-red-700' },
  ];

  const totalPending = pendingRental + pendingReturn + pendingFault;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin" />
        <p className="text-sm text-slate-400 font-medium">데이터를 불러오는 중...</p>
      </div>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-slate-800">대시보드</h1>
        <p className="text-slate-500 mt-1 text-sm">오늘의 재물조사 및 대여 현황을 한눈에 파악하세요.</p>
      </header>

      {/* ── 처리 필요 항목 ── */}
      {totalPending + overdueRentals > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-amber-200 p-4 md:p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <h2 className="text-sm font-bold text-amber-700">처리가 필요한 항목</h2>
            <span className="ml-auto px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-black">
              {totalPending + overdueRentals}건
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {pendingRental > 0 && (
              <Link href="/admin/rentals" className="flex flex-col gap-1 p-3 bg-amber-50 rounded-xl border border-amber-100 hover:border-amber-300 transition group">
                <span className="text-2xl font-black text-amber-600">{pendingRental}</span>
                <span className="text-xs font-semibold text-amber-600">대여 신청 대기</span>
                <span className="text-[11px] text-amber-400 group-hover:underline">승인하러 가기 →</span>
              </Link>
            )}
            {pendingReturn > 0 && (
              <Link href="/admin/rentals" className="flex flex-col gap-1 p-3 bg-orange-50 rounded-xl border border-orange-100 hover:border-orange-300 transition group">
                <span className="text-2xl font-black text-orange-600">{pendingReturn}</span>
                <span className="text-xs font-semibold text-orange-600">반납 신청 대기</span>
                <span className="text-[11px] text-orange-400 group-hover:underline">확인하러 가기 →</span>
              </Link>
            )}
            {pendingFault > 0 && (
              <Link href="/admin/faults" className="flex flex-col gap-1 p-3 bg-red-50 rounded-xl border border-red-100 hover:border-red-300 transition group">
                <span className="text-2xl font-black text-red-600">{pendingFault}</span>
                <span className="text-xs font-semibold text-red-600">미처리 고장 신고</span>
                <span className="text-[11px] text-red-400 group-hover:underline">처리하러 가기 →</span>
              </Link>
            )}
            {overdueRentals > 0 && (
              <Link href="/admin/rentals" className="flex flex-col gap-1 p-3 bg-rose-50 rounded-xl border border-rose-100 hover:border-rose-300 transition group">
                <span className="text-2xl font-black text-rose-600">{overdueRentals}</span>
                <span className="text-xs font-semibold text-rose-600">반납 기한 초과</span>
                <span className="text-[11px] text-rose-400 group-hover:underline">확인하러 가기 →</span>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {summaryCards.map(card => (
          <div key={card.label} className={`${card.bg} border rounded-2xl p-5`}>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{card.label}</p>
            <p className={`text-3xl font-black mt-1 ${card.valueColor}`}>{card.value}</p>
            <p className="text-xs text-slate-400 mt-1">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Donut + Quick Action */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center justify-center">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 w-full text-left">대여용 기자재 가동률</h2>
          <div className="relative w-32 h-32 rounded-full flex items-center justify-center mb-4"
            style={{ background: `conic-gradient(#ef4444 ${rentalStats.rentedPercent}%, #22c55e ${rentalStats.rentedPercent}% 100%)` }}>
            <div className="absolute w-24 h-24 bg-white rounded-full flex flex-col items-center justify-center shadow-inner">
              <span className="text-2xl font-black text-slate-800">{rentalStats.rentedPercent}%</span>
              <span className="text-[10px] text-slate-400 font-bold">대여중</span>
            </div>
          </div>
          <div className="flex w-full justify-between text-sm px-2">
            <div className="text-center"><p className="text-slate-400 text-xs">전체</p><p className="font-bold text-slate-700">{rentalStats.total}</p></div>
            <div className="text-center"><p className="text-emerald-500 text-xs font-bold">대기중</p><p className="font-bold text-slate-700">{rentalStats.available}</p></div>
            <div className="text-center"><p className="text-red-500 text-xs font-bold">대여중</p><p className="font-bold text-slate-700">{rentalStats.rented}</p></div>
          </div>
        </div>

        <div className="md:col-span-2 bg-gradient-to-br from-sky-500 to-blue-600 p-8 rounded-2xl shadow-lg text-white flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <p className="text-sky-200 text-xs font-semibold uppercase tracking-widest mb-1">재물조사</p>
            <h2 className="text-2xl font-bold mb-2">지금 바로 스캔을 시작할까요?</h2>
            <p className="opacity-80 text-sm">카메라로 바코드를 즉시 인식하고 상태를 업데이트합니다.</p>
          </div>
          <Link href="/scanner" className="bg-white text-sky-600 px-6 py-3 rounded-xl font-bold hover:bg-sky-50 transition whitespace-nowrap shadow-md text-sm">
            스캐너 열기
          </Link>
        </div>
      </div>

      {/* Fault Stats */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800">기자재 고장 및 노후 현황</h2>
            <p className="text-sm text-slate-500 mt-0.5">수리요망 및 폐기 대상 자산 비율과 발생 위치</p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-500">전공(학과) 필터</label>
            <select value={selectedDept} onChange={e => setSelectedDept(e.target.value)}
              className="bg-white border border-slate-200 text-sm rounded-lg px-3 py-1.5 outline-none focus:border-sky-500 font-semibold text-sky-700">
              {departments.map(dept => <option key={dept} value={dept}>{dept}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="col-span-1 flex flex-col justify-center bg-red-50 rounded-xl p-6 border border-red-100">
            <p className="text-xs font-bold text-red-500 mb-1 uppercase tracking-wider">전체 고장 비율</p>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-red-600">{faultStats.faultyPercent}%</span>
              <span className="text-sm text-red-400 font-medium">({faultStats.faultyCount} / {faultStats.total}대)</span>
            </div>
            <div className="w-full bg-red-200 h-2 rounded-full mt-4 overflow-hidden">
              <div className="bg-red-500 h-full rounded-full transition-all" style={{ width: `${faultStats.faultyPercent}%` }} />
            </div>
          </div>
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider">강의실별 고장 건수</h3>
            {faultStats.sortedRooms.length === 0 ? (
              <div className="h-24 flex items-center justify-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <p className="text-slate-400 font-semibold text-sm">현재 등록된 고장/노후 자산이 없습니다 🎉</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {faultStats.sortedRooms.map(([roomName, count]) => (
                  <div key={roomName} className="flex justify-between items-center p-3 bg-slate-50 border border-slate-100 rounded-lg">
                    <span className="font-semibold text-slate-700 text-sm">{roomName}</span>
                    <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold">{count}대</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
