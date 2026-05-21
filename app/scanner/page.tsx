'use client';

import React, { useState } from 'react';
import { useZxing } from 'react-zxing';

export default function ScannerPage() {
  const [scannedData, setScannedData] = useState('');
  const [manualInput, setManualInput] = useState('');

  // onDecodeResult를 onResult로 변경합니다.
  const { ref } = useZxing({
    onResult(result: any) { 
      setScannedData(result.getText());
    },
  });

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50">
      <h1 className="text-2xl font-bold mb-6 text-blue-700">UniAsset 재물조사 스캐너</h1>
      
      {/* 1. 카메라 스캔 영역 */}
      <div className="w-full max-w-sm overflow-hidden rounded-2xl shadow-lg border-4 border-white relative mb-6">
        <video ref={ref} className="w-full h-64 object-cover" />
        <div className="absolute inset-0 border-2 border-red-500 opacity-50 m-8 rounded pointer-events-none z-10"></div>
        <p className="absolute bottom-2 left-0 right-0 text-center text-white text-sm bg-black bg-opacity-50 py-1">
          빨간 네모 안에 바코드를 맞춰주세요
        </p>
      </div>

      {/* 2. 스캔 결과 표시 영역 */}
      <div className="p-4 bg-white rounded-lg shadow-md w-full max-w-sm text-center border-2 border-blue-100 mb-6">
        <p className="text-sm text-gray-500 mb-2">스캔된 바코드 번호</p>
        <p className="text-2xl font-bold text-blue-600 break-all">
          {scannedData || '대기 중...'}
        </p>
      </div>

      {/* 3. 비상용 수기 입력 영역 (카메라 인식 실패 시) */}
      <div className="w-full max-w-sm p-4 bg-gray-200 rounded-lg shadow-inner">
        <p className="text-sm text-gray-600 mb-2 font-semibold">바코드 인식이 안 되나요?</p>
        <div className="flex gap-2">
          <input 
            type="text" 
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            placeholder="바코드 하단 번호 입력" 
            className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button 
            onClick={() => setScannedData(manualInput)}
            className="px-4 py-2 bg-gray-700 text-white font-bold rounded-md hover:bg-gray-800 transition"
          >
            입력
          </button>
        </div>
      </div>
    </div>
  );
}