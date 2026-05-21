'use client'; // 이 페이지는 브라우저(클라이언트)의 카메라 기능을 써야 하므로 반드시 맨 위에 적어줍니다.

import React, { useState } from 'react';
import BarcodeScannerComponent from 'react-qr-barcode-scanner';

export default function ScannerPage() {
  const [scannedData, setScannedData] = useState('바코드를 화면에 비춰주세요');

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50">
      <h1 className="text-2xl font-bold mb-6 text-blue-700">UniAsset 재물조사 스캐너</h1>
      
      {/* 카메라 화면 영역 */}
      <div className="w-full max-w-sm overflow-hidden rounded-2xl shadow-xl border-4 border-white">
        <BarcodeScannerComponent
          width={500}
          height={500}
          onUpdate={(err, result) => {
            if (result) {
              setScannedData(result.getText());
              // TODO: 여기에 스캔된 바코드 번호로 Supabase DB를 조회하는 로직이 추가될 예정입니다!
            }
          }}
        />
      </div>

      {/* 스캔 결과 출력 영역 */}
      <div className="mt-8 p-4 bg-white rounded-lg shadow-md w-full max-w-sm text-center">
        <p className="text-sm text-gray-500 mb-1">스캔된 바코드 번호</p>
        <p className="text-xl font-semibold text-gray-800">{scannedData}</p>
      </div>
    </div>
  );
}