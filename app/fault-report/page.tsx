'use client';

import React, { useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/AuthContext';

export default function FaultReportPage() {
  const { user } = useAuth();
  const [barcode,      setBarcode]      = useState('');
  const [reason,       setReason]       = useState('');
  const [photoFile,    setPhotoFile]    = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [loading,      setLoading]      = useState(false);
  const [submitted,    setSubmitted]    = useState(false);
  const [error,        setError]        = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = ev => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // 1. 바코드 확인
    const { data: asset } = await supabase.from('assets').select('asset_id').eq('barcode', barcode).single();
    if (!asset) {
      setError('존재하지 않는 바코드 번호입니다. 다시 확인해 주세요.');
      setLoading(false);
      return;
    }

    // 2. 사진 업로드 (있을 경우)
    let faultImageUrl: string | null = null;
    if (photoFile) {
      const ext      = photoFile.name.split('.').pop();
      const fileName = `fault_reports/${Date.now()}_${barcode}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from('asset_images')
        .upload(fileName, photoFile, { upsert: true });

      if (uploadErr) {
        setError('사진 업로드 실패: ' + uploadErr.message);
        setLoading(false);
        return;
      }
      const { data: urlData } = supabase.storage.from('asset_images').getPublicUrl(fileName);
      faultImageUrl = urlData.publicUrl;
    }

    // 3. 자산 상태 업데이트
    await supabase.from('assets').update({ status: '수리요망' }).eq('barcode', barcode);

    // 4. 고장 신고 삽입
    const { error: insertError } = await supabase.from('fault_reports').insert([{
      barcode,
      reason,
      fault_image: faultImageUrl,
      status: '접수대기',
      reported_at: new Date().toISOString(),
    }]);

    setLoading(false);
    if (insertError) setError('신고 접수 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    else setSubmitted(true);
  };

  const handleReset = () => {
    setBarcode(''); setReason(''); setPhotoFile(null); setPhotoPreview(null);
    setSubmitted(false); setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (submitted) return (
    <div className="max-w-lg mx-auto">
      <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 p-12 text-center">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">고장 신고가 접수되었습니다</h2>
        <p className="text-slate-500 text-sm mb-1">바코드: <span className="font-bold text-slate-700 font-mono">{barcode}</span></p>
        {photoPreview && (
          <img src={photoPreview} alt="신고 사진" className="w-full max-h-48 object-contain rounded-xl mt-3 mb-3 border border-slate-100" />
        )}
        <p className="text-slate-500 text-sm mb-8">담당 관리자가 확인 후 신속히 조치할 예정입니다.</p>
        <button onClick={handleReset} className="px-6 py-2.5 bg-slate-800 text-white rounded-xl font-semibold text-sm hover:bg-slate-900 transition">
          추가 신고하기
        </button>
      </div>
    </div>
  );

  return (
    <div className="max-w-lg mx-auto space-y-5">
      {/* Header */}
      <div className="bg-red-600 text-white p-6 rounded-2xl">
        <h1 className="text-xl font-bold mb-2">기자재 고장 신고</h1>
        <p className="text-red-100 text-sm leading-relaxed">
          고장 또는 파손된 기자재의 바코드 번호를 입력하고 증상을 상세히 기술해 주세요.
        </p>
      </div>

      {/* Form */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 바코드 */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              바코드 번호 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="기자재 바코드를 스캔하거나 직접 입력하세요"
              value={barcode}
              onChange={e => setBarcode(e.target.value)}
              required
              className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:border-red-400 focus:ring-2 focus:ring-red-400/20 transition font-mono text-base"
            />
          </div>

          {/* 고장 증상 */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              고장 증상 <span className="text-red-500">*</span>
            </label>
            <textarea
              placeholder="예: 화면이 깜빡거리며 전원이 갑자기 꺼집니다."
              value={reason}
              onChange={e => setReason(e.target.value)}
              required
              rows={4}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:border-red-400 focus:ring-2 focus:ring-red-400/20 transition text-sm resize-none"
            />
            <p className="text-xs text-slate-400 mt-1">증상을 구체적으로 작성할수록 빠른 조치가 가능합니다.</p>
          </div>

          {/* 사진 첨부 */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">사진 첨부 <span className="text-slate-400 font-normal">(선택)</span></label>

            {photoPreview ? (
              <div className="relative">
                <img src={photoPreview} alt="첨부 사진" className="w-full max-h-56 object-contain rounded-xl border border-slate-200 bg-slate-50" />
                <button
                  type="button"
                  onClick={removePhoto}
                  className="absolute top-2 right-2 w-7 h-7 bg-black/60 text-white rounded-full flex items-center justify-center hover:bg-black/80 transition"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-2 w-full h-32 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-red-300 hover:bg-red-50/50 transition">
                <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                </svg>
                <span className="text-sm text-slate-400 font-medium">사진 촬영 또는 갤러리에서 선택</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
              <span>⚠️</span><span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !barcode || !reason}
            className="w-full py-3.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {photoFile ? '사진 업로드 중...' : '접수 중...'}
              </span>
            ) : '고장 신고 접수하기'}
          </button>
        </form>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-xs font-bold text-amber-700 mb-2">알아두세요</p>
        <ul className="text-xs text-amber-600 space-y-1 list-disc list-inside">
          <li>신고 접수 후 담당 관리자가 기자재 상태를 확인합니다.</li>
          <li>사진을 첨부하면 더 빠른 조치가 가능합니다.</li>
          <li>허위 신고는 학칙에 따라 불이익을 받을 수 있습니다.</li>
        </ul>
      </div>
    </div>
  );
}
