'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/AuthContext';

const STATUS_STYLE: Record<string, string> = {
  정상: 'bg-emerald-100 text-emerald-700',
  점검완료: 'bg-emerald-100 text-emerald-700',
  수리중: 'bg-sky-100 text-sky-700',
  수리요망: 'bg-amber-100 text-amber-700',
  폐기: 'bg-red-100 text-red-700',
  미점검: 'bg-slate-100 text-slate-600',
};

export default function AdminPage() {
  const { user } = useAuth();
  const [assets, setAssets] = useState<any[]>([]);
  const [allRooms, setAllRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('전체');
  // 로그인한 사용자의 담당 학과 정보
  const [myDept, setMyDept] = useState<{ id: number | null; name: string | null }>({ id: null, name: null });
  const [selectedDept, setSelectedDept]         = useState('전체');
  const [selectedCategory, setSelectedCategory] = useState('전체');
  const [selectedLocation, setSelectedLocation] = useState('전체');
  const [selectedRoom, setSelectedRoom]         = useState('전체');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [editForm, setEditForm] = useState({ room_id: '', status: '' });
  const [photoModal, setPhotoModal] = useState<{
    open: boolean; url: string | null; name: string; assetId: string;
  }>({ open: false, url: null, name: '', assetId: '' });
  const [photoUploading, setPhotoUploading] = useState(false);

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
    if (!user) return;
    const init = async () => {
      // 담당 학과 조회
      let deptId: number | null = null;
      let deptName: string | null = null;

      if (user.role === 'PROFESSOR') {
        const { data } = await supabase
          .from('major')
          .select('major_id, major_name')
          .eq('manager_uuid', user.authUuid)
          .maybeSingle();
        deptId = data?.major_id ?? null;
        deptName = data?.major_name ?? null;
      } else if (user.role === 'STAFF') {
        const { data: staffData } = await supabase
          .from('staff')
          .select('major_id')
          .eq('user_id', user.userId)
          .maybeSingle();
        if (staffData?.major_id) {
          const { data: majorData } = await supabase
            .from('major')
            .select('major_name')
            .eq('major_id', staffData.major_id)
            .maybeSingle();
          deptId = staffData.major_id;
          deptName = majorData?.major_name ?? null;
        }
      }

      setMyDept({ id: deptId, name: deptName });
      fetchData();
    };
    init();
  }, [user]);

  const handleDelete = async (assetId: string) => {
    if (!window.confirm('정말 이 기자재를 삭제하시겠습니까?')) return;
    const { error } = await supabase.from('assets').delete().eq('asset_id', assetId);
    if (error) alert('삭제 실패: ' + error.message);
    else fetchData();
  };

  const handlePhotoUpload = async (file: File) => {
    setPhotoUploading(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${photoModal.assetId}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('asset_images')
      .upload(fileName, file, { upsert: true });

    if (uploadError) {
      alert('업로드 실패: ' + uploadError.message);
      setPhotoUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from('asset_images').getPublicUrl(fileName);

    const { error: dbError } = await supabase
      .from('assets')
      .update({ asset_image: urlData.publicUrl })
      .eq('asset_id', photoModal.assetId);

    if (dbError) {
      alert('DB 저장 실패: ' + dbError.message);
    } else {
      setPhotoModal((prev) => ({ ...prev, url: urlData.publicUrl }));
      fetchData();
    }
    setPhotoUploading(false);
  };

  const handlePhotoDelete = async () => {
    if (!window.confirm('사진을 삭제하시겠습니까?')) return;
    const { error } = await supabase
      .from('assets')
      .update({ asset_image: null })
      .eq('asset_id', photoModal.assetId);

    if (error) {
      alert('삭제 실패: ' + error.message);
    } else {
      setPhotoModal((prev) => ({ ...prev, url: null }));
      fetchData();
    }
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

  // 담당 학과 기준으로 표시할 자산 범위 결정
  const visibleAssets = useMemo(() => {
    if (!myDept.name && !myDept.id) return assets;
    return assets.filter((a) => {
      if (a.is_rentable) return a.department === myDept.name;
      return myDept.id ? a.owning_major_id === myDept.id : true;
    });
  }, [assets, myDept]);

  const departments = useMemo(() => {
    const depts = visibleAssets.filter((a) => a.is_rentable).map((a) => a.department || '미지정');
    return ['전체', ...Array.from(new Set(depts))];
  }, [visibleAssets]);

  const locations = useMemo(() => {
    const locs = visibleAssets
      .filter((a) => !a.is_rentable)
      .map((a) => a.room?.locations?.location_name || '미지정');
    return ['전체', ...Array.from(new Set(locs))];
  }, [visibleAssets]);

  const rooms = useMemo(() => {
    const filtered = visibleAssets.filter(
      (a) =>
        !a.is_rentable &&
        (selectedLocation === '전체' ||
          (a.room?.locations?.location_name || '미지정') === selectedLocation)
    );
    return ['전체', ...Array.from(new Set(filtered.map((a) => a.room?.room_number || '미지정')))];
  }, [visibleAssets, selectedLocation]);

  const rentalCategories = useMemo(() => {
    const cats = visibleAssets.filter(a => a.is_rentable).map(a => a.category || '기타');
    return ['전체', ...Array.from(new Set(cats)).sort()];
  }, [visibleAssets]);

  const rentalAssets = useMemo(() => visibleAssets.filter(a =>
    a.is_rentable &&
    (selectedDept === '전체' || a.department === selectedDept) &&
    (selectedCategory === '전체' || (a.category || '기타') === selectedCategory)
  ), [visibleAssets, selectedDept, selectedCategory]);

  const allAssetsFiltered = visibleAssets.filter((a) => {
    if (filter === '대여용') return a.is_rentable;
    if (filter === '고정') return !a.is_rentable;
    return true;
  });

  const groupedFixedAssets = visibleAssets
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
          {myDept.name && (
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="text-xs text-slate-400">담당 학과:</span>
              <span className="text-xs font-bold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full">
                {myDept.name}
              </span>
            </div>
          )}
        </div>
        <div className="shrink-0 px-3 py-1.5 bg-slate-100 rounded-lg">
          <span className="text-xs font-semibold text-slate-600">{visibleAssets.length}개</span>
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
            <div className="flex flex-col gap-3 w-full">
              <div className="flex flex-wrap gap-4">
                <div>
                  <label className="block text-xs font-bold text-sky-600 mb-1">관리 학과</label>
                  <select
                    value={selectedDept}
                    onChange={(e) => { setSelectedDept(e.target.value); setSelectedCategory('전체'); }}
                    className="px-3 py-2 rounded-lg border border-sky-200 text-sm outline-none bg-white focus:border-sky-500"
                  >
                    {departments.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>
              {/* 카테고리 칩 필터 */}
              <div>
                <label className="block text-xs font-bold text-sky-600 mb-2">카테고리</label>
                <div className="flex flex-wrap gap-1.5">
                  {rentalCategories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                        selectedCategory === cat
                          ? 'bg-sky-600 text-white shadow-sm'
                          : 'bg-white border border-sky-200 text-sky-700 hover:border-sky-400'
                      }`}
                    >
                      {cat}
                      {cat !== '전체' && (
                        <span className="ml-1 opacity-70">
                          {visibleAssets.filter(a => a.is_rentable && (a.category || '기타') === cat && (selectedDept === '전체' || a.department === selectedDept)).length}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
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
                                    onClick={() => setPhotoModal({ open: true, url: item.asset_image || null, name: item.model_name, assetId: item.asset_id })}
                                    className="px-2.5 py-1.5 bg-slate-50 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-100 transition"
                                  >
                                    사진
                                  </button>
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
        /* 전체 / 대여용 탭 */
        (() => {
          const list = filter === '대여용' ? rentalAssets : allAssetsFiltered;
          if (list.length === 0) return (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-16 text-center text-slate-400">
              해당 조건의 자산이 없습니다.
            </div>
          );
          return (
            <>
              {/* ── 모바일 카드 뷰 (md 미만) ── */}
              <div className="md:hidden space-y-3">
                {list.map(asset => (
                  <div key={asset.asset_id} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
                    {/* 상단: 배지 세로 + 모델명 */}
                    <div className="flex items-start gap-3">
                      {/* 유형 + 상태 세로 배치 */}
                      <div className="flex flex-col gap-1.5 shrink-0">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold text-center ${asset.is_rentable ? 'bg-sky-100 text-sky-700' : 'bg-violet-100 text-violet-700'}`}>
                          {asset.is_rentable ? '대여용' : '고정'}
                        </span>
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold text-center ${STATUS_STYLE[asset.status] ?? 'bg-slate-100 text-slate-600'}`}>
                          {asset.status}
                        </span>
                        {filter === '대여용' && (
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold text-center ${isRented(asset.rentals) ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {isRented(asset.rentals) ? '대여중' : '가능'}
                          </span>
                        )}
                      </div>
                      {/* 텍스트 정보 */}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-800 text-sm leading-snug">{asset.model_name}</p>
                        <p className="text-xs text-slate-400 font-mono mt-0.5">{asset.barcode}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {asset.is_rentable
                            ? asset.department || '미지정'
                            : asset.room
                              ? `${asset.room.locations?.location_name || ''} ${asset.room.room_number || ''}`.trim()
                              : '미지정'}
                        </p>
                      </div>
                    </div>
                    {/* 하단: 관리 버튼 */}
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => setPhotoModal({ open: true, url: asset.asset_image || null, name: asset.model_name, assetId: asset.asset_id })}
                        className="flex-1 py-2 bg-slate-50 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-100 transition">사진</button>
                      <button onClick={() => openEditModal(asset)}
                        className="flex-1 py-2 bg-sky-50 text-sky-600 rounded-xl text-xs font-bold hover:bg-sky-100 transition">수정</button>
                      <button onClick={() => handleDelete(asset.asset_id)}
                        className="flex-1 py-2 bg-red-50 text-red-600 rounded-xl text-xs font-bold hover:bg-red-100 transition">삭제</button>
                    </div>
                  </div>
                ))}
              </div>

              {/* ── 데스크탑 테이블 뷰 (md 이상) ── */}
              <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
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
                        <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">대여 현황</th>
                      )}
                      <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">관리</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {list.map(asset => (
                      <tr key={asset.asset_id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${asset.is_rentable ? 'bg-sky-100 text-sky-700' : 'bg-violet-100 text-violet-700'}`}>
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
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${STATUS_STYLE[asset.status] ?? 'bg-slate-100 text-slate-600'}`}>
                            {asset.status}
                          </span>
                        </td>
                        {filter === '대여용' && (
                          <td className="p-4">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${isRented(asset.rentals) ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                              {isRented(asset.rentals) ? '대여중' : '대여가능'}
                            </span>
                          </td>
                        )}
                        <td className="p-4">
                          <div className="flex gap-1.5">
                            <button onClick={() => setPhotoModal({ open: true, url: asset.asset_image || null, name: asset.model_name, assetId: asset.asset_id })}
                              className="px-2.5 py-1.5 bg-slate-50 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-100 transition">사진</button>
                            <button onClick={() => openEditModal(asset)}
                              className="px-2.5 py-1.5 bg-sky-50 text-sky-600 rounded-lg text-xs font-bold hover:bg-sky-100 transition">수정</button>
                            <button onClick={() => handleDelete(asset.asset_id)}
                              className="px-2.5 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100 transition">삭제</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          );
        })()
      )}

      {/* Photo Modal */}
      {photoModal.open && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setPhotoModal({ open: false, url: null, name: '', assetId: '' })}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 헤더 */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm truncate">{photoModal.name}</h3>
              <button
                onClick={() => setPhotoModal({ open: false, url: null, name: '', assetId: '' })}
                className="p-1.5 rounded-lg hover:bg-slate-100 transition text-slate-400 shrink-0 ml-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 사진 영역 */}
            {photoModal.url ? (
              <img src={photoModal.url} alt={photoModal.name} className="w-full object-contain max-h-[55vh]" />
            ) : (
              <div className="h-44 flex flex-col items-center justify-center gap-2 bg-slate-50">
                <svg className="w-10 h-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v13.5a1.5 1.5 0 001.5 1.5z" />
                </svg>
                <p className="text-slate-400 text-sm font-semibold">등록된 사진이 없습니다</p>
              </div>
            )}

            {/* 하단 버튼 영역 */}
            <div className="px-5 py-4 border-t border-slate-100 flex items-center gap-2">
              {/* 사진 추가 / 변경 */}
              <label className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold cursor-pointer transition ${
                photoUploading ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-sky-600 text-white hover:bg-sky-700'
              }`}>
                {photoUploading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin" />
                    업로드 중...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                    {photoModal.url ? '사진 변경' : '사진 추가'}
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={photoUploading}
                  onChange={(e) => {
                    if (e.target.files?.[0]) handlePhotoUpload(e.target.files[0]);
                  }}
                />
              </label>

              {/* 삭제 버튼 (사진 있을 때만) */}
              {photoModal.url && (
                <button
                  onClick={handlePhotoDelete}
                  className="px-4 py-2.5 bg-red-50 text-red-600 rounded-xl text-sm font-bold hover:bg-red-100 transition"
                >
                  삭제
                </button>
              )}
            </div>
          </div>
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
