'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase'; 

export default function AdminDashboard() {
  const [assets, setAssets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAssets = async () => {
      // 🚨 id 대신 예원님의 DB에 맞게 asset_id로 정렬합니다!
      const { data, error } = await supabase
        .from('assets')
        .select('*')
        .order('asset_id', { ascending: true }); 

      if (error) {
        console.error('데이터를 불러오지 못했습니다:', error);
      } else if (data) {
        setAssets(data);
      }
      setIsLoading(false);
    };

    fetchAssets();
  }, []);

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-blue-800 mb-8">🖥️ UniAsset 관리자 대시보드</h1>

      {isLoading ? (
        <p>데이터를 불러오는 중입니다...</p>
      ) : (
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <table className="min-w-full text-left border-collapse">
            <thead>
              <tr className="bg-blue-100 text-blue-800">
                <th className="py-3 px-6 font-bold border-b">자산 ID</th>
                <th className="py-3 px-6 font-bold border-b">바코드 번호</th>
                <th className="py-3 px-6 font-bold border-b">기자재 분류</th>
                <th className="py-3 px-6 font-bold border-b">모델명</th>
                <th className="py-3 px-6 font-bold border-b">점검 상태</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((asset) => (
                // 🚨 여기서도 key를 asset_id로 맞춰줍니다.
                <tr key={asset.asset_id} className="hover:bg-gray-50 border-b">
                  <td className="py-3 px-6 font-mono text-sm">{asset.asset_id}</td>
                  <td className="py-3 px-6 font-mono text-sm text-blue-600">{asset.barcode}</td>
                  <td className="py-3 px-6">{asset.category || '-'}</td>
                  <td className="py-3 px-6">{asset.model_name || '미등록'}</td>
                  <td className="py-3 px-6">
                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                      asset.status === '점검완료' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {asset.status || '미점검'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}