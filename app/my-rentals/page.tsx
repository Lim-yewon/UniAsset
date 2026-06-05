'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/AuthContext';

export default function MyRentalsPage() {
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab]     = useState<'renting' | 'returning' | 'history'>('renting');
  const [rentals, setRentals]         = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [photoModal, setPhotoModal]   = useState<{ open: boolean; url: string | null; name: string }>({
    open: false, url: null, name: '',
  });

  useEffect(() => {
    if (authLoading || !user) return;
    fetchRentals().finally(() => setLoading(false));
  }, [authLoading, user]);

  const fetchRentals = async () => {
    const { data } = await supabase
      .from('rentals')
      .select('rental_id, status, rental_date, return_date, assets(asset_id, model_name, department, asset_image, category, barcode)')
      .eq('user_id', user!.userId)
      .in('status', ['대여중', '반납신청', '반납완료'])
      .order('rental_date', { ascending: false });
    if (data) setRentals(data);
  };

  // 탭별 분류
  const rentingList   = useMemo(() => rentals.filter(r => r.status === '대여중'),   [rentals]);
  const returningList = useMemo(() => rentals.filter(r => r.status === '반납신청'), [rentals]);
  const historyList   = useMemo(() => rentals.filter(r => r.status === '반납완료'), [rentals]);

  // 반납 신청
  const handleReturnRequest = async (rentalId: number) => {
    if (!window.confirm('기자재를 반납 신청하시겠습니까?')) return;
    setActionLoading(String(rentalId));
    const { error } = await supabase
      .from('rentals')
      .update({ status: '반납신청', return_date: new Date().toISOString() })
      .eq('rental_id', rentalId);
    setActionLoading(null);
    if (error) alert('반납 신청 중 오류가 발생했습니다.');
    else { await fetchRentals(); setActiveTab('returning'); }
  };

  if (authLoading || loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin" />
        <p className="text-sm text-slate-400 font-medium">정보를 불러오는 중...</p>
      </div>
    </div>
  );

  // 카드 공통 UI
  const AssetCard = ({ rental, children }: { rental: any; children?: React.ReactNode }) => (
    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
      <div className="flex gap-3">
        <button
          onClick={() => setPhotoModal({ open: true, url: rental.assets?.asset_image || null, name: rental.assets?.model_name || '' })}
          className="shrink-0 w-14 h-14 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center hover:border-sky-300 transition-colors"
        >
          {rental.assets?.asset_image ? (
            <img src={rental.assets.asset_image} alt={rental.assets.model_name} className="w-full h-full object-cover" />
          ) : (
            <svg className="w-5 h-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v13.5a1.5 1.5 0 001.5 1.5z" />
            </svg>
          )}
        </button>
        <div className="flex-1 min-w-0">
          {children}
          <h3 className="font-bold text-slate-800 text-sm leading-snug mt-1">{rental.assets?.model_name}</h3>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {rental.assets?.category && <span className="text-[11px] text-slate-400">{rental.assets.category}</span>}
            {rental.assets?.department && <span className="text-[11px] text-slate-400">{rental.assets.department}</span>}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* 헤더 */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 md:p-5">
        <h1 className="text-lg md:text-xl font-bold text-slate-800">나의 대여 현황</h1>
        <p className="text-sm text-slate-500 mt-1">
          <span className="font-bold text-sky-600">{user?.name}</span>님의 대여 및 반납 내역입니다.
        </p>
        {/* 요약 */}
        <div className="flex gap-3 mt-3">
          <div className="flex-1 bg-emerald-50 rounded-xl p-3 text-center">
            <p className="text-2xl font-black text-emerald-600">{rentingList.length}</p>
            <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">대여 중</p>
          </div>
          <div className="flex-1 bg-orange-50 rounded-xl p-3 text-center">
            <p className="text-2xl font-black text-orange-500">{returningList.length}</p>
            <p className="text-[11px] text-orange-500 font-semibold mt-0.5">반납 신청 중</p>
          </div>
          <div className="flex-1 bg-slate-50 rounded-xl p-3 text-center">
            <p className="text-2xl font-black text-slate-500">{historyList.length}</p>
            <p className="text-[11px] text-slate-400 font-semibold mt-0.5">완료</p>
          </div>
        </div>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
        {([
          { key: 'renting',   label: '대여 중',       count: rentingList.length,   activeColor: 'text-emerald-600', badgeColor: 'bg-emerald-100 text-emerald-600' },
          { key: 'returning', label: '반납 신청 현황', count: returningList.length, activeColor: 'text-orange-600',  badgeColor: 'bg-orange-100 text-orange-600'  },
          { key: 'history',   label: '완료 내역',      count: historyList.length,   activeColor: 'text-slate-600',   badgeColor: 'bg-slate-200 text-slate-500'    },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 px-2 md:px-4 py-2.5 rounded-lg text-xs md:text-sm font-bold transition-all ${
              activeTab === tab.key ? `bg-white shadow-sm ${tab.activeColor}` : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[11px] font-black ${tab.badgeColor}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── 대여 중 탭 ── */}
      {activeTab === 'renting' && (
        <div className="space-y-3">
          {rentingList.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-10 text-center">
              <p className="font-semibold text-slate-600">현재 대여 중인 기자재가 없습니다</p>
              <p className="text-sm text-slate-400 mt-1">대여 신청이 승인되면 여기에 표시됩니다.</p>
            </div>
          ) : (
            <>
              <div className="flex items-start gap-2.5 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                <svg className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                </svg>
                <p className="text-xs text-emerald-700 font-medium">반납 시 <strong>반납 신청</strong> 버튼을 눌러 관리자 승인을 요청하세요.</p>
              </div>
              {rentingList.map(rental => (
                <AssetCard key={rental.rental_id} rental={rental}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-[11px] font-bold">대여 중</span>
                    <span className="text-xs text-slate-400">{new Date(rental.rental_date).toLocaleDateString('ko-KR')} 대여 시작</span>
                  </div>
                  <button
                    onClick={() => handleReturnRequest(rental.rental_id)}
                    disabled={actionLoading === String(rental.rental_id)}
                    className="mt-3 w-full py-2.5 bg-slate-800 text-white rounded-xl text-sm font-bold hover:bg-slate-900 transition disabled:opacity-50 active:scale-95"
                  >
                    {actionLoading === String(rental.rental_id) ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />처리 중...
                      </span>
                    ) : '반납 신청'}
                  </button>
                </AssetCard>
              ))}
            </>
          )}
        </div>
      )}

      {/* ── 반납 신청 현황 탭 ── */}
      {activeTab === 'returning' && (
        <div className="space-y-3">
          <div className="flex items-start gap-2.5 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
            <svg className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15.75h.007v.008H12v-.008z" />
            </svg>
            <p className="text-xs text-orange-700 font-medium">반납 신청은 관리자 확인 후 처리됩니다. 기자재를 담당 부서에 반납 후 대기해주세요.</p>
          </div>

          {returningList.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-10 text-center">
              <p className="font-semibold text-slate-600">반납 신청 중인 기자재가 없습니다</p>
            </div>
          ) : (
            returningList.map(rental => (
              <AssetCard key={rental.rental_id} rental={rental}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-[11px] font-bold">반납 신청 중</span>
                  <span className="text-xs text-slate-400">관리자 승인 대기</span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  신청일: {rental.return_date ? new Date(rental.return_date).toLocaleDateString('ko-KR') : '-'}
                </p>
              </AssetCard>
            ))
          )}
        </div>
      )}

      {/* ── 완료 내역 탭 ── */}
      {activeTab === 'history' && (
        <div className="space-y-3">
          {historyList.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-10 text-center">
              <p className="font-semibold text-slate-600">완료된 대여 내역이 없습니다</p>
            </div>
          ) : (
            historyList.map(rental => (
              <AssetCard key={rental.rental_id} rental={rental}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full text-[11px] font-bold">반납 완료</span>
                </div>
                <div className="flex gap-3 mt-0.5">
                  <p className="text-xs text-slate-400">대여: {new Date(rental.rental_date).toLocaleDateString('ko-KR')}</p>
                  {rental.return_date && (
                    <p className="text-xs text-slate-400">반납: {new Date(rental.return_date).toLocaleDateString('ko-KR')}</p>
                  )}
                </div>
              </AssetCard>
            ))
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
