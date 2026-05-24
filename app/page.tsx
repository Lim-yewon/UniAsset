'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import Link from 'next/link';

export default function HomePage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [selectedDept, setSelectedDept] = useState('전체');

  useEffect(() => {
    const fetchData = async () => {
      const { data, error } = await supabase
        .from('assets')
        .select(`
          *,
          room:room_id (
            room_number,
            locations:location_id (location_name)
          ),
          rentals (
            status
          )
        `);
      
      if (error) console.error("데이터 로드 에러:", error);
      if (data) setAssets(data);
    };
    fetchData();
  }, []);

  // 1. 대여용 기자재 통계 (원형 그래프용)
  const rentalStats = useMemo(() => {
    const rentables = assets.filter(a => a.is_rentable);
    const total = rentables.length;
    const rented = rentables.filter(a => a.rentals?.some((r: any) => r.status === '대여중')).length;
    const available = total - rented;
    const rentedPercent = total === 0 ? 0 : Math.round((rented / total) * 100);

    return { total, rented, available, rentedPercent };
  }, [assets]);

  // 2. 학과 목록 추출 (필터용)
  const departments = useMemo(() => {
    const depts = assets.map(a => a.department || '미지정');
    return ['전체', ...Array.from(new Set(depts))];
  }, [assets]);

  // 3. 고장/노후 현황 통계 (선택된 학과 기준)
  const faultStats = useMemo(() => {
    // 학과 필터링 적용
    const filteredAssets = assets.filter(a => selectedDept === '전체' || a.department === selectedDept);
    
    const total = filteredAssets.length;
    const faultyAssets = filteredAssets.filter(a => a.status === '수리요망' || a.status === '폐기');
    const faultyCount = faultyAssets.length;
    const faultyPercent = total === 0 ? 0 : Math.round((faultyCount / total) * 100);

    // 강의실별 고장 집계
    const roomBreakdown = faultyAssets.reduce((acc, asset) => {
      const loc = asset.room?.locations?.location_name || '미지정';
      const roomNum = asset.room?.room_number || '';
      const roomKey = `${loc} ${roomNum}`.trim();
      
      if (!acc[roomKey]) acc[roomKey] = 0;
      acc[roomKey] += 1;
      return acc;
    }, {} as Record<string, number>);

    // 고장 많은 순으로 정렬
    const sortedRooms = Object.entries(roomBreakdown).sort((a, b) => b[1] - a[1]);

    return { total, faultyCount, faultyPercent, sortedRooms };
  }, [assets, selectedDept]);


  return (
    <div className="max-w-5xl mx-auto space-y-8 p-6">
      <header>
        <h1 className="text-3xl font-bold text-gray-800">환영합니다! 👋</h1>
        <p className="text-gray-500 mt-2">오늘의 재물조사 및 대여 현황을 한눈에 파악하세요.</p>
      </header>

      {/* 🌟 상단: 대여 현황 원형 그래프 & 스캐너 액션 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* 대여 현황 도넛 차트 카드 */}
        <div className="md:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col items-center justify-center">
          <h2 className="text-sm font-bold text-gray-500 uppercase mb-4 w-full text-left">대여용 기자재 가동률</h2>
          
          {/* CSS Conic Gradient를 이용한 도넛 차트 */}
          <div className="relative w-32 h-32 rounded-full flex items-center justify-center mb-4 shadow-inner"
               style={{ background: `conic-gradient(#ef4444 ${rentalStats.rentedPercent}%, #22c55e ${rentalStats.rentedPercent}% 100%)` }}>
            {/* 중앙 흰색 원 (도넛 모양 만들기) */}
            <div className="absolute w-24 h-24 bg-white rounded-full flex flex-col items-center justify-center">
              <span className="text-2xl font-black text-gray-800">{rentalStats.rentedPercent}%</span>
              <span className="text-[10px] text-gray-400 font-bold">대여중</span>
            </div>
          </div>

          <div className="flex w-full justify-between text-sm px-4">
            <div className="text-center">
              <p className="text-gray-400 text-xs">전체</p>
              <p className="font-bold">{rentalStats.total}</p>
            </div>
            <div className="text-center">
              <p className="text-green-500 text-xs font-bold">대기중</p>
              <p className="font-bold">{rentalStats.available}</p>
            </div>
            <div className="text-center">
              <p className="text-red-500 text-xs font-bold">대여중</p>
              <p className="font-bold">{rentalStats.rented}</p>
            </div>
          </div>
        </div>

        {/* 퀵 액션 배너 */}
        <div className="md:col-span-2 bg-blue-600 p-8 rounded-2xl shadow-lg text-white flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">지금 바로 스캔을 시작할까요?</h2>
            <p className="opacity-90 text-sm">카메라를 통해 바코드를 즉시 인식하고 상태를 업데이트합니다.</p>
          </div>
          <Link href="/scanner" className="bg-white text-blue-600 px-8 py-4 rounded-xl font-bold hover:bg-blue-50 transition whitespace-nowrap shadow-md">
            스캐너 열기 📷
          </Link>
        </div>
      </div>

      {/* 🌟 하단: 전공별 고장/노후 현황 필터 및 리스트 */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800">기자재 고장 및 노후 현황</h2>
            <p className="text-sm text-gray-500 mt-1">수리요망 및 폐기 대상 자산 비율과 발생 위치</p>
          </div>
          
          {/* 학과 필터 드롭다운 */}
          <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border border-gray-100">
            <label className="text-xs font-bold text-gray-500">전공(학과) 필터</label>
            <select 
              value={selectedDept} 
              onChange={(e) => setSelectedDept(e.target.value)}
              className="bg-white border border-gray-200 text-sm rounded-md px-3 py-1 outline-none focus:border-blue-500 font-bold text-blue-700"
            >
              {departments.map(dept => <option key={dept} value={dept}>{dept}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 요약 수치 */}
          <div className="col-span-1 flex flex-col justify-center bg-red-50 rounded-xl p-6 border border-red-100">
            <p className="text-sm font-bold text-red-500 mb-1">전체 고장 비율</p>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-red-600">{faultStats.faultyPercent}%</span>
              <span className="text-sm text-red-400 font-medium">({faultStats.faultyCount} / {faultStats.total}대)</span>
            </div>
            
            {/* 미니 프로그레스 바 */}
            <div className="w-full bg-red-200 h-2 rounded-full mt-4 overflow-hidden">
              <div className="bg-red-500 h-full rounded-full" style={{ width: `${faultStats.faultyPercent}%` }}></div>
            </div>
          </div>

          {/* 강의실별 고장 랭킹 */}
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-sm font-bold text-gray-500 mb-3 uppercase">강의실별 주의/고장 건수</h3>
            {faultStats.sortedRooms.length === 0 ? (
              <div className="h-24 flex items-center justify-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                <p className="text-gray-400 font-bold text-sm">현재 등록된 고장/노후 자산이 없습니다. 🎉</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {faultStats.sortedRooms.map(([roomName, count]) => (
                  <div key={roomName} className="flex justify-between items-center p-3 bg-white border border-gray-100 rounded-lg shadow-sm">
                    <span className="font-bold text-gray-700 text-sm">{roomName}</span>
                    <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-black">{count}대</span>
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