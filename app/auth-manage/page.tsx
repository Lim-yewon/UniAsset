'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function AuthManagePage() {
  const [students, setStudents] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [successMap, setSuccessMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      const { data: studentData, error } = await supabase.from('student').select(`
        user_id,
        is_work_study,
        User (
          name,
          role
        )
      `);

      if (error) console.error('학생 조회 에러:', error);
      setStudents(studentData || []);

      const { data: roomData } = await supabase
        .from('room')
        .select('room_id, room_number, locations:location_id(location_name)');
      if (roomData) setRooms(roomData);

      setLoading(false);
    };
    fetchData();
  }, []);

  const handleAssign = async (studentId: string, roomId: number) => {
    if (!roomId) return;
    setAssigning(studentId);

    const { error } = await supabase.from('authorization').insert([
      {
        staff_id: 'staff_001',
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">권한 및 근로 배정</h1>
        <p className="text-slate-500 text-sm mt-1">
          학생에게 근로장학생 권한과 담당 강의실을 배정합니다.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 font-semibold mb-1">전체 학생</p>
          <p className="text-2xl font-black text-slate-800">{students.length}</p>
        </div>
        <div className="bg-emerald-50 rounded-xl border border-emerald-100 p-4">
          <p className="text-xs text-emerald-600 font-semibold mb-1">근로장학생</p>
          <p className="text-2xl font-black text-emerald-700">
            {students.filter((s) => s.is_work_study).length}
          </p>
        </div>
        <div className="bg-sky-50 rounded-xl border border-sky-100 p-4">
          <p className="text-xs text-sky-600 font-semibold mb-1">등록된 강의실</p>
          <p className="text-2xl font-black text-sky-700">{rooms.length}</p>
        </div>
      </div>

      {/* Student Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
            학생 목록
          </h2>
          <span className="text-xs text-slate-400">{students.length}명</span>
        </div>

        {students.length === 0 ? (
          <div className="p-16 text-center">
            <p className="text-slate-400 font-medium">등록된 학생 정보가 없습니다.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {students.map((s) => (
              <div
                key={s.user_id}
                className="flex flex-col md:flex-row items-start md:items-center justify-between px-6 py-4 gap-4 hover:bg-slate-50 transition-colors"
              >
                {/* Student Info */}
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-lg shrink-0">
                    👤
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-800 text-sm">
                        {(s.User as any)?.name || '이름 없음'}
                      </span>
                      {s.is_work_study && (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-[11px] font-bold">
                          근로장학생
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-400 font-mono">{s.user_id}</span>
                  </div>
                </div>

                {/* Room Assignment */}
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <select
                    className="flex-1 md:flex-none border border-slate-200 px-3 py-2 rounded-lg text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 bg-white cursor-pointer"
                    defaultValue=""
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if (val) handleAssign(s.user_id, val);
                    }}
                  >
                    <option value="" disabled>
                      강의실 배정...
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
                      <span className="text-emerald-600">✅ 완료</span>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
