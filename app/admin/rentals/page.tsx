'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../lib/AuthContext';

type RentalRow = {
  rental_id: number;
  status: string;
  rental_date: string;
  return_date: string | null;
  assets: { asset_id: string; model_name: string; department: string | null; category: string | null; asset_image: string | null; barcode: string } | null;
  User: { name: string } | null;
};

export default function AdminRentalsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'request' | 'return'>('request');
  const [rentals, setRentals]     = useState<RentalRow[]>([]);
  const [loading, setLoading]     = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [myDeptName, setMyDeptName] = useState<string | null>(null);
  const [photoModal, setPhotoModal] = useState<{ open: boolean; url: string | null; name: string }>({ open: false, url: null, name: '' });

  useEffect(() => {
    if (user) init();
  }, [user]);

  const init = async () => {
    // 담당 학과 조회
    let deptName: string | null = null;
    if (user?.role === 'PROFESSOR') {
      const { data } = await supabase.from('major').select('major_name').eq('manager_uuid', user.authUuid).maybeSingle();
      deptName = data?.major_name ?? null;
    } else if (user?.role === 'STAFF') {
      const { data: s } = await supabase.from('staff').select('major_id').eq('user_id', user.userId).maybeSingle();
      if (s?.major_id) {
        const { data: m } = await supabase.from('major').select('major_name').eq('major_id', s.major_id).maybeSingle();
        deptName = m?.major_name ?? null;
      }
    }
    setMyDeptName(deptName);
    await fetchRentals();
  };

  const fetchRentals = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('rentals')
      .select('rental_id, status, rental_date, return_date, assets(asset_id, model_name, department, category, asset_image, barcode), User(name)')
      .in('status', ['대여신청', '반납신청'])
      .order('rental_date', { ascending: true });
    if (error) console.error(error);
    setRentals((data as any) || []);
    setLoading(false);
  };

  // 담당 학과 필터링 (교수: 본인 학과만, 교직원: 전체)
  const filtered = useMemo(() =>
    rentals.filter(r => !myDeptName || r.assets?.department === myDeptName),
  [rentals, myDeptName]);

  const requestList = useMemo(() => filtered.filter(r => r.status === '대여신청'), [filtered]);
  const returnList  = useMemo(() => filtered.filter(r => r.status === '반납신청'),  [filtered]);

  // ── 대여 신청 승인 ──
  const approveRental = async (rentalId: number) => {
    if (!window.confirm('대여 신청을 승인하시겠습니까?')) return;
    setActionLoading(`approve_${rentalId}`);
    await supabase.from('rentals').update({ status: '대여중' }).eq('rental_id', rentalId);
    setActionLoading(null);
    fetchRentals();
  };

  // ── 대여 신청 거절 ──
  const rejectRental = async (rentalId: number) => {
    if (!window.confirm('대여 신청을 거절하시겠습니까?\n신청이 취소되고 학생에게 목록에서 제거됩니다.')) return;
    setActionLoading(`reject_${rentalId}`);
    await supabase.from('rentals').delete().eq('rental_id', rentalId);
    setActionLoading(null);
    fetchRentals();
  };

  // ── 반납 신청 승인 ──
  const approveReturn = async (rentalId: number) => {
    if (!window.confirm('반납을 확인 처리하시겠습니까?')) return;
    setActionLoading(`approve_${rentalId}`);
    await supabase.from('rentals').update({ status: '반납완료' }).eq('rental_id', rentalId);
    setActionLoading(null);
    fetchRentals();
  };

  // ── 반납 신청 거절 (재대여 상태로 복귀) ──
  const rejectReturn = async (rentalId: number) => {
    if (!window.confirm('반납 신청을 거절하고 대여 상태로 되돌리시겠습니까?')) return;
    setActionLoading(`reject_${rentalId}`);
    await supabase.from('rentals').update({ status: '대여중', return_date: null }).eq('rental_id', rentalId);
    setActionLoading(null);
    fetchRentals();
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin" />
        <p className="text-sm text-slate-400 font-medium">데이터를 불러오는 중...</p>
      </div>
    </div>
  );

  const RentalCard = ({ rental, type }: { rental: RentalRow; type: 'request' | 'return' }) => {
    const busy = actionLoading?.includes(String(rental.rental_id));
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
        <div className="flex gap-3">
          {/* 사진 */}
          <button
            onClick={() => setPhotoModal({ open: true, url: rental.assets?.asset_image || null, name: rental.assets?.model_name || '' })}
            className="shrink-0 w-14 h-14 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center hover:border-sky-300 transition-colors"
          >
            {rental.assets?.asset_image
              ? <img src={rental.assets.asset_image} alt={rental.assets.model_name ?? ''} className="w-full h-full object-cover" />
              : <svg className="w-5 h-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v13.5a1.5 1.5 0 001.5 1.5z" />
                </svg>
            }
          </button>

          {/* 정보 */}
          <div className="flex-1 min-w-0">
            {/* 학생 이름 */}
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-sm font-bold text-slate-800">{rental.User?.name ?? '알 수 없음'}</span>
              {rental.assets?.department && (
                <span className="text-[11px] text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded font-bold">{rental.assets.department}</span>
              )}
              {rental.assets?.category && (
                <span className="text-[11px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-bold">{rental.assets.category}</span>
              )}
            </div>
            {/* 기자재 */}
            <p className="text-sm font-semibold text-slate-700 truncate">{rental.assets?.model_name}</p>
            <p className="text-xs text-slate-400 font-mono mt-0.5">{rental.assets?.barcode}</p>
            {/* 날짜 */}
            <p className="text-xs text-slate-400 mt-1">
              {type === 'request'
                ? `신청일: ${new Date(rental.rental_date).toLocaleDateString('ko-KR')}`
                : `반납 신청일: ${rental.return_date ? new Date(rental.return_date).toLocaleDateString('ko-KR') : '-'}`}
            </p>
          </div>
        </div>

        {/* 버튼 */}
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => type === 'request' ? approveRental(rental.rental_id) : approveReturn(rental.rental_id)}
            disabled={!!busy}
            className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition disabled:opacity-50 active:scale-95"
          >
            {busy && actionLoading?.startsWith('approve') ? (
              <span className="flex items-center justify-center gap-1.5">
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />처리 중
              </span>
            ) : type === 'request' ? '대여 승인' : '반납 확인'}
          </button>
          <button
            onClick={() => type === 'request' ? rejectRental(rental.rental_id) : rejectReturn(rental.rental_id)}
            disabled={!!busy}
            className="flex-1 py-2.5 border border-red-200 text-red-600 rounded-xl text-sm font-bold hover:bg-red-50 transition disabled:opacity-50 active:scale-95"
          >
            {type === 'request' ? '거절' : '반납 거절'}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* 헤더 */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 md:p-5">
        <h1 className="text-lg md:text-xl font-bold text-slate-800">대여 신청 관리</h1>
        <p className="text-sm text-slate-500 mt-1">학생들의 대여 및 반납 신청을 승인하거나 거절합니다.</p>
        {myDeptName && (
          <div className="mt-1.5 flex items-center gap-1.5">
            <span className="text-xs text-slate-400">담당 학과:</span>
            <span className="text-xs font-bold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full">{myDeptName}</span>
            <span className="text-xs text-slate-400">신청만 표시 중</span>
          </div>
        )}

        {/* 요약 카드 */}
        <div className="flex gap-3 mt-3">
          <div className="flex-1 bg-amber-50 rounded-xl p-3 text-center">
            <p className="text-2xl font-black text-amber-600">{requestList.length}</p>
            <p className="text-[11px] text-amber-600 font-semibold mt-0.5">대여 신청</p>
          </div>
          <div className="flex-1 bg-orange-50 rounded-xl p-3 text-center">
            <p className="text-2xl font-black text-orange-500">{returnList.length}</p>
            <p className="text-[11px] text-orange-500 font-semibold mt-0.5">반납 신청</p>
          </div>
        </div>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
        <button
          onClick={() => setActiveTab('request')}
          className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'request' ? 'bg-white shadow-sm text-amber-600' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          대여 신청 목록
          {requestList.length > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 bg-amber-100 text-amber-600 rounded-full text-[11px] font-black">{requestList.length}</span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('return')}
          className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'return' ? 'bg-white shadow-sm text-orange-600' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          반납 신청 목록
          {returnList.length > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 bg-orange-100 text-orange-600 rounded-full text-[11px] font-black">{returnList.length}</span>
          )}
        </button>
      </div>

      {/* 대여 신청 목록 */}
      {activeTab === 'request' && (
        <div className="space-y-3">
          {requestList.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="font-semibold text-slate-600">대기 중인 대여 신청이 없습니다</p>
              <p className="text-sm text-slate-400 mt-1">모든 신청이 처리되었습니다.</p>
            </div>
          ) : (
            requestList.map(r => <RentalCard key={r.rental_id} rental={r} type="request" />)
          )}
        </div>
      )}

      {/* 반납 신청 목록 */}
      {activeTab === 'return' && (
        <div className="space-y-3">
          {returnList.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="font-semibold text-slate-600">대기 중인 반납 신청이 없습니다</p>
            </div>
          ) : (
            returnList.map(r => <RentalCard key={r.rental_id} rental={r} type="return" />)
          )}
        </div>
      )}

      {/* 사진 모달 */}
      {photoModal.open && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setPhotoModal({ open: false, url: null, name: '' })}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm truncate">{photoModal.name}</h3>
              <button onClick={() => setPhotoModal({ open: false, url: null, name: '' })} className="p-1.5 rounded-lg hover:bg-slate-100 transition text-slate-400 ml-2 shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            {photoModal.url
              ? <img src={photoModal.url} alt={photoModal.name} className="w-full object-contain max-h-80" />
              : <div className="h-40 flex flex-col items-center justify-center gap-2 bg-slate-50">
                  <svg className="w-10 h-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v13.5a1.5 1.5 0 001.5 1.5z" /></svg>
                  <p className="text-slate-400 text-sm font-semibold">등록된 사진이 없습니다</p>
                </div>
            }
          </div>
        </div>
      )}
    </div>
  );
}
