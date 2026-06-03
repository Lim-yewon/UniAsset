'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/AuthContext';

export default function RentalsPage() {
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'available' | 'my_rentals'>('available');
  const [availableAssets, setAvailableAssets] = useState<any[]>([]);
  const [myRentals, setMyRentals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !user) return;
    Promise.all([fetchAssets(), fetchMyRentals()]).finally(() => setLoading(false));
  }, [authLoading, user]);

  const fetchAssets = async () => {
    const { data } = await supabase
      .from('assets')
      .select('*, rentals(status)')
      .eq('is_rentable', true)
      .eq('status', '정상');

    if (data) {
      setAvailableAssets(
        data.filter(
          (asset) =>
            !asset.rentals?.some(
              (r: any) => r.status === '대여중' || r.status === '대여신청'
            )
        )
      );
    }
  };

  const fetchMyRentals = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('rentals')
      .select('rental_id, status, rental_date, return_date, assets(asset_id, model_name, department)')
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

    if (error) {
      alert('신청 중 오류가 발생했습니다.');
    } else {
      fetchAssets();
    }
  };

  const handleReturnRequest = async (rentalId: number) => {
    if (!window.confirm('기자재를 반납 신청하시겠습니까?')) return;
    setActionLoading(String(rentalId));

    const { error } = await supabase
      .from('rentals')
      .update({ status: '반납신청', return_date: new Date().toISOString() })
      .eq('rental_id', rentalId);

    setActionLoading(null);

    if (error) {
      alert('반납 처리 중 오류가 발생했습니다.');
    } else {
      fetchMyRentals();
    }
  };

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
      {/* Profile Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 md:p-5">
        <h1 className="text-lg md:text-xl font-bold text-slate-800">기자재 대여 / 반납</h1>
        <p className="text-sm text-slate-500 mt-1">
          반갑습니다,{' '}
          <span className="font-bold text-sky-600">{user?.name}</span>님.
          대여 가능한 기자재 목록을 확인하세요.
        </p>
      </div>

      {/* Tab Switcher — 모바일에서 전체 너비 */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-full md:w-fit">
        <button
          onClick={() => setActiveTab('available')}
          className={`flex-1 md:flex-none px-4 md:px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'available'
              ? 'bg-white shadow-sm text-sky-600'
              : 'text-slate-500 hover:text-slate-700'
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
            activeTab === 'my_rentals'
              ? 'bg-white shadow-sm text-sky-600'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          나의 대여 현황
          {myRentals.filter((r) => r.status === '대여중').length > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 bg-emerald-100 text-emerald-600 rounded-full text-[11px] font-black">
              {myRentals.filter((r) => r.status === '대여중').length}
            </span>
          )}
        </button>
      </div>

      {/* Available Assets */}
      {activeTab === 'available' && (
        <div className="space-y-3">
          {availableAssets.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-10 text-center">
              <p className="font-semibold text-slate-600">대여 가능한 기자재가 없습니다</p>
              <p className="text-sm text-slate-400 mt-1">잠시 후 다시 확인해 주세요.</p>
            </div>
          ) : (
            availableAssets.map((asset) => (
              <div
                key={asset.asset_id}
                className="bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-slate-200 hover:border-sky-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    {asset.department && (
                      <span className="text-xs font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-md">
                        {asset.department}
                      </span>
                    )}
                    <h3 className="font-bold text-slate-800 mt-1.5 text-base leading-snug">
                      {asset.model_name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5 font-mono">{asset.asset_id}</p>
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
                  ) : (
                    '대여 신청'
                  )}
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* My Rentals */}
      {activeTab === 'my_rentals' && (
        <div className="space-y-3">
          {myRentals.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-10 text-center">
              <p className="font-semibold text-slate-600">대여 내역이 없습니다</p>
              <p className="text-sm text-slate-400 mt-1">대여 가능 목록에서 기자재를 신청해보세요.</p>
            </div>
          ) : (
            myRentals.map((rental) => (
              <div
                key={rental.rental_id}
                className="bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-slate-200"
              >
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                      rentalStatusStyle[rental.status] ?? 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {rental.status}
                  </span>
                  <span className="text-xs text-slate-400">
                    {new Date(rental.rental_date).toLocaleDateString('ko-KR')} 신청
                  </span>
                </div>
                <h3 className="font-bold text-slate-800 text-base">{rental.assets?.model_name}</h3>
                <p className="text-sm text-slate-500 mt-0.5">
                  관리 부서: {rental.assets?.department ?? '미지정'}
                </p>
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
                    ) : (
                      '반납하기'
                    )}
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
