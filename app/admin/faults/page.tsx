'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';

export default function AdminFaultsPage() {
  const [reports, setReports] = useState<any[]>([]);

  useEffect(() => {
    const fetchReports = async () => {
      const { data } = await supabase.from('fault_reports').select('*').order('reported_at', { ascending: false });
      if (data) setReports(data);
    };
    fetchReports();
  }, []);

  // 🌟 [추가] 상태 업데이트 함수
  const updateStatus = async (id: number, newStatus: string) => {
    const { error } = await supabase
      .from('fault_reports')
      .update({ status: newStatus })
      .eq('id', id);

    if (error) {
      alert('상태 변경에 실패했습니다.');
    } else {
      // 성공 시 화면 즉시 반영
      setReports(reports.map(r => r.id === id ? { ...r, status: newStatus } : r));
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
              <th className="p-4">상태</th>
            </tr>
          </thead>
          <tbody>
            {reports.map(r => (
              <tr key={r.id} className="border-b">
                <td className="p-4 font-mono">{r.barcode}</td>
                <td className="p-4">{r.reason}</td>
                {/* 🌟 [수정] 드롭다운으로 변경 */}
                <td className="p-4">
                  <select 
                    value={r.status} 
                    onChange={(e) => updateStatus(r.id, e.target.value)}
                    className="border rounded-lg p-2 text-sm bg-white cursor-pointer hover:border-blue-500"
                  >
                    <option value="접수대기">접수대기</option>
                    <option value="수리중">수리중</option>
                    <option value="수리완료">수리완료</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}