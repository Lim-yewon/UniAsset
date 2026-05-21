'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';

export default function AssetsManagementPage() {
  const [assets, setAssets] = useState<any[]>([]);

  useEffect(() => {
    const fetchAssets = async () => {
      // 1. 기자재와 호실, 건물 정보를 조인하여 가져오기
      const { data } = await supabase
        .from('assets')
        .select(`*, room:room_id(room_number, location:location_id(location_name))`);
      if (data) setAssets(data);
    };
    fetchAssets();
  }, []);

  // 2. 데이터 분류
  const available = assets.filter(a => a.status === '정상');
  const unavailable = assets.filter(a => a.status !== '정상');

  // 3. 건물/호실별 그룹화 (reduce 함수 사용)
  const groupedUnavailable = unavailable.reduce((acc, asset) => {
    const loc = asset.room?.location?.location_name || '미지정';
    const room = asset.room?.room_number || '미지정';
    if (!acc[loc]) acc[loc] = {};
    if (!acc[loc][room]) acc[loc][room] = [];
    acc[loc][room].push(asset);
    return acc;
  }, {});

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">📦 기자재 현황 관리</h1>
      
      {/* 대여 가능 목록 */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4 text-green-600">✅ 대여 가능 자산</h2>
        <div className="grid grid-cols-3 gap-4">
          {available.map(a => <div key={a.asset_id} className="p-4 border rounded">{a.model_name}</div>)}
        </div>
      </section>

      {/* 대여 불가 목록 (그룹화) */}
      <section>
        <h2 className="text-xl font-semibold mb-4 text-red-600">⚠️ 대여 불가 자산 (위치별)</h2>
        {Object.entries(groupedUnavailable).map(([loc, rooms]: [string, any]) => (
          <div key={loc} className="mb-6">
            <h3 className="font-bold text-lg">{loc}</h3>
            {Object.entries(rooms).map(([room, items]: [string, any]) => (
              <div key={room} className="ml-4 border-l-2 pl-4 mb-2">
                <p className="font-medium text-gray-700">{room}</p>
                {items.map((i: any) => <li key={i.asset_id}>{i.model_name} ({i.status})</li>)}
              </div>
            ))}
          </div>
        ))}
      </section>
    </div>
  );
}