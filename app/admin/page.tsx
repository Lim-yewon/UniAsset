'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function AdminPage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    const getData = async () => {
      const { data } = await supabase.from('assets').select('*').order('asset_id');
      if (data) setAssets(data);
    };
    getData();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">자산 관리 대장</h1>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left">
          {/* ... (thead 부분 동일) ... */}
          <tbody>
            {assets.map(asset => (
              <tr key={asset.asset_id} className="border-b hover:bg-gray-50">
                <td className="p-4 text-gray-500">{asset.asset_id}</td>
                <td className="p-4 font-bold text-blue-600">{asset.barcode}</td>
                <td className="p-4">{asset.model_name}</td>
                <td className="p-4">
                  {/* 🌟 이미지 보기 버튼 */}
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

      {/* 🌟 이미지 모달창 (클릭 시 나타남) */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedImage(null)}>
          <div className="bg-white p-2 rounded-xl shadow-2xl max-w-lg w-full">
            <img src={selectedImage} alt="자산 이미지" className="w-full h-auto rounded-lg" />
            <button className="w-full mt-2 py-2 text-sm font-bold text-gray-500" onClick={() => setSelectedImage(null)}>닫기</button>
          </div>
        </div>
      )}
    </div>
  );
}