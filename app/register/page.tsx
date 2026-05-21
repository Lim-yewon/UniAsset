'use client';

import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function RegisterAssetPage() {
  const [barcode, setBarcode] = useState('');
  const [modelName, setModelName] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // 1. 이미지 파일 선택 시 미리보기 띄우기
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file)); // 화면에 보여줄 임시 주소 생성
    }
  };

  // 2. 폼 제출: 스토리지에 사진 올리고 -> DB에 데이터 저장하기
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);

    try {
      let finalImageUrl = null;
      if (imageFile) {
        const fileName = `${Date.now()}`;
        const { error: uploadError } = await supabase.storage
          .from('asset_images')
          .upload(fileName, imageFile);
        if (uploadError) throw uploadError;
        
        const { data: publicUrlData } = supabase.storage
          .from('asset_images')
          .getPublicUrl(fileName);
        finalImageUrl = publicUrlData.publicUrl;
      }

      // DB insert: 에러가 나면 콘솔에 상세히 출력하도록 수정
      const { data, error: dbError } = await supabase
        .from('assets')
        .insert([{ 
          barcode: barcode, 
          model_name: modelName, 
          asset_image: finalImageUrl,
          status: '미점검' 
        }])
        .select(); // <--- 이걸 추가하면 DB가 성공 후 데이터를 돌려줍니다

      if (dbError) {
        console.error("DB 상세 에러:", dbError); // F12 콘솔에서 이 메시지를 확인하세요!
        throw dbError;
      }

      alert('✅ 등록 완료!');
    } catch (error) {
      console.error("전체 에러:", error);
      alert('❌ 등록 실패: 콘솔(F12)의 에러 상세 내용을 확인하세요.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6 bg-white rounded-2xl shadow-md border border-gray-100">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">➕ 신규 기자재 등록 (이미지 첨부)</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 바코드 및 모델명 입력 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-600 mb-2">바코드 번호</label>
            <input type="text" value={barcode} onChange={e => setBarcode(e.target.value)} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="예: 20260521" />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-600 mb-2">기자재 모델명</label>
            <input type="text" value={modelName} onChange={e => setModelName(e.target.value)} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="예: 삼성 오디세이 G7" />
          </div>
        </div>

        {/* 이미지 업로드 영역 */}
        <div>
          <label className="block text-sm font-bold text-gray-600 mb-2">장비 사진 첨부</label>
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:bg-gray-50 transition">
            {previewUrl ? (
              <div className="relative">
                <img src={previewUrl} alt="미리보기" className="max-h-64 mx-auto rounded-lg object-contain" />
                <button type="button" onClick={() => {setImageFile(null); setPreviewUrl(null);}} className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full text-xs font-bold w-6 h-6">X</button>
              </div>
            ) : (
              <label className="cursor-pointer block py-8">
                <span className="text-gray-500">클릭하여 사진을 선택하거나 스마트폰으로 촬영하세요</span>
                <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
              </label>
            )}
          </div>
        </div>

        {/* 제출 버튼 */}
        <button type="submit" disabled={isUploading} className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 transition disabled:bg-gray-400">
          {isUploading ? '업로드 중... ⏳' : '등록 완료'}
        </button>
      </form>
    </div>
  );
}