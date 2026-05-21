'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';

export default function AdminFaultsPage() {
  const [reports, setReports] = useState<any[]>([]);

  useEffect(() => {
    const fetchReports = async () => {
      const { data } = await supabase
        .from('fault_reports')
        .select('*')
        .order('reported_at', { ascending: false });
      if (data) setReports(data);
    };
    fetchReports();
  }, []);

  // 1. 상태 변경 시 로컬 데이터만 우선 수정
  const handleStatusChange = (id: number, value: string) => {
    setReports(reports.map(r => r.id === id ? { ...r, status: value } : r));
  };

  // 2. 저장 버튼 클릭 시 DB에 반영
  const saveStatus = async (id: number) => {
    const report = reports.find(r => r.id === id);
    const { error } = await supabase
      .from('fault_reports')
      .update({ status: report.status })
      .eq('id', id);

    if (error) {
      alert('❌ 저장 실패: ' + error.message);
    } else {
      alert('✅ 상태가 업데이트되었습니다.');
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">🛠️ 고장 신고 관리 대시보드</h1>
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-4">바코드</th>
              <th className="p-4">신고 사유</th>
              <th className="p-4">상태 관리</th>
            </tr>
          </thead>
          <tbody>
            {reports.map(r => (
              <tr key={r.id} className="border-b">
                <td className="p-4 font-mono">{r.barcode}</td>
                <td className="p-4">{r.reason}</td>
                <td className="p-4 flex gap-2 items-center">
                  <select 
                    value={r.status} 
                    onChange={(e) => handleStatusChange(r.id, e.target.value)}
                    className="border rounded-lg p-2 text-sm bg-white cursor-pointer hover:border-blue-500"
                  >
                    <option value="접수대기">접수대기</option>
                    <option value="수리중">수리중</option>
                    <option value="수리완료">수리완료</option>
                  </select>
                  <button 
                    onClick={() => saveStatus(r.id)}
                    className="bg-sky-600 text-white px-3 py-2 rounded-lg text-sm font-bold hover:bg-sky-700 transition"
                  >
                    저장
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}