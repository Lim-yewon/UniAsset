'use client';

import React, { useState } from 'react';
import { useZxing } from 'react-zxing';
import { supabase } from '../../lib/supabase';

export default function ScannerPage() {
  const [scannedData, setScannedData] = useState('');
  const [status, setStatus] = useState({ msg: '바코드를 인식시켜주세요', color: 'text-gray-500' });
  const [manual, setManual] = useState('');

  const handleUpdate = async (code: string) => {
    if (!code) return;
    setStatus({ msg: '데이터 전송 중...', color: 'text-blue-500' });

    const { data, error } = await supabase
      .from('assets')
      .update({ status: '점검완료' })
      .eq('barcode', code)
      .select();

    if (data && data.length > 0) {
      setStatus({ msg: `✅ ${code} 점검 완료!`, color: 'text-green-600' });
    } else {
      setStatus({ msg: `⚠️ 등록되지 않은 바코드: ${code}`, color: 'text-red-500' });
    }
  };

  const { ref } = useZxing({
    onResult(result: any) {
      const code = result.getText();
      if (code !== scannedData) {
        setScannedData(code);
        handleUpdate(code);
      }
    },
  });

  return (
    <div className="max-w-md mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">현장 스캐너</h1>
      
      <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-white bg-black aspect-square">
        <video ref={ref} className="w-full h-full object-cover" />
        <div className="absolute inset-0 border-2 border-blue-400 opacity-30 m-12 rounded-xl pointer-events-none"></div>
      </div>

      <div className={`p-6 bg-white rounded-2xl shadow-md text-center border-t-4 border-blue-500`}>
        <p className={`text-xl font-bold ${status.color}`}>{status.msg}</p>
      </div>

      <div className="bg-gray-200 p-4 rounded-xl space-y-2">
        <p className="text-xs font-bold text-gray-500">인식이 안되나요? 수동 입력</p>
        <div className="flex gap-2">
          <input value={manual} onChange={e=>setManual(e.target.value)} className="flex-1 p-2 rounded-lg border-none focus:ring-2 focus:ring-blue-500" placeholder="바코드 번호" />
          <button onClick={()=>handleUpdate(manual)} className="bg-gray-700 text-white px-4 py-2 rounded-lg font-bold">확인</button>
        </div>
      </div>
    </div>
  );
}