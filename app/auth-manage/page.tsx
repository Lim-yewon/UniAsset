'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function AuthManagePage() {
  const [students, setStudents] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
    // 1. 학생 목록 가져오기
    // 관계형 조인은 테이블 이름이 DB에 저장된 그대로(보통 대소문자 구분) 입력해야 합니다.
    const { data: studentData, error } = await supabase
      .from('student')
      .select(`
        student_id,
        User (
          name
        )
      `);
    
    if (error) console.error("학생 조회 에러:", error);
    else {
      console.log("조회된 학생 데이터:", studentData); // 🌟 여기서 콘솔을 꼭 확인하세요!
      setStudents(studentData || []);
    }
      
      // 2. 호실 목록 가져오기
      const { data: roomData } = await supabase.from('room').select('*');
      
      if (studentData) setStudents(studentData);
      if (roomData) setRooms(roomData);
    };
    fetchData();
  }, []);

  const handleAssign = async (studentId: string, roomId: number) => {
    const { error } = await supabase
      .from('Authorization')
      .insert([{ 
        staff_id: 'staff_001', // 현재 로그인된 관리자 ID (테스트용 고정)
        student_id: studentId, 
        target_room_id: roomId,
        start_date: new Date().toISOString() 
      }]);

    if (error) alert('배정 실패: ' + error.message);
    else alert('✅ 성공적으로 배정되었습니다!');
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">🔑 권한 및 근로 배정</h1>
      <div className="bg-white rounded-xl shadow p-6">
        {students.map(s => (
          <div key={s.student_id} className="flex items-center justify-between border-b py-4">
            <span className="font-bold">{s.User?.name} ({s.student_id})</span>
            <select 
              className="border p-2 rounded-lg"
              onChange={(e) => handleAssign(s.student_id, parseInt(e.target.value))}
            >
              <option value="">호실 선택</option>
              {rooms.map(r => <option key={r.room_id} value={r.room_id}>{r.room_number}</option>)}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}