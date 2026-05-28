'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';

const STATUS_OPTIONS = ['접수대기', '수리중', '수리완료'] as const;
type FaultStatus = (typeof STATUS_OPTIONS)[number];

const STATUS_STYLE: Record<FaultStatus, string> = {
  접수대기: 'bg-amber-100 text-amber-700',
  수리중: 'bg-sky-100 text-sky-700',
  수리완료: 'bg-emerald-100 text-emerald-700',
};

export default function AdminFaultsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);

  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('fault_reports')
        .select('*')
        .order('reported_at', { ascending: false });
      if (data) setReports(data);
      setLoading(false);
    };
    fetchReports();
  }, []);

  const handleStatusChange = (id: number, value: string) => {
    setReports(reports.map((r) => (r.id === id ? { ...r, status: value } : r)));
  };

  const saveStatus = async (id: number) => {
    setSaving(id);
    const report = reports.find((r) => r.id === id);
    const { error } = await supabase
      .from('fault_reports')
      .update({ status: report.status })
      .eq('id', id);
    setSaving(null);
    if (error) alert('❌ 저장 실패: ' + error.message);
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
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">고장 신고 관리</h1>
          <p className="text-slate-500 text-sm mt-1">
            접수된 고장 신고를 확인하고 처리 상태를 업데이트하세요.
          </p>
        </div>
        <div className="shrink-0 px-3 py-1.5 bg-slate-100 rounded-lg">
          <span className="text-xs font-semibold text-slate-600">전체 {reports.length}건</span>
        </div>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-3 gap-4">
        {STATUS_OPTIONS.map((s) => (
          <div key={s} className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500 font-semibold mb-1">{s}</p>
            <p className="text-2xl font-black text-slate-800">
              {reports.filter((r) => r.status === s).length}
            </p>
          </div>
        ))}
      </div>

      {reports.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center">
          <p className="text-4xl mb-3">🎉</p>
          <p className="font-bold text-slate-700">접수된 고장 신고가 없습니다</p>
          <p className="text-sm text-slate-400 mt-1">모든 기자재가 정상 작동 중입니다.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  바코드
                </th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  고장 내용
                </th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                  신고 일시
                </th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  상태
                </th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  처리
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reports.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 font-mono text-sm font-semibold text-slate-700">
                    {r.barcode}
                  </td>
                  <td className="p-4 text-sm text-slate-600 max-w-xs">
                    <p className="line-clamp-2">{r.reason}</p>
                  </td>
                  <td className="p-4 text-sm text-slate-500 whitespace-nowrap">
                    {r.reported_at
                      ? new Date(r.reported_at).toLocaleString('ko-KR', {
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '-'}
                  </td>
                  <td className="p-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                        STATUS_STYLE[r.status as FaultStatus] ?? 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <select
                        value={r.status}
                        onChange={(e) => handleStatusChange(r.id, e.target.value)}
                        className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm bg-white outline-none focus:border-sky-500 cursor-pointer"
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => saveStatus(r.id)}
                        disabled={saving === r.id}
                        className="bg-sky-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-sky-700 transition disabled:opacity-50 whitespace-nowrap"
                      >
                        {saving === r.id ? '...' : '저장'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
