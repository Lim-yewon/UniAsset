'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function AdminPage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [filter, setFilter] = useState('전체'); // 필터 상태 (전체, 정상, 수리요망, 폐기)

  useEffect(() => {
    const getData = async () => {
      // 1. 관계형 조인을 사용하여 위치 정보까지 한 번에 가져오기
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

  // 2. 필터링 로직
  const filteredAssets = filter === '전체' 
    ? assets 
    : assets.filter(a => a.status === filter);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">자산 관리 대장</h1>

      {/* 3. 상태 필터링 탭 */}
      <div className="flex gap-2">
        {['전체', '정상', '수리요망', '폐기'].map(status => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-full text-sm font-bold transition ${
              filter === status ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-4 text-sm text-gray-600">위치</th>
              <th className="p-4 text-sm text-gray-600">바코드</th>
              <th className="p-4 text-sm text-gray-600">모델명</th>
              <th className="p-4 text-sm text-gray-600">상태</th>
              <th className="p-4 text-sm text-gray-600">사진</th>
            </tr>
          </thead>
          <tbody>
            {filteredAssets.map(asset => (
              <tr key={asset.asset_id} className="border-b hover:bg-gray-50">
                <td className="p-4 text-sm text-gray-700">
                  {asset.room ? `${asset.room.location?.location_name || ''} ${asset.room.room_number}` : <span className="text-gray-400 italic">미지정</span>}
                </td>
                <td className="p-4 font-bold text-blue-600">{asset.barcode}</td>
                <td className="p-4">{asset.model_name}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${
                    asset.status === '정상' ? 'bg-green-100 text-green-700' : 
                    asset.status === '수리요망' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {asset.status}
                  </span>
                </td>
                <td className="p-4">
                  {asset.asset_image ? (
                    <button 
                      onClick={() => setSelectedImage(asset.asset_image)}
                      className="bg-blue-100 text-blue-700 px-3 py-1 rounded-lg text-xs font-bold hover:bg-blue-200"
                    >
                      이미지 보기
                    </button>
                  ) : (
                    <span className="text-gray-300 text-xs">사진 없음</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 이미지 모달창 */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedImage(null)}>
          <div className="bg-white p-2 rounded-xl shadow-2xl max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <img src={selectedImage} alt="자산 이미지" className="w-full h-auto rounded-lg" />
            <button className="w-full mt-2 py-2 text-sm font-bold text-gray-500" onClick={() => setSelectedImage(null)}>닫기</button>
          </div>
        </div>
      )}
    </div>
  );
}