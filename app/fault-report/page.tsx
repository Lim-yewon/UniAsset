'use client';

import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function FaultReportPage() {
  const [barcode, setBarcode] = useState('');
  const [reason, setReason] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. 해당 장비가 실제 존재하는지 먼저 확인
    const { data: asset } = await supabase.from('assets').select('asset_id').eq('barcode', barcode).single();
    
    if (!asset) {
      alert('존재하지 않는 바코드 번호입니다.');
      return;
    }

    // 2. 고장 신고 테이블에 접수
    const { error } = await supabase.from('fault_reports').insert([
      { 
        barcode: barcode, 
        reason: reason, 
        status: '접수대기',
        reported_at: new Date().toISOString() 
      }
    ]);

    if (error) {
      alert('신고 접수 중 오류가 발생했습니다.');
    } else {
      alert('🚨 고장 신고가 접수되었습니다. 관리자가 확인 예정입니다.');
      setBarcode(''); setReason('');
    }
  };

  return (
    <div className="max-w-lg mx-auto bg-white p-8 rounded-2xl shadow-lg border border-red-100">
      <h1 className="text-2xl font-bold text-red-600 mb-6">🚨 기자재 고장 신고</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input placeholder="바코드 번호 입력" value={barcode} onChange={e => setBarcode(e.target.value)} className="w-full p-3 border rounded-lg" />
        <textarea placeholder="고장 증상을 자세히 적어주세요 (예: 화면 깜빡임)" value={reason} onChange={e => setReason(e.target.value)} className="w-full p-3 border rounded-lg h-32" />
        <button type="submit" className="w-full bg-red-600 text-white font-bold py-3 rounded-lg hover:bg-red-700">신고하기</button>
      </form>
    </div>
  );
}