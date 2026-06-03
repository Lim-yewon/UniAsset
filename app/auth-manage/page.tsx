'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/AuthContext';

export default function AuthManagePage() {
  const { user } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [assignmentMap, setAssignmentMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [successMap, setSuccessMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);

    // 로그인한 교직원/교수의 담당 학과 major_id 조회
    let myMajorId: number | null = null;

    if (user?.role === 'PROFESSOR') {
      const { data } = await supabase
        .from('major')
        .select('major_id')
        .eq('manager_uuid', user.authUuid)
        .maybeSingle();
      myMajorId = data?.major_id ?? null;
    } else if (user?.role === 'STAFF') {
      const { data } = await supabase
        .from('staff')
        .select('major_id')
        .eq('user_id', user.userId)
        .maybeSingle();
      myMajorId = data?.major_id ?? null;
    }

    // 담당 학과 근로장학생만 조회 (major_id 기준)
    let query = supabase
      .from('student')
      .select('user_id, is_work_study, major_id, User (name, role)')
      .eq('is_work_study', true);

    if (myMajorId) {
      query = query.eq('major_id', myMajorId);
    }

    const { data: studentData, error } = await query;
    if (error) console.error('학생 조회 에러:', error);
    setStudents(studentData || []);

    // 강의실 목록
    const { data: roomData } = await supabase
      .from('room')
      .select('room_id, room_number, locations:location_id(location_name)');
    if (roomData) setRooms(roomData);

    // 현재 배정 현황 (각 학생의 최신 배정)
    const { data: authData } = await supabase
      .from('authorization')
      .select(`
        student_id,
        target_room_id,
        start_date,
        room:target_room_id (
          room_id,
          room_number,
          locations:location_id (location_name)
        )
      `)
      .order('start_date', { ascending: false });

    // 학생별 최신 배정 1개만 추출
    const map: Record<string, any> = {};
    for (const a of authData || []) {
      if (!map[a.student_id]) {
        map[a.student_id] = a;
      }
    }
    setAssignmentMap(map);

    setLoading(false);
  };

  const handleAssign = async (studentId: string, roomId: number) => {
    if (!roomId || !user) return;
    setAssigning(studentId);

    const { error } = await supabase.from('authorization').insert([
      {
        staff_id: user.userId,
        student_id: studentId,
        target_room_id: roomId,
        start_date: new Date().toISOString(),
      },
    ]);

    setAssigning(null);

    if (error) {
      alert('배정 실패: ' + error.message);
    } else {
      setSuccessMap((prev) => ({ ...prev, [studentId]: true }));
      setTimeout(
        () => setSuccessMap((prev) => ({ ...prev, [studentId]: false })),
        2500
      );
      // 배정 현황 갱신
      fetchData();
    }
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

  const assignedCount = students.filter((s) => assignmentMap[s.user_id]).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">권한 및 근로 배정</h1>
        <p className="text-slate-500 text-sm mt-1">
          근로장학생에게 담당 강의실을 배정합니다.
        </p>
      </div>

      {/* Summary Cards */}
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
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
            근로장학생 목록
          </h2>
          <span className="text-xs text-slate-400">{students.length}명</span>
        </div>

        {students.length === 0 ? (
          <div className="p-16 text-center">
            <p className="text-slate-400 font-medium">등록된 근로장학생이 없습니다.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {students.map((s) => {
              const current = assignmentMap[s.user_id];
              const currentRoomId = current?.target_room_id ?? '';

              return (
                <div
                  key={s.user_id}
                  className="flex flex-col md:flex-row items-start md:items-center justify-between px-6 py-4 gap-4 hover:bg-slate-50 transition-colors"
                >
                  {/* 학생 정보 */}
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                      <svg
                        className="w-4 h-4 text-slate-500"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                      </svg>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-800 text-sm">
                          {(s.User as any)?.name || '이름 없음'}
                        </span>
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-[11px] font-bold">
                          근로장학생
                        </span>
                      </div>
                      <span className="text-xs text-slate-400 font-mono">{s.user_id}</span>
                      {/* 현재 배정 강의실 표시 */}
                      {current ? (
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-[11px] text-sky-600 font-semibold">
                            현재:{' '}
                            {(current.room?.locations as any)?.location_name}{' '}
                            {current.room?.room_number}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-amber-500 font-semibold mt-0.5 block">
                          미배정
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 강의실 배정 */}
                  <div className="flex items-center gap-2 w-full md:w-auto">
                    <select
                      className="flex-1 md:flex-none border border-slate-200 px-3 py-2 rounded-lg text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 bg-white cursor-pointer"
                      value={currentRoomId}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (val) handleAssign(s.user_id, val);
                      }}
                    >
                      <option value="" disabled>
                        강의실 선택...
                      </option>
                      {rooms.map((r) => (
                        <option key={r.room_id} value={r.room_id}>
                          {(r.locations as any)?.location_name} — {r.room_number}
                        </option>
                      ))}
                    </select>

                    <div className="w-16 text-xs font-bold text-center shrink-0">
                      {assigning === s.user_id ? (
                        <span className="text-slate-400">처리중...</span>
                      ) : successMap[s.user_id] ? (
                        <span className="text-emerald-600 flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          완료
                        </span>
                      ) : null}
                    </div>
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
