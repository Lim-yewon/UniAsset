'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function AdminPage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [filter, setFilter] = useState('전체'); // '전체', '대여용', '고정'

  useEffect(() => {
    const getData = async () => {
      const { data } = await supabase
        .from('assets')
        .select(`
          *,
          room:room_id (room_number, location:location_id (location_name))
        `)
        .order('asset_id');
      if (data) setAssets(data);
    };
    getData();
  }, []);

  // 필터링 로직
  const filteredAssets = assets.filter(a => {
    if (filter === '대여용') return a.is_rentable === true;
    if (filter === '고정') return a.is_rentable === false;
    return true; // 전체
  });

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">자산 관리 대장</h1>

      {/* 탭 필터 */}
      <div className="flex gap-2 bg-gray-100 p-1 rounded-lg w-fit">
        {['전체', '대여용', '고정'].map(type => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-4 py-2 rounded-md text-sm font-bold transition ${
              filter === type ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-4 text-sm text-gray-600">유형</th>
              <th className="p-4 text-sm text-gray-600">위치</th>
              <th className="p-4 text-sm text-gray-600">모델명</th>
              <th className="p-4 text-sm text-gray-600">상태</th>
            </tr>
          </thead>
          <tbody>
            {filteredAssets.map(asset => (
              <tr key={asset.asset_id} className="border-b hover:bg-gray-50">
                <td className="p-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${asset.is_rentable ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-700'}`}>
                    {asset.is_rentable ? '대여용' : '고정'}
                  </span>
                </td>
                <td className="p-4 text-sm">{asset.room ? `${asset.room.location?.location_name} ${asset.room.room_number}` : '미지정'}</td>
                <td className="p-4 font-medium">{asset.model_name}</td>
                <td className="p-4 text-sm text-gray-600">{asset.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}