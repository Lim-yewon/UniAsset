'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';

export default function StudentPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'available' | 'my_rentals'>('available');
  
  const [currentUserInfo, setCurrentUserInfo] = useState<any>(null);
  const [availableAssets, setAvailableAssets] = useState<any[]>([]);
  const [myRentals, setMyRentals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. 초기 데이터 로드 (내 정보 및 소속 학과 조회)
  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      
      // 현재 로그인한 Supabase Auth 유저 확인
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) {
        router.push('/login');
        return;
      }

      // 부모 테이블(User)에서 내 학번과 자식 테이블(student -> major)을 조인하여 소속 학과명을 가져옵니다.
      const { data: userData } = await supabase
        .from('User')
        .select(`
          user_id, 
          name, 
          role,
          student (
            major_id,
            major (
              major_name
            )
          )
        `)
        .eq('user_uuid', authData.user.id)
        .single();
        
      if (userData) {
        setCurrentUserInfo(userData);
        
        // 학생 관계 데이터에서 최종 학과명 추출 (예: '컴퓨터공학')
        const studentDept = (userData.student as any)?.major?.major_name;
        
        // 학과 정보가 존재할 때만 해당 학과의 자산 목록을 조회합니다.
        if (studentDept) {
          fetchAssets(studentDept);
        }
        fetchMyRentals(userData.user_id);
      }
      setLoading(false);
    };

    fetchInitialData();
  }, [activeTab]);

  // 2. 소속 학과의 대여 가능한 기자재 목록만 불러오기
  const fetchAssets = async (departmentName: string) => {
    // 대여용(is_rentable = true)이면서 정상 상태이고, 소속 학과가 일치하는 자산 조회
    const { data, error } = await supabase
      .from('assets')
      .select('*, rentals(status)')
      .eq('is_rentable', true)
      .eq('status', '정상')
      .eq('department', departmentName); // 🌟 내 학과 데이터만 필터링
      
    if (data) {
      // rentals 내역 중 현재 '대여중'이거나 '대여신청' 상태인 자산은 제외
      const filteredAssets = data.filter(asset => {
        const isCurrentlyRented = asset.rentals?.some((r: any) => 
          r.status === '대여중' || r.status === '대여신청'
        );
        return !isCurrentlyRented;
      });
      setAvailableAssets(filteredAssets);
    }
  };

  // 3. 나의 대여 현황 불러오기
  const fetchMyRentals = async (userId: string) => {
    const { data, error } = await supabase
      .from('rentals')
      .select('rental_id, status, rental_date, return_date, assets(asset_id, model_name, department)')
      .eq('user_id', userId)
      .order('rental_date', { ascending: false });

    if (data) setMyRentals(data);
  };

  // 4. 대여 신청 액션
  const handleRentRequest = async (assetId: string) => {
    if (!window.confirm('이 기자재를 대여 신청하시겠습니까?')) return;

    const { error } = await supabase
      .from('rentals')
      .insert({
        asset_id: assetId,
        user_id: currentUserInfo.user_id,
        status: '대여신청',
        rental_date: new Date().toISOString(),
      });

    if (error) {
      alert('신청 중 오류가 발생했습니다.');
    } else {
      alert('대여 신청이 완료되었습니다. 관리자 승인을 기다려주세요.');
      const studentDept = (currentUserInfo.student as any)?.major?.major_name;
      if (studentDept) fetchAssets(studentDept);
    }
  };

  // 5. 반납 신청 액션
  const handleReturnRequest = async (rentalId: number) => {
    if (!window.confirm('기자재를 반납하시겠습니까?')) return;

    const { error } = await supabase
      .from('rentals')
      .update({ status: '반납신청', return_date: new Date().toISOString() })
      .eq('rental_id', rentalId);

    if (error) {
      alert('반납 처리 중 오류가 발생했습니다.');
    } else {
      alert('반납 신청이 접수되었습니다.');
      fetchMyRentals(currentUserInfo.user_id);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) return <div className="p-8 text-center text-gray-500">로딩 중...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* 상단 프로필 헤더 */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-200 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">기자재 대여/반납 시스템</h1>
            <p className="text-sm text-gray-500 mt-1">
              반갑습니다, <span className="font-bold text-blue-600">{currentUserInfo?.name}</span>님. 
              소속 학과(<span className="font-semibold text-gray-700">{(currentUserInfo?.student as any)?.major?.major_name}</span>)의 자산만 조회가 가능합니다.
            </p>
          </div>
          <button onClick={handleLogout} className="px-4 py-2 bg-gray-100 text-gray-600 text-sm rounded-lg font-bold hover:bg-gray-200 transition">
            로그아웃
          </button>
        </div>

        {/* 탭 버튼 메커니즘 */}
        <div className="flex gap-2 bg-gray-200 p-1 rounded-xl w-fit">
          <button 
            onClick={() => setActiveTab('available')}
            className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'available' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            대여 가능 목록
          </button>
          <button 
            onClick={() => setActiveTab('my_rentals')}
            className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'my_rentals' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            나의 대여 현황
          </button>
        </div>

        {/* 탭 영역 분기 처리 */}
        {activeTab === 'available' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableAssets.length === 0 ? (
              <div className="col-span-full p-8 text-center text-gray-500 bg-white rounded-2xl border border-gray-200">
                현재 대여 가능한 소속 학과의 기자재가 없습니다.
              </div>
            ) : (
              availableAssets.map(asset => (
                <div key={asset.asset_id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 flex justify-between items-center hover:border-blue-300 transition-colors">
                  <div>
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md">{asset.department}</span>
                    <h3 className="font-bold text-gray-800 mt-2 text-lg">{asset.model_name}</h3>
                    <p className="text-sm text-gray-500 mt-1">자산 ID: {asset.asset_id}</p>
                  </div>
                  <button 
                    onClick={() => handleRentRequest(asset.asset_id)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition shadow-sm"
                  >
                    대여 신청
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'my_rentals' && (
          <div className="space-y-4">
            {myRentals.length === 0 ? (
              <div className="p-8 text-center text-gray-500 bg-white rounded-2xl border border-gray-200">
                신청 내역 또는 대여 중인 자산이 존재하지 않습니다.
              </div>
            ) : (
              myRentals.map(rental => (
                <div key={rental.rental_id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 rounded-md text-xs font-bold 
                        ${rental.status === '대여중' ? 'bg-green-100 text-green-700' : 
                          rental.status === '대여신청' ? 'bg-yellow-100 text-yellow-700' : 
                          rental.status === '반납신청' ? 'bg-orange-100 text-orange-700' :
                          'bg-gray-100 text-gray-600'}`}>
                        {rental.status}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(rental.rental_date).toLocaleDateString()} 처리
                      </span>
                    </div>
                    <h3 className="font-bold text-gray-800">{rental.assets?.model_name}</h3>
                    <p className="text-sm text-gray-500">관리 부서: {rental.assets?.department}</p>
                  </div>
                  
                  {rental.status === '대여중' && (
                    <button 
                      onClick={() => handleReturnRequest(rental.rental_id)}
                      className="w-full md:w-auto px-4 py-2 bg-gray-800 text-white rounded-xl text-sm font-bold hover:bg-gray-900 transition"
                    >
                      반납하기
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}

      </div>
    </div>
  );
}