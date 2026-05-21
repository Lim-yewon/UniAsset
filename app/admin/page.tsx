'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function AdminPage() {
  const [assets, setAssets] = useState<any[]>([]);

  useEffect(() => {
    const getData = async () => {
      // 기존 복잡했던 .select()를 아래처럼 '*'로 수정하세요
    const { data, error } = await supabase
    .from('assets')
    .select('*'); // 모든 컬럼을 가져오라는 뜻입니다.
        if (data) setAssets(data);
        };
    getData();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">자산 관리 대장</h1>
        <button onClick={()=>window.location.reload()} className="text-sm bg-white border px-4 py-2 rounded-lg shadow-sm">새로고침 🔄</button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-4 font-semibold text-gray-600">ID</th>
              <th className="p-4 font-semibold text-gray-600">바코드</th>
              <th className="p-4 font-semibold text-gray-600">모델명</th>
              <th className="p-4 font-semibold text-gray-600">상태</th>
            </tr>
          </thead>
          <tbody>
            {assets.map(asset => (
              <tr key={asset.asset_id} className="border-b last:border-0 hover:bg-gray-50 transition">
                <td className="p-4 text-gray-500">{asset.asset_id}</td>
                <td className="p-4 font-mono font-bold text-blue-600">{asset.barcode}</td>
                <td className="p-4 text-gray-800">{asset.model_name}</td>
                <td className="p-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${asset.status === '점검완료' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {asset.status || '미점검'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}