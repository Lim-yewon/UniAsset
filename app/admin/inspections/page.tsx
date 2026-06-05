'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../lib/AuthContext';

const STATUS_STYLE: Record<string, string> = {
  점검완료: 'bg-emerald-100 text-emerald-700',
  수리요망: 'bg-amber-100 text-amber-700',
  수리중:   'bg-sky-100 text-sky-700',
  폐기:     'bg-red-100 text-red-700',
};

export default function InspectionsPage() {
  const { user } = useAuth();
  const [logs, setLogs]         = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [filterRoom, setFilterRoom] = useState('전체');
  const [filterDate, setFilterDate] = useState('');

  useEffect(() => {
    if (user) fetchLogs();
  }, [user]);

  const fetchLogs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('inspection_log')
      .select(`
        id, status, inspected_at,
        assets:asset_id(model_name, barcode, department, category),
        inspector:inspector_id(name),
        room:room_id(room_number, locations:location_id(location_name))
      `)
      .order('inspected_at', { ascending: false })
      .limit(500);

    if (error) console.error(error);
    setLogs(data || []);
    setLoading(false);
  };

  const rooms = useMemo(() => {
    const rs = logs.map(l => {
      const loc  = (l.room?.locations as any)?.location_name || '';
      const num  = l.room?.room_number || '';
      return `${loc} ${num}`.trim() || '미지정';
    });
    return ['전체', ...Array.from(new Set(rs)).sort()];
  }, [logs]);

  const filtered = useMemo(() => logs.filter(l => {
    const roomStr = `${(l.room?.locations as any)?.location_name || ''} ${l.room?.room_number || ''}`.trim() || '미지정';
    const matchRoom = filterRoom === '전체' || roomStr === filterRoom;
    const matchDate = !filterDate || l.inspected_at?.startsWith(filterDate);
    return matchRoom && matchDate;
  }), [logs, filterRoom, filterDate]);

  // 날짜별 그룹
  const grouped = useMemo(() => {
    const g: Record<string, any[]> = {};
    filtered.forEach(l => {
      const d = l.inspected_at?.split('T')[0] ?? '날짜 없음';
      if (!g[d]) g[d] = [];
      g[d].push(l);
    });
    return Object.entries(g).sort(([a], [b]) => b.localeCompare(a));
  }, [filtered]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin" />
        <p className="text-sm text-slate-400 font-medium">데이터를 불러오는 중...</p>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">재물조사 이력</h1>
        <p className="text-slate-500 text-sm mt-1">근로장학생이 완료한 재물조사 기록입니다.</p>
      </div>

      {/* 요약 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-400 font-semibold mb-1">전체 기록</p>
          <p className="text-2xl font-black text-slate-800">{logs.length}</p>
        </div>
        <div className="bg-emerald-50 rounded-xl border border-emerald-100 p-4">
          <p className="text-xs text-emerald-600 font-semibold mb-1">점검완료</p>
          <p className="text-2xl font-black text-emerald-700">{logs.filter(l => l.status === '점검완료').length}</p>
        </div>
        <div className="bg-amber-50 rounded-xl border border-amber-100 p-4">
          <p className="text-xs text-amber-600 font-semibold mb-1">이상 발견</p>
          <p className="text-2xl font-black text-amber-700">{logs.filter(l => l.status !== '점검완료').length}</p>
        </div>
        <div className="bg-sky-50 rounded-xl border border-sky-100 p-4">
          <p className="text-xs text-sky-600 font-semibold mb-1">조사 일수</p>
          <p className="text-2xl font-black text-sky-700">{grouped.length}</p>
        </div>
      </div>

      {/* 필터 */}
      <div className="flex flex-wrap gap-3 bg-white rounded-2xl border border-slate-200 p-4">
        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1">강의실</label>
          <select value={filterRoom} onChange={e => setFilterRoom(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-sky-500 bg-white">
            {rooms.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1">날짜</label>
          <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-sky-500 bg-white" />
        </div>
        {(filterRoom !== '전체' || filterDate) && (
          <div className="flex items-end">
            <button onClick={() => { setFilterRoom('전체'); setFilterDate(''); }}
              className="px-3 py-2 text-sm text-slate-500 hover:text-red-500 font-semibold transition">초기화</button>
          </div>
        )}
        <div className="flex items-end ml-auto">
          <span className="text-xs text-slate-400 font-semibold">{filtered.length}건 표시</span>
        </div>
      </div>

      {/* 이력 (날짜별 그룹) */}
      {grouped.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center">
          <p className="font-semibold text-slate-600">재물조사 이력이 없습니다</p>
          <p className="text-sm text-slate-400 mt-1">근로장학생이 재물조사를 완료하면 여기에 기록됩니다.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(([date, items]) => (
            <div key={date} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              {/* 날짜 헤더 */}
              <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5" />
                  </svg>
                  <span className="text-sm font-bold text-slate-700">{new Date(date).toLocaleDateString('ko-KR', { year:'numeric', month:'long', day:'numeric', weekday:'short' })}</span>
                </div>
                <span className="text-xs font-bold text-slate-400">{items.length}건</span>
              </div>

              {/* 모바일 카드 */}
              <div className="md:hidden divide-y divide-slate-100">
                {items.map((l: any) => (
                  <div key={l.id} className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 text-sm truncate">{(l.assets as any)?.model_name}</p>
                        <p className="text-xs text-slate-400 font-mono">{(l.assets as any)?.barcode}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-[11px] text-slate-500">{(l.room?.locations as any)?.location_name} {l.room?.room_number}</span>
                          <span className="text-[11px] text-slate-400">조사자: {(l.inspector as any)?.name ?? '-'}</span>
                          <span className="text-[11px] text-slate-400">{l.inspected_at ? new Date(l.inspected_at).toLocaleTimeString('ko-KR', { hour:'2-digit', minute:'2-digit' }) : ''}</span>
                        </div>
                      </div>
                      <span className={`shrink-0 px-2 py-0.5 rounded-full text-[11px] font-bold ${STATUS_STYLE[l.status] ?? 'bg-slate-100 text-slate-600'}`}>{l.status}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* 데스크탑 테이블 */}
              <table className="hidden md:table w-full text-left">
                <thead className="bg-white border-b border-slate-100">
                  <tr>
                    <th className="px-5 py-2.5 text-xs font-bold text-slate-400 uppercase tracking-wider">기자재</th>
                    <th className="px-5 py-2.5 text-xs font-bold text-slate-400 uppercase tracking-wider">강의실</th>
                    <th className="px-5 py-2.5 text-xs font-bold text-slate-400 uppercase tracking-wider">조사자</th>
                    <th className="px-5 py-2.5 text-xs font-bold text-slate-400 uppercase tracking-wider">시간</th>
                    <th className="px-5 py-2.5 text-xs font-bold text-slate-400 uppercase tracking-wider">결과</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {items.map((l: any) => (
                    <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3">
                        <p className="font-semibold text-slate-800 text-sm">{(l.assets as any)?.model_name}</p>
                        <p className="text-xs text-slate-400 font-mono">{(l.assets as any)?.barcode}</p>
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-600">
                        {(l.room?.locations as any)?.location_name} {l.room?.room_number}
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-600">{(l.inspector as any)?.name ?? '-'}</td>
                      <td className="px-5 py-3 text-sm text-slate-500">
                        {l.inspected_at ? new Date(l.inspected_at).toLocaleTimeString('ko-KR', { hour:'2-digit', minute:'2-digit' }) : '-'}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${STATUS_STYLE[l.status] ?? 'bg-slate-100 text-slate-600'}`}>{l.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
