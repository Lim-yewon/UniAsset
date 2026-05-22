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
          room:room_id (
            room_number, 
            location:location_id (location_name)
          )
        `)
        .order('asset_id');
      if (data) setAssets(data);
    };
    getData();
  }, []);

  // 1. 일반 필터링 (테이블용)
  const filteredAssets = assets.filter(a => {
    if (filter === '대여용') return a.is_rentable === true;
    if (filter === '고정') return a.is_rentable === false;
    return true; 
  });

  // 2. 고정 자산 그룹화 로직 (건물 > 강의실)
  const groupedFixedAssets = assets
    .filter(a => a.is_rentable === false)
    .reduce((acc, asset) => {
      const locName = asset.room?.location?.location_name || '미지정';
      const roomNum = asset.room?.room_number || '미지정';
      
      if (!acc[locName]) acc[locName] = {};
      if (!acc[locName][roomNum]) acc[locName][roomNum] = [];
      
      acc[locName][roomNum].push(asset);
      return acc;
    }, {});

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

      {/* 고정 자산 뷰 (그룹화 적용) */}
      {filter === '고정' ? (
        <div className="space-y-6">
          {Object.entries(groupedFixedAssets).map(([locName, rooms]: [string, any]) => (
            <div key={locName} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
              <h2 className="text-lg font-bold text-blue-600 mb-4 border-b pb-2">{locName}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(rooms).map(([roomNum, items]: [string, any]) => (
                  <div key={roomNum} className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <h3 className="font-bold text-gray-700 mb-2">{roomNum}</h3>
                    <ul className="space-y-2">
                      {items.map((item: any) => (
                        <li key={item.asset_id} className="text-sm text-gray-600 flex justify-between items-center bg-white p-2 rounded shadow-sm">
                          <span>{item.model_name}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${item.status === '정상' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {item.status}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* 테이블 뷰 (전체 또는 대여용일 때) */
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
                  <td className="p-4 text-sm">{asset.room ? `${asset.room.location?.location_name || ''} ${asset.room.room_number || ''}` : '미지정'}</td>
                  <td className="p-4 font-medium">{asset.model_name}</td>
                  <td className="p-4 text-sm text-gray-600">{asset.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}