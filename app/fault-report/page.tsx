'use client';

import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function FaultReportPage() {
  const [barcode, setBarcode] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { data: asset } = await supabase
      .from('assets')
      .select('asset_id')
      .eq('barcode', barcode)
      .single();

    if (!asset) {
      setError('존재하지 않는 바코드 번호입니다. 다시 확인해 주세요.');
      setLoading(false);
      return;
    }

    const { error: insertError } = await supabase.from('fault_reports').insert([
      {
        barcode,
        reason,
        status: '접수대기',
        reported_at: new Date().toISOString(),
      },
    ]);

    setLoading(false);

    if (insertError) {
      setError('신고 접수 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    } else {
      setSubmitted(true);
    }
  };

  const handleReset = () => {
    setBarcode('');
    setReason('');
    setSubmitted(false);
    setError('');
  };

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 p-12 text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
            ✅
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">고장 신고가 접수되었습니다</h2>
          <p className="text-slate-500 text-sm mb-1">
            바코드:{' '}
            <span className="font-bold text-slate-700 font-mono">{barcode}</span>
          </p>
          <p className="text-slate-500 text-sm mb-8">
            담당 관리자가 확인 후 신속히 조치할 예정입니다.
          </p>
          <button
            onClick={handleReset}
            className="px-6 py-2.5 bg-slate-800 text-white rounded-xl font-semibold text-sm hover:bg-slate-900 transition"
          >
            추가 신고하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-5">
      {/* Header Banner */}
      <div className="bg-red-600 text-white p-6 rounded-2xl">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">🚨</span>
          <h1 className="text-xl font-bold">기자재 고장 신고</h1>
        </div>
        <p className="text-red-100 text-sm leading-relaxed">
          고장 또는 파손된 기자재의 바코드 번호를 입력하고 증상을 상세히 기술해 주세요.
          관리자가 확인 후 신속히 조치하겠습니다.
        </p>
      </div>

      {/* Form Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              바코드 번호 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="기자재 바코드를 스캔하거나 직접 입력하세요"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              required
              className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:border-red-400 focus:ring-2 focus:ring-red-400/20 transition font-mono text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              고장 증상 <span className="text-red-500">*</span>
            </label>
            <textarea
              placeholder="예: 화면이 깜빡거리며 전원이 갑자기 꺼집니다. 전원 버튼을 눌러도 켜지지 않을 때가 있습니다."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              rows={5}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:border-red-400 focus:ring-2 focus:ring-red-400/20 transition text-sm resize-none"
            />
            <p className="text-xs text-slate-400 mt-1">
              증상을 구체적으로 작성할수록 빠른 조치가 가능합니다.
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
              <span>⚠️</span>
              <span>{error}</span>
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
                접수 중...
              </span>
            ) : (
              '고장 신고 접수하기'
            )}
          </button>
        </form>
      </div>

      {/* Info Box */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-xs font-bold text-amber-700 mb-2">📌 알아두세요</p>
        <ul className="text-xs text-amber-600 space-y-1 list-disc list-inside">
          <li>신고 접수 후 담당 관리자가 기자재 상태를 확인합니다.</li>
          <li>처리 현황은 관리자에게 직접 문의하세요.</li>
          <li>허위 신고는 학칙에 따라 불이익을 받을 수 있습니다.</li>
        </ul>
      </div>
    </div>
  );
}
