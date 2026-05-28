'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../lib/supabase';

const STATUS_STYLE: Record<string, string> = {
  정상: 'bg-emerald-100 text-emerald-700',
  점검완료: 'bg-emerald-100 text-emerald-700',
  수리중: 'bg-sky-100 text-sky-700',
  수리요망: 'bg-amber-100 text-amber-700',
  폐기: 'bg-red-100 text-red-700',
  미점검: 'bg-slate-100 text-slate-600',
};

export default function AdminPage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [allRooms, setAllRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('전체');
  const [selectedDept, setSelectedDept] = useState('전체');
  const [selectedLocation, setSelectedLocation] = useState('전체');
  const [selectedRoom, setSelectedRoom] = useState('전체');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [editForm, setEditForm] = useState({ room_id: '', status: '' });

  const fetchData = async () => {
    setLoading(true);
    const { data: assetData, error: assetError } = await supabase
      .from('assets')
      .select(`
        *,
        room:room_id (
          room_id,
          room_number,
          locations:location_id (location_name)
        ),
        rentals (
          status
        )
      `)
      .order('asset_id');

    if (assetError) console.error('기자재 데이터 로드 실패:', assetError);
    if (assetData) setAssets(assetData);

    const { data: roomData, error: roomError } = await supabase
      .from('room')
      .select('room_id, room_number, locations:location_id(location_name)');
    if (roomError) console.error('호실 데이터 로드 실패:', roomError);
    if (roomData) setAllRooms(roomData);

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (assetId: string) => {
    if (!window.confirm('정말 이 기자재를 삭제하시겠습니까?')) return;
    const { error } = await supabase.from('assets').delete().eq('asset_id', assetId);
    if (error) alert('삭제 실패: ' + error.message);
    else fetchData();
  };

  const openEditModal = (asset: any) => {
    setEditTarget(asset);
    setEditForm({ room_id: asset.room_id || '', status: asset.status || '정상' });
    setIsModalOpen(true);
  };

  const handleSaveEdit = async () => {
    const { error } = await supabase
      .from('assets')
      .update({
        room_id: editForm.room_id === '' ? null : editForm.room_id,
        status: editForm.status,
      })
      .eq('asset_id', editTarget.asset_id);

    if (error) {
      alert('수정 실패: ' + error.message);
    } else {
      setIsModalOpen(false);
      fetchData();
    }
  };

  const departments = useMemo(() => {
    const depts = assets.filter((a) => a.is_rentable).map((a) => a.department || '미지정');
    return ['전체', ...Array.from(new Set(depts))];
  }, [assets]);

  const locations = useMemo(() => {
    const locs = assets
      .filter((a) => !a.is_rentable)
      .map((a) => a.room?.locations?.location_name || '미지정');
    return ['전체', ...Array.from(new Set(locs))];
  }, [assets]);

  const rooms = useMemo(() => {
    const filtered = assets.filter(
      (a) =>
        !a.is_rentable &&
        (selectedLocation === '전체' ||
          (a.room?.locations?.location_name || '미지정') === selectedLocation)
    );
    return ['전체', ...Array.from(new Set(filtered.map((a) => a.room?.room_number || '미지정')))];
  }, [assets, selectedLocation]);

  const rentalAssets = assets.filter(
    (a) => a.is_rentable && (selectedDept === '전체' || a.department === selectedDept)
  );

  const allAssetsFiltered = assets.filter((a) => {
    if (filter === '대여용') return a.is_rentable;
    if (filter === '고정') return !a.is_rentable;
    return true;
  });

  const groupedFixedAssets = assets
    .filter(
      (a) =>
        !a.is_rentable &&
        (selectedLocation === '전체' ||
          (a.room?.locations?.location_name || '미지정') === selectedLocation) &&
        (selectedRoom === '전체' || (a.room?.room_number || '미지정') === selectedRoom)
    )
    .reduce(
      (acc, asset) => {
        const locName = asset.room?.locations?.location_name || '미지정';
        const roomNum = asset.room?.room_number || '미지정';
        if (!acc[locName]) acc[locName] = {};
        if (!acc[locName][roomNum]) acc[locName][roomNum] = [];
        acc[locName][roomNum].push(asset);
        return acc;
      },
      {} as Record<string, Record<string, any[]>>
    );

  const isRented = (rentals: any[]) =>
    rentals?.some((r: any) => r.status === '대여중') ?? false;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin" />
          <p className="text-sm text-slate-400 font-medium">데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">자산 관리 대장</h1>
          <p className="text-slate-500 text-sm mt-1">전체 기자재 현황을 조회하고 관리합니다.</p>
        </div>
        <div className="shrink-0 px-3 py-1.5 bg-slate-100 rounded-lg">
          <span className="text-xs font-semibold text-slate-600">전체 {assets.length}개</span>
        </div>
      </div>

      {/* Tab Filter */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {['전체', '대여용', '고정'].map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-5 py-2 rounded-lg text-sm font-bold transition ${
              filter === type ? 'bg-white shadow-sm text-sky-600' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Conditional Filter Bar */}
      {filter !== '전체' && (
        <div className="flex flex-wrap gap-4 p-4 bg-sky-50 rounded-xl border border-sky-100">
          {filter === '대여용' && (
            <div>
              <label className="block text-xs font-bold text-sky-600 mb-1">관리 학과</label>
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="px-3 py-2 rounded-lg border border-sky-200 text-sm outline-none bg-white focus:border-sky-500"
              >
                {departments.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          )}
          {filter === '고정' && (
            <>
              <div>
                <label className="block text-xs font-bold text-sky-600 mb-1">건물</label>
                <select
                  value={selectedLocation}
                  onChange={(e) => {
                    setSelectedLocation(e.target.value);
                    setSelectedRoom('전체');
                  }}
                  className="px-3 py-2 rounded-lg border border-sky-200 text-sm outline-none bg-white focus:border-sky-500"
                >
                  {locations.map((loc) => <option key={loc} value={loc}>{loc}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-sky-600 mb-1">강의실</label>
                <select
                  value={selectedRoom}
                  onChange={(e) => setSelectedRoom(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-sky-200 text-sm outline-none bg-white focus:border-sky-500"
                >
                  {rooms.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </>
          )}
        </div>
      )}

      {/* Grouped Card View (고정 tab) */}
      {filter === '고정' ? (
        <div className="space-y-6">
          {Object.keys(groupedFixedAssets).length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center text-slate-400">
              해당 조건의 고정 자산이 없습니다.
            </div>
          ) : (
            Object.keys(groupedFixedAssets).map((locName) => {
              const roomsData = groupedFixedAssets[locName];
              return (
                <div key={locName} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <h2 className="text-base font-bold text-sky-600 mb-4 border-b border-slate-100 pb-3">
                    {locName}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.keys(roomsData).map((roomNum) => {
                      const items = roomsData[roomNum];
                      return (
                        <div key={roomNum} className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                          <h3 className="font-bold text-slate-600 text-sm mb-3">{roomNum}</h3>
                          <ul className="space-y-2">
                            {items.map((item: any) => (
                              <li
                                key={item.asset_id}
                                className="text-sm flex justify-between items-center bg-white p-3 rounded-lg shadow-sm border border-slate-100"
                              >
                                <div>
                                  <p className="font-semibold text-slate-800">{item.model_name}</p>
                                  <span
                                    className={`inline-block mt-1 px-2 py-0.5 rounded text-[11px] font-bold ${
                                      STATUS_STYLE[item.status] ?? 'bg-slate-100 text-slate-600'
                                    }`}
                                  >
                                    {item.status}
                                  </span>
                                </div>
                                <div className="flex gap-1.5">
                                  <button
                                    onClick={() => openEditModal(item)}
                                    className="px-2.5 py-1.5 bg-sky-50 text-sky-600 rounded-lg text-xs font-bold hover:bg-sky-100 transition"
                                  >
                                    수정
                                  </button>
                                  <button
                                    onClick={() => handleDelete(item.asset_id)}
                                    className="px-2.5 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100 transition"
                                  >
                                    삭제
                                  </button>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* Table View (전체 / 대여용 tab) */
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {(filter === '대여용' ? rentalAssets : allAssetsFiltered).length === 0 ? (
            <div className="p-16 text-center text-slate-400">
              해당 조건의 자산이 없습니다.
            </div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">유형</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    {filter === '대여용' ? '학과' : '위치 / 학과'}
                  </th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">모델명</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">상태</th>
                  {filter === '대여용' && (
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      대여 현황
                    </th>
                  )}
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(filter === '대여용' ? rentalAssets : allAssetsFiltered).map((asset) => (
                  <tr key={asset.asset_id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          asset.is_rentable
                            ? 'bg-sky-100 text-sky-700'
                            : 'bg-violet-100 text-violet-700'
                        }`}
                      >
                        {asset.is_rentable ? '대여용' : '고정'}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-slate-600">
                      {asset.is_rentable
                        ? asset.department || '미지정'
                        : asset.room
                        ? `${asset.room.locations?.location_name || ''} ${asset.room.room_number || ''}`.trim()
                        : '미지정'}
                    </td>
                    <td className="p-4 font-semibold text-slate-800 text-sm">{asset.model_name}</td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          STATUS_STYLE[asset.status] ?? 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {asset.status}
                      </span>
                    </td>
                    {filter === '대여용' && (
                      <td className="p-4">
                        {isRented(asset.rentals) ? (
                          <span className="px-2.5 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold">
                            대여중
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">
                            대여가능
                          </span>
                        )}
                      </td>
                    )}
                    <td className="p-4">
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => openEditModal(asset)}
                          className="px-2.5 py-1.5 bg-sky-50 text-sky-600 rounded-lg text-xs font-bold hover:bg-sky-100 transition"
                        >
                          수정
                        </button>
                        <button
                          onClick={() => handleDelete(asset.asset_id)}
                          className="px-2.5 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100 transition"
                        >
                          삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Edit Modal */}
      {isModalOpen && editTarget && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-md">
            <h2 className="text-lg font-bold text-slate-800 mb-1">기자재 정보 수정</h2>
            <p className="text-sm text-slate-400 mb-5">
              {editTarget.model_name}{' '}
              <span className="font-mono text-slate-500">({editTarget.barcode})</span>
            </p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">상태</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 bg-white text-sm"
                >
                  <option value="정상">정상</option>
                  <option value="수리중">수리중</option>
                  <option value="수리요망">수리요망</option>
                  <option value="폐기">폐기</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  위치 이동 (건물 / 호실)
                </label>
                <select
                  value={editForm.room_id}
                  onChange={(e) => setEditForm({ ...editForm, room_id: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 bg-white text-sm"
                >
                  <option value="">위치 미지정 (수리센터 등)</option>
                  {allRooms.map((r: any) => (
                    <option key={r.room_id} value={r.room_id}>
                      {(r.locations as any)?.location_name} — {r.room_number}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-semibold text-sm hover:bg-slate-200 transition"
              >
                취소
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2.5 bg-sky-600 text-white rounded-xl font-semibold text-sm hover:bg-sky-700 transition"
              >
                저장하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
