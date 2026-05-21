'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase'; // 스캐너에서 썼던 다리 그대로 사용!

export default function AdminDashboard() {
  const [assets, setAssets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 화면이 켜지자마자 DB에서 장비 목록을 싹 다 가져오는 함수
  useEffect(() => {
    const fetchAssets = async () => {
      const { data, error } = await supabase
        .from('assets')
        .select('*')
        .order('id', { ascending: true }); // ID 순서대로 정렬

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
                <th className="py-3 px-6 font-bold border-b">ID</th>
                <th className="py-3 px-6 font-bold border-b">바코드 번호</th>
                <th className="py-3 px-6 font-bold border-b">기자재명 (예시)</th>
                <th className="py-3 px-6 font-bold border-b">점검 상태</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((asset) => (
                <tr key={asset.id} className="hover:bg-gray-50 border-b">
                  <td className="py-3 px-6">{asset.id}</td>
                  <td className="py-3 px-6 font-mono text-sm">{asset.barcode}</td>
                  <td className="py-3 px-6">{asset.name || '미등록 장비'}</td>
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