'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../lib/supabase';

export default function AdminPage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [allRooms, setAllRooms] = useState<any[]>([]); // 위치 이동 시 선택할 전체 호실 목록
  const [filter, setFilter] = useState('전체');

  // 상단 필터 상태들
  const [selectedDept, setSelectedDept] = useState('전체');
  const [selectedLocation, setSelectedLocation] = useState('전체');
  const [selectedRoom, setSelectedRoom] = useState('전체');

  // 모달(수정/이동) 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [editForm, setEditForm] = useState({ room_id: '', status: '' });

  // 1. 데이터 불러오기 (초기 로딩 및 업데이트 후 재호출용)
  const fetchData = async () => {
    // 자산 정보 + 위치 정보 + 대여 현황(Rentals) 모두 조인
    const { data: assetData } = await supabase
      .from('assets')
      .select(`
        *,
        room:room_id (
          room_id,
          room_number, 
          location:location_id (location_name)
        ),
        Rentals (
          status
        )
      `)
      .order('asset_id');
    if (assetData) setAssets(assetData);

    // 모달에서 사용할 전체 호실 목록 불러오기
    const { data: roomData } = await supabase
      .from('room')
      .select('room_id, room_number, locations:location_id(location_name)');
    if (roomData) setAllRooms(roomData);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 2. 관리자 액션 함수 (삭제, 이동/수정)
  const handleDelete = async (assetId: string) => {
    if (!window.confirm('정말 이 기자재를 삭제하시겠습니까?')) return;
    
    const { error } = await supabase.from('assets').delete().eq('asset_id', assetId);
    if (error) alert('삭제 실패: ' + error.message);
    else {
      alert('삭제되었습니다.');
      fetchData(); // 화면 새로고침
    }
  };

  const openEditModal = (asset: any) => {
    setEditTarget(asset);
    setEditForm({ 
      room_id: asset.room_id || '', 
      status: asset.status || '정상' 
    });
    setIsModalOpen(true);
  };

  const handleSaveEdit = async () => {
    const { error } = await supabase
      .from('assets')
      .update({
        room_id: editForm.room_id === '' ? null : editForm.room_id,
        status: editForm.status
      })
      .eq('asset_id', editTarget.asset_id);

    if (error) {
      alert('수정 실패: ' + error.message);
    } else {
      alert('성공적으로 이동/수정되었습니다.');
      setIsModalOpen(false);
      fetchData();
    }
  };

  // 3. 필터링용 리스트 생성
  const departments = useMemo(() => {
    const depts = assets.filter(a => a.is_rentable).map(a => a.department || '미지정');
    return ['전체', ...Array.from(new Set(depts))];
  }, [assets]);

  const locations = useMemo(() => {
    const locs = assets.filter(a => !a.is_rentable).map(a => a.room?.location?.location_name || '미지정');
    return ['전체', ...Array.from(new Set(locs))];
  }, [assets]);

  const rooms = useMemo(() => {
    const filtered = assets.filter(a => 
      !a.is_rentable && (selectedLocation === '전체' || (a.room?.location?.location_name || '미지정') === selectedLocation)
    );
    return ['전체', ...Array.from(new Set(filtered.map(a => a.room?.room_number || '미지정')))];
  }, [assets, selectedLocation]);

  // 4. 뷰 데이터 계산
  const rentalAssets = assets.filter(a => a.is_rentable && (selectedDept === '전체' || a.department === selectedDept));
  
  const allAssets = assets.filter(a => {
      if (filter === '대여용') return a.is_rentable;
      if (filter === '고정') return !a.is_rentable;
      return true;
  });

  const groupedFixedAssets = assets
    .filter(a => !a.is_rentable && 
      (selectedLocation === '전체' || (a.room?.location?.location_name || '미지정') === selectedLocation) &&
      (selectedRoom === '전체' || (a.room?.room_number || '미지정') === selectedRoom)
    )
    .reduce((acc, asset) => {
      const locName = asset.room?.location?.location_name || '미지정';
      const roomNum = asset.room?.room_number || '미지정';
      if (!acc[locName]) acc[locName] = {};
      if (!acc[locName][roomNum]) acc[locName][roomNum] = [];
      acc[locName][roomNum].push(asset);
      return acc;
    }, {});

  // 기자재가 현재 대여 중인지 확인하는 헬퍼 함수
  const isRented = (rentals: any[]) => {
    if (!rentals || rentals.length === 0) return false;
    return rentals.some((r: any) => r.status === '대여중');
  };

  return (
    <div className="p-6 space-y-6 relative">
      <h1 className="text-2xl font-bold text-gray-800">자산 관리 대장</h1>

      {/* 탭 필터 */}
      <div className="flex gap-2 bg-gray-100 p-1 rounded-lg w-fit">
        {['전체', '대여용', '고정'].map(type => (
          <button 
            key={type} onClick={() => setFilter(type)} 
            className={`px-4 py-2 rounded-md text-sm font-bold transition ${filter === type ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* 조건부 필터 영역 */}
      {filter !== '전체' && (
        <div className="flex gap-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
          {filter === '대여용' && (
            <div>
              <label className="block text-xs font-bold text-blue-600 mb-1">관리 학과</label>
              <select value={selectedDept} onChange={(e) => setSelectedDept(e.target.value)} className="p-2 rounded-lg border border-blue-200 text-sm outline-none">
                {departments.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          )}
          {filter === '고정' && (
            <>
              <div>
                <label className="block text-xs font-bold text-blue-600 mb-1">건물</label>
                <select value={selectedLocation} onChange={(e) => { setSelectedLocation(e.target.value); setSelectedRoom('전체'); }} className="p-2 rounded-lg border border-blue-200 text-sm outline-none">
                  {locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-blue-600 mb-1">강의실</label>
                <select value={selectedRoom} onChange={(e) => setSelectedRoom(e.target.value)} className="p-2 rounded-lg border border-blue-200 text-sm outline-none">
                  {rooms.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </>
          )}
        </div>
      )}

      {/* 뷰 영역 */}
      {filter === '고정' ? (
        <div className="space-y-6">
          {Object.entries(groupedFixedAssets).map(([locName, rooms]: [string, any]) => (
            <div key={locName} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
              <h2 className="text-lg font-bold text-blue-600 mb-4 border-b pb-2">{locName}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(rooms).map(([roomNum, items]: [string, any]) => (
                  <div key={roomNum} className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <h3 className="font-bold text-gray-700 mb-2">{roomNum}</h3>
                    <ul className="space-y-2">
                      {items.map((item: any) => (
                        <li key={item.asset_id} className="text-sm text-gray-600 flex justify-between items-center bg-white p-3 rounded shadow-sm border border-gray-100">
                          <div className="flex flex-col">
                            <span className="font-bold text-gray-800">{item.model_name}</span>
                            <span className={`w-fit mt-1 px-2 py-0.5 rounded text-[10px] font-bold ${item.status === '정상' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {item.status}
                            </span>
                          </div>
                          
                          {/* 🌟 수정/이동 및 삭제 버튼 */}
                          <div className="flex gap-2">
                            <button onClick={() => openEditModal(item)} className="px-3 py-1 bg-blue-50 text-blue-600 rounded text-xs font-bold hover:bg-blue-100 transition">이동/수정</button>
                            <button onClick={() => handleDelete(item.asset_id)} className="px-3 py-1 bg-red-50 text-red-600 rounded text-xs font-bold hover:bg-red-100 transition">삭제</button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-4 text-sm text-gray-600">유형</th>
                <th className="p-4 text-sm text-gray-600">위치/학과</th>
                <th className="p-4 text-sm text-gray-600">모델명</th>
                <th className="p-4 text-sm text-gray-600">상태</th>
                {/* 🌟 대여용 탭일 때만 보이는 대여 현황 열 */}
                {filter === '대여용' && <th className="p-4 text-sm text-gray-600">대여 현황</th>}
              </tr>
            </thead>
            <tbody>
              {(filter === '대여용' ? rentalAssets : allAssets).map(asset => (
                <tr key={asset.asset_id} className="border-b hover:bg-gray-50">
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${asset.is_rentable ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-700'}`}>
                      {asset.is_rentable ? '대여용' : '고정'}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-gray-600">
                    {asset.is_rentable ? (asset.department || '미지정') : (asset.room ? `${asset.room.location?.location_name || ''} ${asset.room.room_number || ''}` : '미지정')}
                  </td>
                  <td className="p-4 font-medium text-gray-800">{asset.model_name}</td>
                  <td className="p-4 text-sm text-gray-600">{asset.status}</td>
                  
                  {/* 🌟 대여 현황 뱃지 */}
                  {filter === '대여용' && (
                    <td className="p-4">
                      {isRented(asset.Rentals) ? (
                        <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-bold">대여중</span>
                      ) : (
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold">대여가능</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 🌟 고정 자산 이동/수정 모달창 */}
      {isModalOpen && editTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 border-b pb-2">기자재 정보 수정</h2>
            <p className="text-sm text-gray-500 mb-4">{editTarget.model_name} ({editTarget.barcode})</p>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">상태 (수리/정상)</label>
                <select 
                  value={editForm.status} 
                  onChange={(e) => setEditForm({...editForm, status: e.target.value})}
                  className="w-full p-2 border rounded-lg outline-none focus:border-blue-500"
                >
                  <option value="정상">정상</option>
                  <option value="수리중">수리중</option>
                  <option value="폐기">폐기</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">위치 이동 (건물/호실)</label>
                <select 
                  value={editForm.room_id} 
                  onChange={(e) => setEditForm({...editForm, room_id: e.target.value})}
                  className="w-full p-2 border rounded-lg outline-none focus:border-blue-500"
                >
                  <option value="">위치 미지정 (수리센터 등)</option>
                  {allRooms.map((r: any) => (
                    <option key={r.room_id} value={r.room_id}>
                      {r.locations?.location_name} {r.room_number}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg font-bold hover:bg-gray-200">취소</button>
              <button onClick={handleSaveEdit} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700">저장하기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}