'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';

const STATUS_STYLE: Record<string, string> = {
  정상: 'bg-emerald-100 text-emerald-700',
  점검완료: 'bg-emerald-100 text-emerald-700',
  수리중: 'bg-sky-100 text-sky-700',
  수리요망: 'bg-amber-100 text-amber-700',
  폐기: 'bg-red-100 text-red-700',
  미점검: 'bg-slate-100 text-slate-600',
};

export default function AssetsManagementPage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAssets = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('assets')
        .select(`*, room:room_id(room_number, location:location_id(location_name))`);
      if (data) setAssets(data);
      setLoading(false);
    };
    fetchAssets();
  }, []);

  const normalAssets = assets.filter((a) => a.status === '정상' || a.status === '점검완료');
  const abnormalAssets = assets.filter(
    (a) => a.status !== '정상' && a.status !== '점검완료'
  );

  const groupedAbnormal = abnormalAssets.reduce(
    (acc, asset) => {
      const loc = asset.room?.location?.location_name || '미지정';
      const room = asset.room?.room_number || '미지정';
      if (!acc[loc]) acc[loc] = {};
      if (!acc[loc][room]) acc[loc][room] = [];
      acc[loc][room].push(asset);
      return acc;
    },
    {} as Record<string, Record<string, any[]>>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin" />
          <p className="text-sm text-slate-400 font-medium">데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">기자재 현황 관리</h1>
        <p className="text-slate-500 text-sm mt-1">전체 자산의 상태를 확인합니다.</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 font-semibold mb-1">전체 자산</p>
          <p className="text-2xl font-black text-slate-800">{assets.length}</p>
        </div>
        <div className="bg-emerald-50 rounded-xl border border-emerald-100 p-4">
          <p className="text-xs text-emerald-600 font-semibold mb-1">정상</p>
          <p className="text-2xl font-black text-emerald-700">{normalAssets.length}</p>
        </div>
        <div className="bg-red-50 rounded-xl border border-red-100 p-4">
          <p className="text-xs text-red-500 font-semibold mb-1">비정상</p>
          <p className="text-2xl font-black text-red-700">{abnormalAssets.length}</p>
        </div>
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 font-semibold mb-1">정상 비율</p>
          <p className="text-2xl font-black text-slate-800">
            {assets.length ? Math.round((normalAssets.length / assets.length) * 100) : 0}%
          </p>
        </div>
      </div>

      {/* Normal Assets */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold">
            정상
          </span>
          <h2 className="text-lg font-bold text-slate-800">정상 상태 자산</h2>
        </div>
        {normalAssets.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-8 text-center text-slate-400 text-sm">
            정상 상태의 자산이 없습니다.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {normalAssets.map((a) => (
              <div
                key={a.asset_id}
                className="bg-white rounded-xl border border-slate-200 p-4 hover:border-emerald-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-sm truncate">{a.model_name}</p>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">{a.barcode}</p>
                  </div>
                  <span
                    className={`shrink-0 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                      STATUS_STYLE[a.status] ?? 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {a.status}
                  </span>
                </div>
                {a.is_rentable && a.department && (
                  <span className="inline-block mt-2 text-[11px] px-2 py-0.5 bg-sky-50 text-sky-700 rounded-md font-semibold">
                    {a.department}
                  </span>
                )}
                {!a.is_rentable && a.room && (
                  <p className="text-xs text-slate-400 mt-2">
                    📍 {a.room.location?.location_name} {a.room.room_number}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Abnormal Assets (grouped) */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <span className="px-2.5 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-bold">
            주의
          </span>
          <h2 className="text-lg font-bold text-slate-800">비정상 상태 자산 (위치별)</h2>
        </div>
        {abnormalAssets.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center">
            <p className="text-2xl mb-2">🎉</p>
            <p className="text-slate-600 font-semibold">비정상 상태의 자산이 없습니다!</p>
            <p className="text-sm text-slate-400 mt-1">모든 기자재가 정상 작동 중입니다.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedAbnormal).map(([loc, rooms]) => (
              <div key={loc} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
                  <h3 className="font-bold text-slate-700 text-sm">📍 {loc}</h3>
                </div>
                <div className="p-4 space-y-4">
                  {Object.entries(rooms).map(([room, items]: [string, any]) => (
                    <div key={room}>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                        {room}
                      </p>
                      <div className="space-y-1.5">
                        {items.map((item: any) => (
                          <div
                            key={item.asset_id}
                            className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                          >
                            <div>
                              <span className="font-semibold text-slate-700 text-sm">
                                {item.model_name}
                              </span>
                              <span className="ml-2 font-mono text-xs text-slate-400">
                                {item.barcode}
                              </span>
                            </div>
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                STATUS_STYLE[item.status] ?? 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {item.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
