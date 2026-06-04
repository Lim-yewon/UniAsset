'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/AuthContext';

export default function RentalsPage() {
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'available' | 'my_rentals'>('available');
  const [availableAssets, setAvailableAssets] = useState<any[]>([]);
  const [myRentals, setMyRentals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [myMajor, setMyMajor] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('전체');
  const [photoModal, setPhotoModal] = useState<{ open: boolean; url: string | null; name: string }>({
    open: false, url: null, name: '',
  });

  useEffect(() => {
    if (authLoading || !user) return;
    Promise.all([fetchMajorAndAssets(), fetchMyRentals()]).finally(() => setLoading(false));
  }, [authLoading, user]);

  const fetchMajorAndAssets = async () => {
    const { data: studentData } = await supabase
      .from('student')
      .select('major_id')
      .eq('user_id', user!.userId)
      .maybeSingle();

    let majorName: string | null = null;
    if (studentData?.major_id) {
      const { data: majorData } = await supabase
        .from('major')
        .select('major_name')
        .eq('major_id', studentData.major_id)
        .maybeSingle();
      majorName = majorData?.major_name ?? null;
    }
    setMyMajor(majorName);

    const { data } = await supabase
      .from('assets')
      .select('*, rentals(status)')
      .eq('is_rentable', true)
      .eq('status', '정상');

    if (data) {
      setAvailableAssets(
        data.filter((asset) => {
          if (majorName && asset.department !== majorName) return false;
          return !asset.rentals?.some(
            (r: any) => r.status === '대여중' || r.status === '대여신청'
          );
        })
      );
    }
  };

  const fetchMyRentals = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('rentals')
      .select('rental_id, status, rental_date, return_date, assets(asset_id, model_name, department, asset_image, category)')
      .eq('user_id', user.userId)
      .order('rental_date', { ascending: false });
    if (data) setMyRentals(data);
  };

  const handleRentRequest = async (assetId: string) => {
    if (!user || !window.confirm('이 기자재를 대여 신청하시겠습니까?')) return;
    setActionLoading(assetId);
    const { error } = await supabase.from('rentals').insert({
      asset_id: assetId,
      user_id: user.userId,
      status: '대여신청',
      rental_date: new Date().toISOString(),
    });
    setActionLoading(null);
    if (error) alert('신청 중 오류가 발생했습니다.');
    else fetchMajorAndAssets();
  };

  const handleReturnRequest = async (rentalId: number) => {
    if (!window.confirm('기자재를 반납 신청하시겠습니까?')) return;
    setActionLoading(String(rentalId));
    const { error } = await supabase
      .from('rentals')
      .update({ status: '반납신청', return_date: new Date().toISOString() })
      .eq('rental_id', rentalId);
    setActionLoading(null);
    if (error) alert('반납 처리 중 오류가 발생했습니다.');
    else fetchMyRentals();
  };

  // 카테고리 목록
  const categories = useMemo(() => {
    const cats = availableAssets.map(a => a.category || '기타').filter(Boolean);
    return ['전체', ...Array.from(new Set(cats)).sort()];
  }, [availableAssets]);

  // 카테고리 필터 적용
  const filteredAssets = useMemo(() => {
    if (selectedCategory === '전체') return availableAssets;
    return availableAssets.filter(a => (a.category || '기타') === selectedCategory);
  }, [availableAssets, selectedCategory]);

  const rentalStatusStyle: Record<string, string> = {
    대여신청: 'bg-amber-100 text-amber-700',
    대여중: 'bg-emerald-100 text-emerald-700',
    반납신청: 'bg-orange-100 text-orange-700',
    반납완료: 'bg-slate-100 text-slate-600',
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin" />
          <p className="text-sm text-slate-400 font-medium">정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* 헤더 */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 md:p-5">
        <h1 className="text-lg md:text-xl font-bold text-slate-800">기자재 대여 / 반납</h1>
        <p className="text-sm text-slate-500 mt-1">
          반갑습니다, <span className="font-bold text-sky-600">{user?.name}</span>님.
        </p>
        {myMajor && (
          <div className="mt-1.5 flex items-center gap-1.5">
            <span className="text-xs text-slate-400">소속 학과:</span>
            <span className="text-xs font-bold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full">
              {myMajor}
            </span>
            <span className="text-xs text-slate-400">기자재만 표시 중</span>
          </div>
        )}
      </div>

      {/* 탭 */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-full md:w-fit">
        <button
          onClick={() => setActiveTab('available')}
          className={`flex-1 md:flex-none px-4 md:px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'available' ? 'bg-white shadow-sm text-sky-600' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          대여 가능 목록
          {availableAssets.length > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 bg-sky-100 text-sky-600 rounded-full text-[11px] font-black">
              {availableAssets.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('my_rentals')}
          className={`flex-1 md:flex-none px-4 md:px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'my_rentals' ? 'bg-white shadow-sm text-sky-600' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          나의 대여 현황
          {myRentals.filter(r => r.status === '대여중').length > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 bg-emerald-100 text-emerald-600 rounded-full text-[11px] font-black">
              {myRentals.filter(r => r.status === '대여중').length}
            </span>
          )}
        </button>
      </div>

      {/* 카테고리 필터 (대여 가능 탭에서만) */}
      {activeTab === 'available' && categories.length > 2 && (
        <div className="flex items-center gap-2 px-1">
          <span className="text-xs font-semibold text-slate-500 shrink-0">카테고리</span>
          <div className="flex gap-1.5 overflow-x-auto pb-1 flex-1">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                  selectedCategory === cat
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-600 hover:border-sky-300'
                }`}
              >
                {cat}
                {cat !== '전체' && (
                  <span className="ml-1 opacity-70">
                    {availableAssets.filter(a => (a.category || '기타') === cat).length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 대여 가능 목록 */}
      {activeTab === 'available' && (
        <div className="space-y-3">
          {filteredAssets.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-10 text-center">
              <p className="font-semibold text-slate-600">
                {selectedCategory === '전체' ? '대여 가능한 기자재가 없습니다' : `${selectedCategory} 카테고리의 기자재가 없습니다`}
              </p>
              <p className="text-sm text-slate-400 mt-1">잠시 후 다시 확인해 주세요.</p>
            </div>
          ) : (
            filteredAssets.map((asset) => (
              <div
                key={asset.asset_id}
                className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 hover:border-sky-300 transition-colors"
              >
                <div className="flex gap-3">
                  {/* 사진 썸네일 */}
                  <button
                    onClick={() => setPhotoModal({ open: true, url: asset.asset_image || null, name: asset.model_name })}
                    className="shrink-0 w-16 h-16 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center hover:border-sky-300 transition-colors"
                  >
                    {asset.asset_image ? (
                      <img src={asset.asset_image} alt={asset.model_name} className="w-full h-full object-cover" />
                    ) : (
                      <svg className="w-6 h-6 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v13.5a1.5 1.5 0 001.5 1.5z" />
                      </svg>
                    )}
                  </button>

                  {/* 정보 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {asset.category && (
                        <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          {asset.category}
                        </span>
                      )}
                      {asset.department && (
                        <span className="text-[11px] font-bold text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded">
                          {asset.department}
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-slate-800 mt-1 text-sm leading-snug">{asset.model_name}</h3>
                    <p className="text-xs text-slate-400 mt-0.5 font-mono">{asset.barcode}</p>
                  </div>
                </div>

                <button
                  onClick={() => handleRentRequest(asset.asset_id)}
                  disabled={actionLoading === asset.asset_id}
                  className="mt-3 w-full py-2.5 bg-sky-600 text-white rounded-xl text-sm font-bold hover:bg-sky-700 transition disabled:opacity-50 active:scale-95"
                >
                  {actionLoading === asset.asset_id ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      신청 중...
                    </span>
                  ) : '대여 신청'}
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* 나의 대여 현황 */}
      {activeTab === 'my_rentals' && (
        <div className="space-y-3">
          {myRentals.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-10 text-center">
              <p className="font-semibold text-slate-600">대여 내역이 없습니다</p>
              <p className="text-sm text-slate-400 mt-1">대여 가능 목록에서 기자재를 신청해보세요.</p>
            </div>
          ) : (
            myRentals.map((rental) => (
              <div key={rental.rental_id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex gap-3">
                  {/* 사진 썸네일 */}
                  <button
                    onClick={() => setPhotoModal({
                      open: true,
                      url: rental.assets?.asset_image || null,
                      name: rental.assets?.model_name || '',
                    })}
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
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${rentalStatusStyle[rental.status] ?? 'bg-slate-100 text-slate-600'}`}>
                        {rental.status}
                      </span>
                      <span className="text-xs text-slate-400">
                        {new Date(rental.rental_date).toLocaleDateString('ko-KR')} 신청
                      </span>
                    </div>
                    <h3 className="font-bold text-slate-800 text-sm leading-snug">{rental.assets?.model_name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {rental.assets?.category && <span className="mr-1.5">{rental.assets.category}</span>}
                      {rental.assets?.department ?? '미지정'}
                    </p>
                  </div>
                </div>

                {rental.status === '대여중' && (
                  <button
                    onClick={() => handleReturnRequest(rental.rental_id)}
                    disabled={actionLoading === String(rental.rental_id)}
                    className="mt-3 w-full py-2.5 bg-slate-800 text-white rounded-xl text-sm font-bold hover:bg-slate-900 transition disabled:opacity-50 active:scale-95"
                  >
                    {actionLoading === String(rental.rental_id) ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        처리 중...
                      </span>
                    ) : '반납하기'}
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* 사진 모달 */}
      {photoModal.open && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setPhotoModal({ open: false, url: null, name: '' })}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm truncate">{photoModal.name}</h3>
              <button
                onClick={() => setPhotoModal({ open: false, url: null, name: '' })}
                className="p-1.5 rounded-lg hover:bg-slate-100 transition text-slate-400 ml-2 shrink-0"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {photoModal.url ? (
              <img src={photoModal.url} alt={photoModal.name} className="w-full object-contain max-h-80" />
            ) : (
              <div className="h-40 flex flex-col items-center justify-center gap-2 bg-slate-50">
                <svg className="w-10 h-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v13.5a1.5 1.5 0 001.5 1.5z" />
                </svg>
                <p className="text-slate-400 text-sm font-semibold">등록된 사진이 없습니다</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
