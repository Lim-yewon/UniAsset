'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export default function RegisterAssetPage() {
  const [barcode, setBarcode] = useState('');
  const [modelName, setModelName] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isRentable, setIsRentable] = useState(true);
  const [department, setDepartment] = useState('');
  const [roomId, setRoomId] = useState('');
  const [rooms, setRooms] = useState<any[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [lastRegistered, setLastRegistered] = useState({ barcode: '', modelName: '' });

  useEffect(() => {
    supabase
      .from('room')
      .select('room_id, room_number, locations:location_id(location_name)')
      .then(({ data }) => {
        if (data) setRooms(data);
      });
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcode || !modelName) {
      alert('바코드와 모델명을 입력해주세요.');
      return;
    }

    setIsUploading(true);
    let finalImageUrl = null;

    try {
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('asset_images')
          .upload(fileName, imageFile);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('asset_images')
          .getPublicUrl(fileName);

        finalImageUrl = publicUrlData.publicUrl;
      }

      const insertData: Record<string, any> = {
        barcode,
        model_name: modelName,
        asset_image: finalImageUrl,
        status: '미점검',
        is_rentable: isRentable,
      };

      if (isRentable && department) {
        insertData.department = department;
      }
      if (!isRentable && roomId) {
        insertData.room_id = parseInt(roomId);
      }

      const { error: dbError } = await supabase
        .from('assets')
        .upsert([insertData], { onConflict: 'barcode' });

      if (dbError) throw dbError;

      setLastRegistered({ barcode, modelName });
      setSubmitted(true);
    } catch (error) {
      console.error('등록 에러:', error);
      alert('❌ 등록 실패: 콘솔을 확인해주세요.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    setBarcode('');
    setModelName('');
    setImageFile(null);
    setPreviewUrl(null);
    setIsRentable(true);
    setDepartment('');
    setRoomId('');
    setSubmitted(false);
  };

  if (submitted) {
    return (
      <div className="max-w-xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 p-12 text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
            ✅
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">등록이 완료되었습니다</h2>
          <p className="text-slate-500 text-sm mb-1">
            모델명: <span className="font-bold text-slate-700">{lastRegistered.modelName}</span>
          </p>
          <p className="text-slate-500 text-sm mb-8">
            바코드:{' '}
            <span className="font-mono font-bold text-slate-700">{lastRegistered.barcode}</span>
          </p>
          <button
            onClick={handleReset}
            className="px-6 py-2.5 bg-sky-600 text-white rounded-xl font-semibold text-sm hover:bg-sky-700 transition"
          >
            추가 등록하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">신규 기자재 등록</h1>
        <p className="text-slate-500 text-sm mt-1">
          새 기자재의 정보를 입력하고 시스템에 등록하세요.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-7">
          {/* 기본 정보 */}
          <section>
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 pb-2 border-b border-slate-100">
              기본 정보
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  바코드 번호 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition font-mono text-sm"
                  placeholder="예: 20260521"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  기자재 모델명 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition text-sm"
                  placeholder="예: 삼성 오디세이 G7"
                  required
                />
              </div>
            </div>
          </section>

          {/* 자산 유형 */}
          <section>
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 pb-2 border-b border-slate-100">
              자산 유형
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setIsRentable(true)}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  isRentable
                    ? 'border-sky-500 bg-sky-50'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <p className={`text-sm font-bold ${isRentable ? 'text-sky-700' : 'text-slate-600'}`}>
                  📦 대여용
                </p>
                <p className="text-xs text-slate-400 mt-0.5">학생에게 대여 가능</p>
              </button>
              <button
                type="button"
                onClick={() => setIsRentable(false)}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  !isRentable
                    ? 'border-violet-500 bg-violet-50'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <p
                  className={`text-sm font-bold ${!isRentable ? 'text-violet-700' : 'text-slate-600'}`}
                >
                  🔒 고정 자산
                </p>
                <p className="text-xs text-slate-400 mt-0.5">특정 강의실 배치</p>
              </button>
            </div>

            {isRentable ? (
              <div className="mt-4">
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  관리 학과
                </label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition text-sm"
                  placeholder="예: 컴퓨터공학과"
                />
              </div>
            ) : (
              <div className="mt-4">
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  배치 강의실
                </label>
                <select
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition text-sm bg-white"
                >
                  <option value="">강의실을 선택하세요</option>
                  {rooms.map((r: any) => (
                    <option key={r.room_id} value={r.room_id}>
                      {(r.locations as any)?.location_name} — {r.room_number}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </section>

          {/* 장비 사진 */}
          <section>
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 pb-2 border-b border-slate-100">
              장비 사진 (선택)
            </h2>
            <div className="border-2 border-dashed border-slate-200 rounded-xl overflow-hidden hover:border-slate-300 transition">
              {previewUrl ? (
                <div className="relative">
                  <img
                    src={previewUrl}
                    alt="미리보기"
                    className="max-h-56 mx-auto object-contain p-3"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setImageFile(null);
                      setPreviewUrl(null);
                    }}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-xs font-bold hover:bg-red-600 transition"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer block py-10 text-center hover:bg-slate-50 transition">
                  <span className="text-3xl">📷</span>
                  <p className="text-sm text-slate-500 mt-2 font-medium">클릭하여 사진 첨부</p>
                  <p className="text-xs text-slate-400 mt-0.5">JPG, PNG, HEIC 지원</p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </section>

          <button
            type="submit"
            disabled={isUploading}
            className="w-full py-3.5 bg-sky-600 text-white font-bold rounded-xl hover:bg-sky-700 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {isUploading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                업로드 중...
              </span>
            ) : (
              '기자재 등록하기'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
