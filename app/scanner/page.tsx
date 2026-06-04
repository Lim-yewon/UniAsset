'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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

const SCANNER_ID = 'uniasset-qr-scanner';

export default function ScannerPage() {
  const { user } = useAuth();
  const [assignedRooms, setAssignedRooms] = useState<any[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [loadingRoom, setLoadingRoom] = useState(true);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [scanMsg, setScanMsg] = useState<ScanMsg>({ msg: '바코드를 카메라에 인식시켜주세요', type: 'idle' });
  const [barcodeInput, setBarcodeInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [submittedCount, setSubmittedCount] = useState(0);

  const scannerRef = useRef<any>(null);
  const lastScanRef = useRef('');
  const lastScanTimeRef = useRef(0);
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 자동완성 후보 (바코드 또는 모델명으로 검색)
  const suggestions = useMemo(() => {
    if (!barcodeInput.trim() || barcodeInput.length < 1) return [];
    const q = barcodeInput.toLowerCase();
    return assets
      .filter(a => a.barcode.toLowerCase().includes(q) || a.model_name.toLowerCase().includes(q))
      .slice(0, 8);
  }, [barcodeInput, assets]);

  const flashMsg = useCallback((msg: string, type: ScanMsg['type']) => {
    if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    setScanMsg({ msg, type });
    flashTimeoutRef.current = setTimeout(
      () => setScanMsg({ msg: '바코드를 카메라에 인식시켜주세요', type: 'idle' }),
      2500
    );
  }, []);

  const checkByBarcode = useCallback((code: string) => {
    const now = Date.now();
    if (code === lastScanRef.current && now - lastScanTimeRef.current < 2000) return;
    lastScanRef.current = code;
    lastScanTimeRef.current = now;

    setAssets((prev) => {
      const idx = prev.findIndex((a) => a.barcode === code);
      if (idx < 0) {
        flashMsg(`이 강의실에 없는 기자재: ${code}`, 'error');
        return prev;
      }
      if (prev[idx].checked) {
        flashMsg(`이미 체크됨: ${prev[idx].model_name}`, 'idle');
        return prev;
      }
      flashMsg(`${prev[idx].model_name} — 체크 완료`, 'success');
      return prev.map((a, i) => (i === idx ? { ...a, checked: true } : a));
    });
  }, [flashMsg]);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); scannerRef.current.clear(); } catch (_) {}
      scannerRef.current = null;
    }
  }, []);

  const startScanner = useCallback(async () => {
    await stopScanner();
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const scanner = new Html5Qrcode(SCANNER_ID);
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (decodedText: string) => checkByBarcode(decodedText),
        undefined
      );
    } catch (err) {
      console.error('카메라 시작 실패:', err);
    }
  }, [checkByBarcode, stopScanner]);

  // 배정된 강의실 목록 로드 (FK join 대신 두 단계 조회)
  const fetchAssignedRooms = useCallback(async () => {
    if (!user) return;
    setLoadingRoom(true);

    // 1단계: 배정된 room_id 목록
    const { data: assignData } = await supabase
      .from('work_room_assignment')
      .select('room_id')
      .eq('student_id', user.userId)
      .order('assigned_at', { ascending: true });

    if (!assignData || assignData.length === 0) {
      setAssignedRooms([]);
      setLoadingRoom(false);
      return;
    }

    const roomIds = assignData.map(d => d.room_id);

    // 2단계: room 정보 별도 조회
    const { data: roomData } = await supabase
      .from('room')
      .select('room_id, room_number, locations:location_id(location_name)')
      .in('room_id', roomIds);

    const rooms = (roomData || []).sort(
      (a, b) => roomIds.indexOf(a.room_id) - roomIds.indexOf(b.room_id)
    );
    setAssignedRooms(rooms);

    // 강의실이 1개면 자동 선택
    if (rooms.length === 1) {
      setSelectedRoomId(rooms[0].room_id);
    }
    setLoadingRoom(false);
  }, [user]);

  // 선택된 강의실의 기자재 로드
  const fetchRoomAssets = useCallback(async (roomId: number) => {
    setLoadingAssets(true);
    setAssets([]);
    setDone(false);

    const { data } = await supabase
      .from('assets')
      .select('asset_id, barcode, model_name, status')
      .eq('room_id', roomId)
      .eq('is_rentable', false)
      .order('model_name');

    if (data) {
      setAssets(data.map(a => ({
        ...a,
        checked: false,
        newStatus: ['수리요망', '수리중', '폐기'].includes(a.status) ? a.status : '정상',
      })));
    }
    setLoadingAssets(false);
  }, []);

  useEffect(() => {
    if (user) fetchAssignedRooms();
    return () => { stopScanner(); };
  }, [user]);

  useEffect(() => {
    if (selectedRoomId) {
      stopScanner(); // 이전 스캐너 정지
      fetchRoomAssets(selectedRoomId);
    }
  }, [selectedRoomId]);

  useEffect(() => {
    if (selectedRoomId && assets.length > 0 && !loadingAssets) {
      const timer = setTimeout(() => startScanner(), 300);
      return () => clearTimeout(timer);
    }
  }, [selectedRoomId, loadingAssets]);

  useEffect(() => { return () => { stopScanner(); }; }, [stopScanner]);

  const checkedCount = assets.filter(a => a.checked).length;
  const totalCount = assets.length;
  const progress = totalCount === 0 ? 0 : Math.round((checkedCount / totalCount) * 100);

  const selectedRoom = assignedRooms.find(r => r?.room_id === selectedRoomId);

  const handleSubmit = async () => {
    if (checkedCount === 0) { alert('체크된 기자재가 없습니다.'); return; }
    if (!window.confirm(`${checkedCount}개 기자재의 재물조사를 완료 처리하시겠습니까?`)) return;
    setSubmitting(true);
    await stopScanner();
    await Promise.all(
      assets.filter(a => a.checked).map(a =>
        supabase.from('assets')
          .update({ status: a.newStatus === '정상' ? '점검완료' : a.newStatus })
          .eq('asset_id', a.asset_id)
      )
    );
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

  /* ── 배정 없음 ── */
  if (assignedRooms.length === 0) {
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
          <p className="text-slate-500 text-sm">관리자에게 담당 강의실 배정을 요청하세요.</p>
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
            <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">재물조사 완료</h2>
          <p className="text-slate-500 text-sm mb-1">
            {selectedRoom ? `${(selectedRoom.locations as any)?.location_name} ${selectedRoom.room_number}` : ''}
          </p>
          <p className="text-2xl font-black text-sky-600 my-4">{submittedCount}개</p>
          <p className="text-slate-400 text-sm mb-8">기자재가 점검 완료 처리되었습니다.</p>
          <button
            onClick={() => { setDone(false); if (selectedRoomId) fetchRoomAssets(selectedRoomId); }}
            className="px-6 py-2.5 bg-sky-600 text-white rounded-xl font-semibold text-sm hover:bg-sky-700 transition"
          >
            다시 시작
          </button>
        </div>
      </div>
    );
  }

  /* ── 메인 ── */
  return (
    <div className="max-w-lg mx-auto space-y-4 pb-10">
      {/* 헤더 + 강의실 선택 */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">재물조사</h1>
        <p className="text-slate-500 text-sm mt-1">담당 강의실을 선택하고 기자재를 점검하세요.</p>
      </div>

      {/* 강의실 드롭다운 */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
          강의실 선택
        </label>
        <select
          value={selectedRoomId ?? ''}
          onChange={(e) => {
            setSelectedRoomId(e.target.value ? parseInt(e.target.value) : null);
          }}
          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 bg-white text-sm font-semibold text-slate-700"
        >
          <option value="">강의실을 선택하세요</option>
          {assignedRooms.map(r => (
            <option key={r?.room_id} value={r?.room_id}>
              {(r?.locations as any)?.location_name} — {r?.room_number}
            </option>
          ))}
        </select>
      </div>

      {selectedRoomId && (
        <>
          {/* 진행 현황 */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm font-bold text-slate-700">진행 현황</p>
              <span className="text-sm font-black text-sky-600">{checkedCount} / {totalCount}개 ({progress}%)</span>
            </div>
            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
              <div className="bg-sky-500 h-full rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
            {checkedCount === totalCount && totalCount > 0 && (
              <p className="text-emerald-600 text-xs font-bold mt-2 text-center">모든 기자재 점검 완료!</p>
            )}
          </div>

          {/* 카메라 스캐너 */}
          <div className="space-y-3">
            <div className="rounded-2xl overflow-hidden shadow-xl border-4 border-white bg-black" style={{ aspectRatio: '4/3' }}>
              <div id={SCANNER_ID} className="w-full" style={{ minHeight: '260px' }} />
            </div>

            <div className={`p-3 rounded-xl transition-all ${scanMsgStyle[scanMsg.type]}`}>
              <p className="text-sm font-bold">{scanMsg.msg}</p>
            </div>

            {/* 바코드 직접 입력 + 자동완성 */}
            <div className="relative">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  value={barcodeInput}
                  onChange={(e) => {
                    setBarcodeInput(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && barcodeInput.trim()) {
                      checkByBarcode(barcodeInput.trim());
                      setBarcodeInput('');
                      setShowSuggestions(false);
                    }
                  }}
                  className="flex-1 px-3 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 text-base font-mono transition"
                  placeholder="바코드/모델명 입력 후 Enter"
                />
                <button
                  onClick={() => {
                    if (barcodeInput.trim()) {
                      checkByBarcode(barcodeInput.trim());
                      setBarcodeInput('');
                      setShowSuggestions(false);
                    }
                  }}
                  className="bg-slate-800 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-slate-900 transition shrink-0"
                >
                  확인
                </button>
              </div>

              {/* 자동완성 드롭다운 */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-20 top-full left-0 right-12 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                  {suggestions.map((asset) => (
                    <button
                      key={asset.asset_id}
                      onMouseDown={() => {
                        checkByBarcode(asset.barcode);
                        setBarcodeInput('');
                        setShowSuggestions(false);
                      }}
                      className={`w-full flex items-center justify-between px-4 py-2.5 hover:bg-sky-50 transition text-left ${
                        asset.checked ? 'opacity-40' : ''
                      }`}
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-800 truncate">{asset.model_name}</p>
                        <p className="text-xs text-slate-400 font-mono">{asset.barcode}</p>
                      </div>
                      {asset.checked && (
                        <svg className="w-4 h-4 text-emerald-500 shrink-0 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 기자재 체크리스트 */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">기자재 목록</h2>
              <div className="flex gap-2 text-xs font-bold">
                <button onClick={() => setAssets(p => p.map(a => ({ ...a, checked: true })))} className="text-sky-600 hover:underline">전체선택</button>
                <span className="text-slate-300">|</span>
                <button onClick={() => setAssets(p => p.map(a => ({ ...a, checked: false })))} className="text-slate-400 hover:underline">초기화</button>
              </div>
            </div>

            {loadingAssets ? (
              <div className="p-8 flex justify-center">
                <div className="w-6 h-6 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin" />
              </div>
            ) : assets.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-slate-400 text-sm font-semibold">이 강의실에 등록된 기자재가 없습니다.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {assets.map((asset, idx) => (
                  <div
                    key={asset.asset_id}
                    className={`flex items-center gap-3 px-4 py-3 transition-colors ${asset.checked ? 'bg-emerald-50' : 'bg-white'}`}
                  >
                    <button
                      onClick={() => setAssets(p => p.map((a, i) => i === idx ? { ...a, checked: !a.checked } : a))}
                      className={`shrink-0 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all active:scale-90 ${
                        asset.checked ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 hover:border-sky-400 bg-white'
                      }`}
                    >
                      {asset.checked && (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold text-sm truncate ${asset.checked ? 'text-emerald-800 line-through opacity-70' : 'text-slate-800'}`}>
                        {asset.model_name}
                      </p>
                      <p className="text-xs text-slate-400 font-mono">{asset.barcode}</p>
                    </div>

                    <select
                      value={asset.newStatus}
                      onChange={(e) => setAssets(p => p.map((a, i) => i === idx ? { ...a, newStatus: e.target.value } : a))}
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

          {/* 제출 */}
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
            ) : `재물조사 완료 제출 (${checkedCount}개 선택됨)`}
          </button>
        </>
      )}
    </div>
  );
}
