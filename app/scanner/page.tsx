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

export default function ScannerPage() {
  const { user } = useAuth();
  const [assignedRooms, setAssignedRooms]   = useState<any[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  const [assets, setAssets]                 = useState<AssetItem[]>([]);
  const [loadingRoom, setLoadingRoom]       = useState(true);
  const [loadingAssets, setLoadingAssets]   = useState(false);
  const [scanMsg, setScanMsg]               = useState<ScanMsg>({ msg: '바코드를 카메라에 인식시켜주세요', type: 'idle' });
  const [barcodeInput, setBarcodeInput]     = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [submitting, setSubmitting]         = useState(false);
  const [done, setDone]                     = useState(false);
  const [submittedCount, setSubmittedCount] = useState(0);
  const [cameraError, setCameraError]       = useState<string | null>(null);

  // ── refs ──────────────────────────────────────────────────────────────────
  const videoRef           = useRef<HTMLVideoElement>(null);
  const canvasRef          = useRef<HTMLCanvasElement>(null);
  const streamRef          = useRef<MediaStream | null>(null);
  const animFrameRef       = useRef<number>(0);
  const detectorRef        = useRef<any>(null);   // BarcodeDetector (iOS17+/Chrome)
  const quaggaRef          = useRef<any>(null);   // quagga2 폴백 (1D 바코드)
  const quaggaBusyRef      = useRef(false);       // quagga 중복 호출 방지
  const lastQuaggaCallRef  = useRef(0);           // 쓰로틀 타임스탬프
  const scanningRef        = useRef(false);
  const lastScanRef        = useRef('');
  const lastScanTimeRef    = useRef(0);
  const flashTORef         = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef           = useRef<HTMLInputElement>(null);

  // ── 자동완성 ──────────────────────────────────────────────────────────────
  const suggestions = useMemo(() => {
    if (!barcodeInput.trim()) return [];
    const q = barcodeInput.toLowerCase();
    return assets
      .filter(a => a.barcode.toLowerCase().includes(q) || a.model_name.toLowerCase().includes(q))
      .slice(0, 8);
  }, [barcodeInput, assets]);

  // ── 메시지 플래시 ─────────────────────────────────────────────────────────
  const flashMsg = useCallback((msg: string, type: ScanMsg['type']) => {
    if (flashTORef.current) clearTimeout(flashTORef.current);
    setScanMsg({ msg, type });
    if (type === 'success' && 'vibrate' in navigator) navigator.vibrate(80);
    flashTORef.current = setTimeout(
      () => setScanMsg({ msg: '바코드를 카메라에 인식시켜주세요', type: 'idle' }),
      2500,
    );
  }, []);

  // ── 바코드 체크 ───────────────────────────────────────────────────────────
  const checkByBarcode = useCallback((code: string) => {
    const now = Date.now();
    if (code === lastScanRef.current && now - lastScanTimeRef.current < 2000) return;
    lastScanRef.current     = code;
    lastScanTimeRef.current = now;

    setAssets(prev => {
      const idx = prev.findIndex(a => a.barcode === code);
      if (idx < 0)           { flashMsg(`이 강의실에 없는 기자재: ${code}`, 'error'); return prev; }
      if (prev[idx].checked) { flashMsg(`이미 체크됨: ${prev[idx].model_name}`, 'idle');  return prev; }
      flashMsg(`${prev[idx].model_name} — 체크 완료 ✓`, 'success');
      return prev.map((a, i) => (i === idx ? { ...a, checked: true } : a));
    });
  }, [flashMsg]);

  // ── 스캐너 정지 ───────────────────────────────────────────────────────────
  const stopScanner = useCallback(() => {
    scanningRef.current = false;
    if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = 0; }
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  // ── 스캐너 시작 ───────────────────────────────────────────────────────────
  // 전략: ① BarcodeDetector API (iOS 17+/Chrome) → ② quagga2 (1D 바코드 폴백)
  const startScanner = useCallback(async () => {
    stopScanner();
    setCameraError(null);

    // 1. 카메라 스트림 획득
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
    } catch (err: any) {
      if (err.name === 'NotAllowedError')
        setCameraError('카메라 권한이 거부되었습니다. 설정에서 허용해주세요.');
      else if (err.name === 'NotFoundError')
        setCameraError('카메라를 찾을 수 없습니다.');
      else
        setCameraError('카메라를 시작할 수 없습니다. 아래 수동 입력을 이용하세요.');
      return;
    }

    streamRef.current = stream;
    if (!videoRef.current) return;
    videoRef.current.srcObject = stream;

    // 2. BarcodeDetector 초기화
    if (!detectorRef.current && 'BarcodeDetector' in window) {
      try {
        const supported: string[] = await (window as any).BarcodeDetector.getSupportedFormats();
        const want = ['qr_code','code_128','ean_13','ean_8','code_39','data_matrix','upc_a'];
        const formats = want.filter(f => supported.includes(f));
        detectorRef.current = new (window as any).BarcodeDetector({
          formats: formats.length ? formats : ['qr_code'],
        });
      } catch {
        try { detectorRef.current = new (window as any).BarcodeDetector({ formats: ['qr_code'] }); } catch {}
      }
    }

    // 3. quagga2 폴백 로드 — 1D 바코드(Code128 등) 지원 (BarcodeDetector 없는 경우)
    if (!detectorRef.current && !quaggaRef.current) {
      const mod = await import('@ericblade/quagga2');
      quaggaRef.current = mod.default;
    }

    // 4. 스캔 루프 (requestAnimationFrame)
    scanningRef.current = true;

    const loop = async () => {
      if (!scanningRef.current) return;
      const video  = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA) {
        animFrameRef.current = requestAnimationFrame(loop);
        return;
      }

      const w = video.videoWidth;
      const h = video.videoHeight;
      canvas.width  = w;
      canvas.height = h;

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) { animFrameRef.current = requestAnimationFrame(loop); return; }
      ctx.drawImage(video, 0, 0, w, h);

      try {
        let code: string | null = null;

        if (detectorRef.current) {
          // ① BarcodeDetector (iOS 17+ / Chrome Android) — 빠름, 1D 포함
          const hits = await detectorRef.current.detect(canvas);
          if (hits.length) code = hits[0].rawValue;

        } else if (quaggaRef.current && !quaggaBusyRef.current) {
          // ② quagga2 — 1D 바코드 전용 폴백 (iOS 16 이하)
          // 250ms 쓰로틀 + 640px 리사이즈로 성능 최적화
          const now = Date.now();
          if (now - lastQuaggaCallRef.current >= 250) {
            lastQuaggaCallRef.current = now;
            quaggaBusyRef.current = true;

            const PROC_W = 640;
            const scale = Math.min(PROC_W / w, 1);
            const pw = Math.floor(w * scale);
            const ph = Math.floor(h * scale);
            const pc = document.createElement('canvas');
            pc.width = pw; pc.height = ph;
            pc.getContext('2d')?.drawImage(canvas, 0, 0, pw, ph);
            const dataUrl = pc.toDataURL('image/jpeg', 0.8);

            quaggaRef.current.decodeSingle(
              {
                src: dataUrl,
                numOfWorkers: 0,
                locate: true,
                decoder: {
                  readers: ['code_128_reader', 'code_39_reader', 'ean_reader', 'ean_8_reader', 'upc_reader'],
                },
              },
              (result: any) => {
                quaggaBusyRef.current = false;
                if (result?.codeResult?.code) checkByBarcode(result.codeResult.code);
              }
            );
          }
        }

        if (code) checkByBarcode(code);
      } catch {}

      animFrameRef.current = requestAnimationFrame(loop);
    };

    videoRef.current.onloadedmetadata = () => {
      videoRef.current?.play().catch(() => {});
      animFrameRef.current = requestAnimationFrame(loop);
    };
  }, [checkByBarcode, stopScanner]);

  // ── 강의실 목록 ───────────────────────────────────────────────────────────
  const fetchAssignedRooms = useCallback(async () => {
    if (!user) return;
    setLoadingRoom(true);
    const { data: assignData } = await supabase
      .from('work_room_assignment')
      .select('room_id')
      .eq('student_id', user.userId)
      .order('assigned_at', { ascending: true });

    if (!assignData?.length) { setAssignedRooms([]); setLoadingRoom(false); return; }

    const roomIds = assignData.map(d => d.room_id);
    const { data: roomData } = await supabase
      .from('room')
      .select('room_id, room_number, locations:location_id(location_name)')
      .in('room_id', roomIds);

    const rooms = (roomData || []).sort((a, b) => roomIds.indexOf(a.room_id) - roomIds.indexOf(b.room_id));
    setAssignedRooms(rooms);
    if (rooms.length === 1) setSelectedRoomId(rooms[0].room_id);
    setLoadingRoom(false);
  }, [user]);

  // ── 기자재 로드 ───────────────────────────────────────────────────────────
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
        newStatus: ['수리요망','수리중','폐기'].includes(a.status) ? a.status : '정상',
      })));
    }
    setLoadingAssets(false);
  }, []);

  // ── effects ───────────────────────────────────────────────────────────────
  useEffect(() => { if (user) fetchAssignedRooms(); return () => stopScanner(); }, [user]);

  useEffect(() => {
    if (selectedRoomId) { stopScanner(); fetchRoomAssets(selectedRoomId); }
  }, [selectedRoomId]);

  useEffect(() => {
    if (selectedRoomId && assets.length > 0 && !loadingAssets) {
      const t = setTimeout(() => startScanner(), 400);
      return () => clearTimeout(t);
    }
  }, [selectedRoomId, loadingAssets]);

  useEffect(() => () => stopScanner(), [stopScanner]);

  // ── 제출 ──────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (checkedCount === 0) { alert('체크된 기자재가 없습니다.'); return; }
    if (!window.confirm(`${checkedCount}개 기자재의 재물조사를 완료 처리하시겠습니까?`)) return;
    setSubmitting(true);
    stopScanner();
    await Promise.all(
      assets.filter(a => a.checked).map(a =>
        supabase.from('assets')
          .update({ status: a.newStatus === '정상' ? '점검완료' : a.newStatus, last_inspected_at: new Date().toISOString(), last_inspector_id: user?.userId })
          .eq('asset_id', a.asset_id)
      )
    );
    setSubmittedCount(checkedCount);
    setSubmitting(false);
    setDone(true);
  };

  const checkedCount = assets.filter(a => a.checked).length;
  const totalCount   = assets.length;
  const progress     = totalCount === 0 ? 0 : Math.round((checkedCount / totalCount) * 100);
  const selectedRoom = assignedRooms.find(r => r?.room_id === selectedRoomId);

  const scanMsgStyle: Record<ScanMsg['type'], string> = {
    idle:    'bg-slate-800/80 text-slate-200',
    success: 'bg-emerald-600/90 text-white',
    error:   'bg-red-600/90 text-white',
  };

  // ── 로딩 ──────────────────────────────────────────────────────────────────
  if (loadingRoom) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin" />
        <p className="text-sm text-slate-400 font-medium">배정 정보를 불러오는 중...</p>
      </div>
    </div>
  );

  // ── 배정 없음 ─────────────────────────────────────────────────────────────
  if (assignedRooms.length === 0) return (
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

  // ── 완료 화면 ─────────────────────────────────────────────────────────────
  if (done) return (
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
        <p className="text-3xl font-black text-sky-600 my-4">{submittedCount}개</p>
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

  // ── 메인 ──────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-lg mx-auto space-y-4 pb-10">
      {/* 스캔라인 애니메이션 CSS */}
      <style>{`
        @keyframes scanline {
          0%   { transform: translateY(0px); opacity: 0.9; }
          100% { transform: translateY(200px); opacity: 0.5; }
        }
        .scan-line { animation: scanline 1.6s ease-in-out infinite alternate; }
        @keyframes corner-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .corner-pulse { animation: corner-pulse 1.6s ease-in-out infinite; }
      `}</style>

      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">재물조사</h1>
        <p className="text-slate-500 text-sm mt-1">담당 강의실을 선택하고 기자재를 점검하세요.</p>
      </div>

      {/* 강의실 드롭다운 */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">강의실 선택</label>
        <select
          value={selectedRoomId ?? ''}
          onChange={e => setSelectedRoomId(e.target.value ? parseInt(e.target.value) : null)}
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

          {/* 카메라 뷰파인더 */}
          <div className="space-y-2">
            <div className="relative rounded-2xl overflow-hidden bg-black shadow-xl" style={{ aspectRatio: '4/3' }}>
              {/* 비디오 */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover"
              />
              {/* 처리용 캔버스 (숨김) */}
              <canvas ref={canvasRef} className="hidden" />

              {/* 오버레이 */}
              {!cameraError && (
                <div className="absolute inset-0 flex items-center justify-center">
                  {/* 어두운 가장자리 */}
                  <div className="absolute inset-0"
                    style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 25%, transparent 75%, rgba(0,0,0,0.4) 100%)' }}
                  />
                  <div className="absolute inset-0"
                    style={{ background: 'linear-gradient(to right, rgba(0,0,0,0.4) 0%, transparent 25%, transparent 75%, rgba(0,0,0,0.4) 100%)' }}
                  />

                  {/* 스캔 영역 */}
                  <div className="relative w-52 h-52 corner-pulse">
                    {/* 코너 마커 */}
                    {[['top-0 left-0','border-t-3 border-l-3'],
                      ['top-0 right-0','border-t-3 border-r-3'],
                      ['bottom-0 left-0','border-b-3 border-l-3'],
                      ['bottom-0 right-0','border-b-3 border-r-3']].map(([pos, border], i) => (
                      <div key={i} className={`absolute w-7 h-7 ${pos}`}
                        style={{ border: '3px solid transparent', borderTopColor: i < 2 ? '#38bdf8' : 'transparent', borderBottomColor: i >= 2 ? '#38bdf8' : 'transparent', borderLeftColor: i % 2 === 0 ? '#38bdf8' : 'transparent', borderRightColor: i % 2 === 1 ? '#38bdf8' : 'transparent', borderRadius: i === 0 ? '6px 0 0 0' : i === 1 ? '0 6px 0 0' : i === 2 ? '0 0 0 6px' : '0 0 6px 0' }}
                      />
                    ))}

                    {/* 스캔 라인 */}
                    <div className="scan-line absolute left-1 right-1 h-0.5 rounded-full"
                      style={{ background: 'linear-gradient(to right, transparent, #38bdf8, #818cf8, #38bdf8, transparent)', boxShadow: '0 0 8px #38bdf8' }}
                    />
                  </div>
                </div>
              )}

              {/* 카메라 에러 */}
              {cameraError && (
                <div className="absolute inset-0 flex items-center justify-center p-6 bg-slate-900/95">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                      </svg>
                    </div>
                    <p className="text-white text-sm font-semibold mb-1">{cameraError}</p>
                    <button
                      onClick={startScanner}
                      className="mt-3 px-4 py-2 bg-sky-500 text-white rounded-xl text-sm font-bold hover:bg-sky-600 transition"
                    >
                      다시 시도
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 스캔 상태 메시지 */}
            <div className={`px-4 py-2.5 rounded-xl text-sm font-semibold text-center transition-all ${scanMsgStyle[scanMsg.type]}`}>
              {scanMsg.msg}
            </div>

            {/* 바코드 수동 입력 */}
            <div className="relative">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  value={barcodeInput}
                  onChange={e => { setBarcodeInput(e.target.value); setShowSuggestions(true); }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && barcodeInput.trim()) {
                      checkByBarcode(barcodeInput.trim());
                      setBarcodeInput('');
                      setShowSuggestions(false);
                    }
                  }}
                  className="flex-1 px-3 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 text-base font-mono transition bg-white"
                  placeholder="바코드/모델명 직접 입력"
                />
                <button
                  onClick={() => { if (barcodeInput.trim()) { checkByBarcode(barcodeInput.trim()); setBarcodeInput(''); setShowSuggestions(false); } }}
                  className="bg-slate-800 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-slate-900 transition shrink-0"
                >
                  확인
                </button>
              </div>

              {/* 자동완성 */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-20 top-full left-0 right-14 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
                  {suggestions.map(asset => (
                    <button
                      key={asset.asset_id}
                      onMouseDown={() => { checkByBarcode(asset.barcode); setBarcodeInput(''); setShowSuggestions(false); }}
                      className={`w-full flex items-center justify-between px-4 py-2.5 hover:bg-sky-50 transition text-left ${asset.checked ? 'opacity-40' : ''}`}
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
                      onChange={e => setAssets(p => p.map((a, i) => i === idx ? { ...a, newStatus: e.target.value } : a))}
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
