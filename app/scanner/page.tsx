'use client';

import React, { useState } from 'react';
import BarcodeScannerComponent from 'react-qr-barcode-scanner';

export default function ScannerPage() {
  const [scannedData, setScannedData] = useState('바코드를 화면에 비춰주세요');
  const [isScanning, setIsScanning] = useState(true);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50">
      <h1 className="text-2xl font-bold mb-6 text-blue-700">UniAsset 재물조사 스캐너</h1>
      
      {/* 카메라 화면 영역 */}
      <div className="w-full max-w-sm overflow-hidden rounded-2xl shadow-xl border-4 border-white relative">
        {/* 스캔 가이드라인 (시각적 효과) */}
        <div className="absolute inset-0 border-2 border-red-500 opacity-50 m-12 rounded pointer-events-none z-10"></div>
        
        {isScanning ? (
          <BarcodeScannerComponent
            width={500}
            height={500}
            onUpdate={(err, result) => {
              if (result) {
                // 스캔에 성공하면 글자를 바꾸고 카메라를 잠시 멈춥니다.
                setScannedData(result.getText());
                setIsScanning(false); 
              }
            }}
          />
        ) : (
          <div className="w-full h-64 bg-gray-200 flex items-center justify-center">
            <span className="text-gray-500 font-semibold">스캔 완료!</span>
          </div>
        )}
      </div>

      {/* 스캔 결과 출력 영역 */}
      <div className="mt-8 p-4 bg-white rounded-lg shadow-md w-full max-w-sm text-center border-2 border-blue-100">
        <p className="text-sm text-gray-500 mb-2">스캔된 바코드/QR 번호</p>
        <p className="text-2xl font-bold text-blue-600 break-all">{scannedData}</p>
      </div>

      {/* 다시 스캔하기 버튼 */}
      {!isScanning && (
        <button 
          onClick={() => { 
            setScannedData('바코드를 화면에 비춰주세요'); 
            setIsScanning(true); 
          }}
          className="mt-6 px-8 py-3 bg-blue-600 text-white font-bold rounded-lg shadow-lg hover:bg-blue-700 transition"
        >
          다음 기자재 스캔하기
        </button>
      )}
    </div>
  );
}