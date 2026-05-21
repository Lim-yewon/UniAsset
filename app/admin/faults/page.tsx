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
                <td className="p-4"><span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full">{r.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}