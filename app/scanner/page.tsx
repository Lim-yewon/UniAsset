'use client';

import React, { useState } from 'react';
import { useZxing } from 'react-zxing';
import { supabase } from '../../lib/supabase';

type ScanRecord = {
  code: string;
  success: boolean;
  time: Date;
};

export default function ScannerPage() {
  const [scannedData, setScannedData] = useState('');
  const [status, setStatus] = useState<{
    msg: string;
    type: 'idle' | 'success' | 'error' | 'loading';
  }>({ msg: '바코드를 카메라에 인식시켜주세요', type: 'idle' });
  const [manual, setManual] = useState('');
  const [history, setHistory] = useState<ScanRecord[]>([]);

  const handleUpdate = async (code: string) => {
    if (!code) return;
    setStatus({ msg: '데이터 전송 중...', type: 'loading' });

    const { data, error } = await supabase
      .from('assets')
      .update({ status: '점검완료' })
      .eq('barcode', code)
      .select();

    const success = !!(data && data.length > 0);

    setStatus({
      msg: success ? `✅ ${code} — 점검 완료 처리되었습니다` : `⚠️ 등록되지 않은 바코드: ${code}`,
      type: success ? 'success' : 'error',
    });

    setHistory((prev) => [{ code, success, time: new Date() }, ...prev].slice(0, 10));
  };

  const { ref } = useZxing({
    onResult(result: any) {
      const code = result.getText();
      if (code !== scannedData) {
        setScannedData(code);
        handleUpdate(code);
      }
    },
  });

  const statusStyles = {
    idle: 'bg-slate-50 border-l-4 border-slate-300 text-slate-500',
    loading: 'bg-sky-50 border-l-4 border-sky-400 text-sky-600',
    success: 'bg-emerald-50 border-l-4 border-emerald-500 text-emerald-700',
    error: 'bg-red-50 border-l-4 border-red-500 text-red-600',
  };

  return (
    <div className="max-w-md mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">재물조사 스캐너</h1>
        <p className="text-slate-500 text-sm mt-1">
          바코드를 스캔하면 자동으로 점검 완료 처리됩니다.
        </p>
      </div>

      {/* Camera Viewfinder */}
      <div className="relative rounded-2xl overflow-hidden shadow-xl border-4 border-white bg-black aspect-square">
        <video ref={ref} className="w-full h-full object-cover" />
        {/* Corner guides */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative w-48 h-48">
            <span className="absolute top-0 left-0 w-7 h-7 border-t-4 border-l-4 border-sky-400 rounded-tl-lg" />
            <span className="absolute top-0 right-0 w-7 h-7 border-t-4 border-r-4 border-sky-400 rounded-tr-lg" />
            <span className="absolute bottom-0 left-0 w-7 h-7 border-b-4 border-l-4 border-sky-400 rounded-bl-lg" />
            <span className="absolute bottom-0 right-0 w-7 h-7 border-b-4 border-r-4 border-sky-400 rounded-br-lg" />
            <div className="absolute inset-x-0 top-1/2 h-0.5 bg-sky-400/40 animate-pulse" />
          </div>
        </div>
      </div>

      {/* Status */}
      <div className={`p-4 rounded-2xl ${statusStyles[status.type]}`}>
        <div className="flex items-center gap-2">
          {status.type === 'loading' && (
            <span className="w-4 h-4 border-2 border-sky-300 border-t-sky-600 rounded-full animate-spin shrink-0" />
          )}
          <p className="text-sm font-bold">{status.msg}</p>
        </div>
      </div>

      {/* Manual Entry */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <p className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider">
          인식이 안 되나요? 직접 입력
        </p>
        <div className="flex gap-2">
          <input
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleUpdate(manual);
                setManual('');
              }
            }}
            className="flex-1 px-3 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 text-sm font-mono transition"
            placeholder="바코드 번호 입력 후 Enter"
          />
          <button
            onClick={() => {
              handleUpdate(manual);
              setManual('');
            }}
            className="bg-slate-800 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-slate-900 transition whitespace-nowrap"
          >
            확인
          </button>
        </div>
      </div>

      {/* Scan History */}
      {history.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              최근 스캔 기록
            </p>
            <button
              onClick={() => setHistory([])}
              className="text-xs text-slate-400 hover:text-red-500 transition font-medium"
            >
              초기화
            </button>
          </div>
          <div className="space-y-1.5">
            {history.map((h, i) => (
              <div
                key={i}
                className={`flex items-center justify-between px-3 py-2 rounded-lg ${
                  h.success ? 'bg-emerald-50' : 'bg-red-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">{h.success ? '✅' : '⚠️'}</span>
                  <span className="font-mono text-sm font-semibold text-slate-700">{h.code}</span>
                </div>
                <span className="text-[11px] text-slate-400">
                  {h.time.toLocaleTimeString('ko-KR', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
