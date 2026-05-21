'use client';

import React, { useState } from 'react';
import { useZxing } from 'react-zxing';
// 🌟 우리가 만들어둔 Supabase 연결 다리 불러오기
import { supabase } from '../lib/supabase'; 

export default function ScannerPage() {
  const [scannedData, setScannedData] = useState('');
  const [manualInput, setManualInput] = useState('');
  const [statusMessage, setStatusMessage] = useState('바코드를 스캔하거나 입력해주세요.');
  const [isLoading, setIsLoading] = useState(false);

  // 🌟 핵심 로직: DB에 점검 완료 기록하기
  const processAssetCheck = async (barcodeString: string) => {
    if (!barcodeString) return;
    
    setIsLoading(true);
    setStatusMessage('데이터베이스 확인 중... ⏳');

    try {
      // 1. Supabase의 'assets' 테이블에서 해당 바코드를 가진 장비를 찾습니다.
      // 2. 그 장비의 'status'를 '점검완료'로 업데이트합니다.
      // 🚨 주의: 테이블명(assets)과 컬럼명(barcode, status)은 실제 설정하신 이름과 같아야 합니다!
      const { data, error } = await supabase
        .from('assets') 
        .update({ status: '점검완료' }) 
        .eq('barcode', barcodeString) 
        .select();

      if (error) {
        console.error('DB 에러:', error);
        setStatusMessage('❌ DB 업데이트 중 오류가 발생했습니다.');
        return;
      }

      // 결과 확인
      if (data && data.length > 0) {
        setStatusMessage(`✅ [${barcodeString}] 점검 완료 처리되었습니다!`);
      } else {
        setStatusMessage(`⚠️ 등록되지 않은 바코드입니다: ${barcodeString}`);
      }
    } catch (err) {
      setStatusMessage('❌ 네트워크 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // ZXing 바코드 스캐너 엔진 연동
  const { ref } = useZxing({
    onResult(result: any) {
      const code = result.getText();
      // 똑같은 바코드가 연속으로 여러 번 찍히는 것 방지
      if (code !== scannedData && !isLoading) { 
        setScannedData(code);
        processAssetCheck(code); // 스캔 즉시 DB 전송 함수 실행!
      }
    },
  });

  // 수기 입력 처리용 함수
  const handleManualSubmit = () => {
    setScannedData(manualInput);
    processAssetCheck(manualInput);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50">
      <h1 className="text-2xl font-bold mb-4 text-blue-700">재물조사 스캐너</h1>
      
      {/* 카메라 스캔 영역 */}
      <div className="w-full max-w-sm overflow-hidden rounded-2xl shadow-lg border-4 border-white relative mb-4">
        <video ref={ref} className="w-full h-64 object-cover" />
        <div className="absolute inset-0 border-2 border-red-500 opacity-50 m-8 rounded pointer-events-none z-10"></div>
      </div>

      {/* DB 처리 상태 알림창 (가장 중요) */}
      <div className={`p-4 rounded-lg w-full max-w-sm text-center mb-6 font-bold shadow-md transition-colors ${
        statusMessage.includes('✅') ? 'bg-green-100 text-green-700 border-green-300' : 
        statusMessage.includes('⚠️') ? 'bg-yellow-100 text-yellow-700 border-yellow-300' :
        statusMessage.includes('❌') ? 'bg-red-100 text-red-700 border-red-300' :
        'bg-white text-gray-700 border-gray-200'
      } border-2`}>
        {statusMessage}
      </div>

      {/* 비상용 수기 입력 영역 */}
      <div className="w-full max-w-sm p-4 bg-gray-200 rounded-lg shadow-inner">
        <p className="text-sm text-gray-600 mb-2 font-semibold">바코드 인식이 안 되나요?</p>
        <div className="flex gap-2">
          <input 
            type="text" 
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            placeholder="바코드 직접 입력" 
            className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <button 
            onClick={handleManualSubmit}
            disabled={isLoading}
            className="px-4 py-2 bg-gray-700 text-white font-bold rounded-md hover:bg-gray-800 disabled:bg-gray-400"
          >
            입력
          </button>
        </div>
      </div>
    </div>
  );
}