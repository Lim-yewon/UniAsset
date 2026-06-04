'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/AuthContext';

export default function AuthManagePage() {
  const { user } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [assignmentMap, setAssignmentMap] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState<Record<string, string>>({});
  const [adding, setAdding] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);

    // 담당 학과 조회
    let myMajorId: number | null = null;
    if (user?.role === 'PROFESSOR') {
      const { data } = await supabase.from('major').select('major_id').eq('manager_uuid', user.authUuid).maybeSingle();
      myMajorId = data?.major_id ?? null;
    } else if (user?.role === 'STAFF') {
      const { data } = await supabase.from('staff').select('major_id').eq('user_id', user.userId).maybeSingle();
      myMajorId = data?.major_id ?? null;
    }

    // 근로장학생 목록 (담당 학과 필터)
    let query = supabase.from('student')
      .select('user_id, is_work_study, major_id, User(name, role)')
      .eq('is_work_study', true);
    if (myMajorId) query = query.eq('major_id', myMajorId);
    const { data: studentData, error } = await query;
    if (error) console.error('학생 조회 에러:', error);
    setStudents(studentData || []);

    // 전체 강의실 목록
    const { data: roomData } = await supabase
      .from('room')
      .select('room_id, room_number, locations:location_id(location_name)')
      .order('room_number');
    if (roomData) setRooms(roomData);

    // 배정 현황 (work_room_assignment)
    const { data: assignData } = await supabase
      .from('work_room_assignment')
      .select('id, student_id, room_id, room:room_id(room_id, room_number, locations:location_id(location_name))')
      .order('assigned_at', { ascending: true });

    const map: Record<string, any[]> = {};
    for (const a of assignData || []) {
      if (!map[a.student_id]) map[a.student_id] = [];
      map[a.student_id].push(a);
    }
    setAssignmentMap(map);
    setLoading(false);
  };

  const handleAddRoom = async (studentId: string) => {
    const roomId = selectedRoom[studentId];
    if (!roomId) return;
    setAdding(studentId);

    const { error } = await supabase.from('work_room_assignment').insert({
      student_id: studentId,
      room_id: parseInt(roomId),
      assigned_by: user?.userId,
    });

    setAdding(null);
    if (error) {
      if (error.code === '23505') alert('이미 배정된 강의실입니다.');
      else alert('배정 실패: ' + error.message);
    } else {
      setSelectedRoom(prev => ({ ...prev, [studentId]: '' }));
      fetchData();
    }
  };

  const handleRemoveRoom = async (studentId: string, roomId: number) => {
    if (!window.confirm('이 강의실 배정을 해제하시겠습니까?')) return;
    setRemoving(`${studentId}_${roomId}`);

    const { error } = await supabase
      .from('work_room_assignment')
      .delete()
      .eq('student_id', studentId)
      .eq('room_id', roomId);

    setRemoving(null);
    if (error) alert('해제 실패: ' + error.message);
    else fetchData();
  };

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

  const assignedCount = students.filter(s => (assignmentMap[s.user_id]?.length ?? 0) > 0).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">권한 및 근로 배정</h1>
        <p className="text-slate-500 text-sm mt-1">근로장학생에게 담당 강의실을 배정합니다. 여러 강의실 배정이 가능합니다.</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 font-semibold mb-1">근로장학생</p>
          <p className="text-2xl font-black text-slate-800">{students.length}</p>
        </div>
        <div className="bg-emerald-50 rounded-xl border border-emerald-100 p-4">
          <p className="text-xs text-emerald-600 font-semibold mb-1">배정 완료</p>
          <p className="text-2xl font-black text-emerald-700">{assignedCount}</p>
        </div>
        <div className="bg-amber-50 rounded-xl border border-amber-100 p-4">
          <p className="text-xs text-amber-600 font-semibold mb-1">미배정</p>
          <p className="text-2xl font-black text-amber-700">{students.length - assignedCount}</p>
        </div>
      </div>

      {/* Student List */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">근로장학생 목록</h2>
          <span className="text-xs text-slate-400">{students.length}명</span>
        </div>

        {students.length === 0 ? (
          <div className="p-16 text-center">
            <p className="text-slate-400 font-medium">등록된 근로장학생이 없습니다.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {students.map((s) => {
              const assignments = assignmentMap[s.user_id] || [];
              return (
                <div key={s.user_id} className="px-6 py-5 hover:bg-slate-50 transition-colors">
                  {/* 학생 정보 */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4 text-slate-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                      </svg>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800 text-sm">
                          {(s.User as any)?.name || '이름 없음'}
                        </span>
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-[11px] font-bold">
                          근로장학생
                        </span>
                      </div>
                      <span className="text-xs text-slate-400 font-mono">{s.user_id}</span>
                    </div>
                  </div>

                  {/* 현재 배정 강의실 (칩) */}
                  <div className="mb-3">
                    <p className="text-xs font-bold text-slate-500 mb-2">배정된 강의실</p>
                    {assignments.length === 0 ? (
                      <span className="text-xs text-amber-500 font-semibold">미배정</span>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {assignments.map((a) => (
                          <div
                            key={a.id}
                            className="flex items-center gap-1.5 bg-sky-50 border border-sky-200 text-sky-700 rounded-full px-3 py-1 text-xs font-semibold"
                          >
                            <span>
                              {(a.room?.locations as any)?.location_name} {a.room?.room_number}
                            </span>
                            <button
                              onClick={() => handleRemoveRoom(s.user_id, a.room_id)}
                              disabled={removing === `${s.user_id}_${a.room_id}`}
                              className="text-sky-400 hover:text-red-500 transition ml-0.5 disabled:opacity-50"
                            >
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 강의실 추가 */}
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedRoom[s.user_id] || ''}
                      onChange={(e) => setSelectedRoom(prev => ({ ...prev, [s.user_id]: e.target.value }))}
                      className="flex-1 border border-slate-200 px-3 py-2 rounded-lg text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 bg-white"
                    >
                      <option value="" disabled>강의실 추가...</option>
                      {rooms
                        .filter(r => !assignments.some(a => a.room_id === r.room_id))
                        .map(r => (
                          <option key={r.room_id} value={r.room_id}>
                            {(r.locations as any)?.location_name} — {r.room_number}
                          </option>
                        ))}
                    </select>
                    <button
                      onClick={() => handleAddRoom(s.user_id)}
                      disabled={!selectedRoom[s.user_id] || adding === s.user_id}
                      className="px-4 py-2 bg-sky-600 text-white rounded-lg text-sm font-bold hover:bg-sky-700 transition disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                    >
                      {adding === s.user_id ? (
                        <span className="flex items-center gap-1">
                          <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          추가중
                        </span>
                      ) : '추가'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
