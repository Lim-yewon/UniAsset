'use client';

import React, { useState, useEffect } from 'react';
import { useZxing } from 'react-zxing';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/AuthContext';

type AssetItem = {
  asset_id: string;
  barcode: string;
  model_name: string;
  status: string;
  checked: boolean;
  newStatus: string;
};

type ScanMsg = { msg: string; type: 'idle' | 'success' | 'error' };

export default function ScannerPage() {
  const { user } = useAuth();
  const [assignedRoom, setAssignedRoom] = useState<any>(null);
  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [loadingRoom, setLoadingRoom] = useState(true);
  const [lastScan, setLastScan] = useState('');
  const [scanMsg, setScanMsg] = useState<ScanMsg>({
    msg: '바코드를 카메라에 인식시켜주세요',
    type: 'idle',
  });
  const [manual, setManual] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [submittedCount, setSubmittedCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    fetchAssignment();
  }, [user]);

  const fetchAssignment = async () => {
    setLoadingRoom(true);
    setDone(false);
    setAssets([]);
    setAssignedRoom(null);

    const { data: authData } = await supabase
      .from('authorization')
      .select(
        'target_room_id, room:target_room_id(room_id, room_number, locations:location_id(location_name))'
      )
      .eq('student_id', user!.userId)
      .order('start_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (authData?.target_room_id) {
      setAssignedRoom(authData.room);

      const { data: assetData } = await supabase
        .from('assets')
        .select('asset_id, barcode, model_name, status')
        .eq('room_id', authData.target_room_id)
        .eq('is_rentable', false)
        .order('model_name');

      if (assetData) {
        setAssets(
          assetData.map((a) => ({
            ...a,
            checked: false,
            newStatus: ['수리요망', '수리중', '폐기'].includes(a.status)
              ? a.status
              : '정상',
          }))
        );
      }
    }

    setLoadingRoom(false);
  };

  const flashMsg = (msg: string, type: ScanMsg['type']) => {
    setScanMsg({ msg, type });
    setTimeout(
      () => setScanMsg({ msg: '바코드를 카메라에 인식시켜주세요', type: 'idle' }),
      2500
    );
  };

  const checkByBarcode = (code: string) => {
    setAssets((prev) => {
      const idx = prev.findIndex((a) => a.barcode === code);
      if (idx < 0) {
        flashMsg(`이 강의실에 없는 기자재: ${code}`, 'error');
        return prev;
      }
      if (prev[idx].checked) {
        flashMsg(`이미 체크된 기자재: ${prev[idx].model_name}`, 'idle');
        return prev;
      }
      flashMsg(`${prev[idx].model_name} — 체크 완료`, 'success');
      return prev.map((a, i) => (i === idx ? { ...a, checked: true } : a));
    });
  };

  const { ref } = useZxing({
    onResult(result: any) {
      const code = result.getText();
      if (code !== lastScan) {
        setLastScan(code);
        checkByBarcode(code);
      }
    },
  });

  const checkedCount = assets.filter((a) => a.checked).length;
  const totalCount = assets.length;
  const progress = totalCount === 0 ? 0 : Math.round((checkedCount / totalCount) * 100);

  const handleSubmit = async () => {
    if (checkedCount === 0) {
      alert('체크된 기자재가 없습니다.');
      return;
    }
    if (!window.confirm(`${checkedCount}개 기자재의 재물조사를 완료 처리하시겠습니까?`))
      return;

    setSubmitting(true);
    const updates = assets
      .filter((a) => a.checked)
      .map((a) =>
        supabase
          .from('assets')
          .update({ status: a.newStatus === '정상' ? '점검완료' : a.newStatus })
          .eq('asset_id', a.asset_id)
      );
    await Promise.all(updates);
    setSubmittedCount(checkedCount);
    setSubmitting(false);
    setDone(true);
  };

  const scanMsgStyle: Record<ScanMsg['type'], string> = {
    idle: 'bg-slate-50 border-l-4 border-slate-300 text-slate-500',
    success: 'bg-emerald-50 border-l-4 border-emerald-500 text-emerald-700',
    error: 'bg-red-50 border-l-4 border-red-500 text-red-600',
  };

  /* ── 로딩 ── */
  if (loadingRoom) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin" />
          <p className="text-sm text-slate-400 font-medium">배정 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  /* ── 완료 화면 ── */
  if (done) {
    return (
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 p-12 text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-emerald-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">재물조사 완료</h2>
          <p className="text-slate-500 text-sm mb-1">
            {assignedRoom
              ? `${(assignedRoom.locations as any)?.location_name} ${assignedRoom.room_number}`
              : ''}
          </p>
          <p className="text-2xl font-black text-sky-600 my-4">{submittedCount}개</p>
          <p className="text-slate-400 text-sm mb-8">기자재가 점검 완료 처리되었습니다.</p>
          <button
            onClick={fetchAssignment}
            className="px-6 py-2.5 bg-sky-600 text-white rounded-xl font-semibold text-sm hover:bg-sky-700 transition"
          >
            다시 시작
          </button>
        </div>
      </div>
    );
  }

  /* ── 배정 없음 ── */
  if (!assignedRoom) {
    return (
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-2xl border border-dashed border-amber-300 p-12 text-center">
          <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-slate-800 mb-2">배정된 강의실 없음</h2>
          <p className="text-slate-500 text-sm">
            관리자에게 담당 강의실 배정을 요청하세요.
          </p>
        </div>
      </div>
    );
  }

  /* ── 메인 화면 ── */
  return (
    <div className="max-w-lg mx-auto space-y-4 pb-10">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">재물조사 스캐너</h1>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-slate-500 text-sm">담당 강의실:</span>
          <span className="font-bold text-sky-600 text-sm bg-sky-50 px-2.5 py-0.5 rounded-full">
            {(assignedRoom.locations as any)?.location_name} {assignedRoom.room_number}
          </span>
        </div>
      </div>

      {/* 진행 현황 */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="flex justify-between items-center mb-2">
          <p className="text-sm font-bold text-slate-700">진행 현황</p>
          <span className="text-sm font-black text-sky-600">
            {checkedCount} / {totalCount}개 ({progress}%)
          </span>
        </div>
        <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
          <div
            className="bg-sky-500 h-full rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        {checkedCount === totalCount && totalCount > 0 && (
          <p className="text-emerald-600 text-xs font-bold mt-2 text-center">
            모든 기자재 점검 완료!
          </p>
        )}
      </div>

      {/* 카메라 스캐너 */}
      <div className="space-y-3">
        <div
          className="relative rounded-2xl overflow-hidden shadow-xl border-4 border-white bg-black"
          style={{ aspectRatio: '4/3' }}
        >
          <video ref={ref} className="w-full h-full object-cover" />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative w-44 h-44">
              <span className="absolute top-0 left-0 w-7 h-7 border-t-4 border-l-4 border-sky-400 rounded-tl-lg" />
              <span className="absolute top-0 right-0 w-7 h-7 border-t-4 border-r-4 border-sky-400 rounded-tr-lg" />
              <span className="absolute bottom-0 left-0 w-7 h-7 border-b-4 border-l-4 border-sky-400 rounded-bl-lg" />
              <span className="absolute bottom-0 right-0 w-7 h-7 border-b-4 border-r-4 border-sky-400 rounded-br-lg" />
              <div className="absolute inset-x-0 top-1/2 h-0.5 bg-sky-400/50 animate-pulse" />
            </div>
          </div>
        </div>

        {/* 스캔 상태 */}
        <div className={`p-3 rounded-xl transition-all ${scanMsgStyle[scanMsg.type]}`}>
          <p className="text-sm font-bold">{scanMsg.msg}</p>
        </div>

        {/* 직접 입력 */}
        <div className="flex gap-2">
          <input
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && manual.trim()) {
                checkByBarcode(manual.trim());
                setManual('');
              }
            }}
            className="flex-1 px-3 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 text-sm font-mono transition"
            placeholder="바코드 직접 입력 후 Enter"
          />
          <button
            onClick={() => {
              if (manual.trim()) {
                checkByBarcode(manual.trim());
                setManual('');
              }
            }}
            className="bg-slate-800 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-slate-900 transition"
          >
            확인
          </button>
        </div>
      </div>

      {/* 기자재 체크리스트 */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
            강의실 기자재 목록
          </h2>
          <div className="flex gap-2 text-xs font-bold">
            <button
              onClick={() => setAssets((prev) => prev.map((a) => ({ ...a, checked: true })))}
              className="text-sky-600 hover:underline"
            >
              전체선택
            </button>
            <span className="text-slate-300">|</span>
            <button
              onClick={() => setAssets((prev) => prev.map((a) => ({ ...a, checked: false })))}
              className="text-slate-400 hover:underline"
            >
              초기화
            </button>
          </div>
        </div>

        {assets.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-slate-400 text-sm font-semibold">
              이 강의실에 등록된 기자재가 없습니다.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {assets.map((asset, idx) => (
              <div
                key={asset.asset_id}
                className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                  asset.checked ? 'bg-emerald-50' : 'bg-white'
                }`}
              >
                {/* 체크박스 */}
                <button
                  onClick={() =>
                    setAssets((prev) =>
                      prev.map((a, i) => (i === idx ? { ...a, checked: !a.checked } : a))
                    )
                  }
                  className={`shrink-0 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all active:scale-90 ${
                    asset.checked
                      ? 'bg-emerald-500 border-emerald-500 text-white'
                      : 'border-slate-300 hover:border-sky-400 bg-white'
                  }`}
                >
                  {asset.checked && (
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>

                {/* 기자재 정보 */}
                <div className="flex-1 min-w-0">
                  <p
                    className={`font-semibold text-sm truncate ${
                      asset.checked ? 'text-emerald-800 line-through opacity-70' : 'text-slate-800'
                    }`}
                  >
                    {asset.model_name}
                  </p>
                  <p className="text-xs text-slate-400 font-mono">{asset.barcode}</p>
                </div>

                {/* 상태 선택 */}
                <select
                  value={asset.newStatus}
                  onChange={(e) =>
                    setAssets((prev) =>
                      prev.map((a, i) =>
                        i === idx ? { ...a, newStatus: e.target.value } : a
                      )
                    )
                  }
                  className="shrink-0 text-xs border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:border-sky-500 bg-white"
                >
                  <option value="정상">정상</option>
                  <option value="수리요망">수리요망</option>
                  <option value="수리중">수리중</option>
                  <option value="폐기">폐기</option>
                </select>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 제출 버튼 */}
      <button
        onClick={handleSubmit}
        disabled={submitting || checkedCount === 0}
        className="w-full py-4 bg-sky-600 text-white font-bold rounded-2xl hover:bg-sky-700 transition disabled:opacity-40 disabled:cursor-not-allowed text-sm shadow-lg active:scale-95"
      >
        {submitting ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            처리 중...
          </span>
        ) : (
          `재물조사 완료 제출 (${checkedCount}개 선택됨)`
        )}
      </button>
    </div>
  );
}
