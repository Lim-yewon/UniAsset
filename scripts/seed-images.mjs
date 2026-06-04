/**
 * UniAsset 기자재 이미지 일괄 업로드 스크립트
 *
 * 사용법:
 *   1. scripts/asset-images/ 폴더에 이미지 파일 넣기
 *      파일명 규칙: {바코드번호}.jpg  예) 2024020001.jpg
 *   2. node scripts/seed-images.mjs
 *
 * 지원 확장자: jpg, jpeg, png, webp, heic
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync } from 'fs';
import { resolve, extname, basename } from 'path';

// .env.local 파싱
const envPath = resolve(process.cwd(), '.env.local');
const envVars = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split('\n')
    .filter((line) => line.includes('=') && !line.startsWith('#'))
    .map((line) => {
      const idx = line.indexOf('=');
      return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
    })
);

const SUPABASE_URL = envVars['NEXT_PUBLIC_SUPABASE_URL'];
const SERVICE_ROLE_KEY = envVars['SUPABASE_SERVICE_ROLE_KEY'];

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY가 .env.local에 없습니다.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const IMAGES_DIR = resolve(process.cwd(), 'scripts/asset-images');
const BUCKET = 'asset_images';
const SUPPORTED_EXTS = ['.jpg', '.jpeg', '.png', '.webp', '.heic'];

// MIME 타입 매핑
const MIME_MAP = {
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png':  'image/png',
  '.webp': 'image/webp',
  '.heic': 'image/heic',
};

async function main() {
  // 폴더에서 이미지 파일 목록 읽기
  let files;
  try {
    files = readdirSync(IMAGES_DIR).filter((f) =>
      SUPPORTED_EXTS.includes(extname(f).toLowerCase())
    );
  } catch {
    console.error(`❌ 폴더를 찾을 수 없습니다: ${IMAGES_DIR}`);
    console.error('   scripts/asset-images/ 폴더에 이미지 파일을 넣어주세요.');
    process.exit(1);
  }

  if (files.length === 0) {
    console.log('⚠️  scripts/asset-images/ 폴더에 이미지 파일이 없습니다.');
    process.exit(0);
  }

  console.log(`\n🖼️  기자재 이미지 업로드 시작 (총 ${files.length}개)\n`);

  let success = 0;
  let failed = 0;
  let notFound = 0;

  for (const file of files) {
    const ext = extname(file).toLowerCase();
    const barcode = basename(file, ext); // 파일명에서 확장자 제거 = 바코드
    const storagePath = `assets/${file}`;

    // 1. 해당 바코드의 기자재가 DB에 있는지 확인
    const { data: asset } = await supabase
      .from('assets')
      .select('asset_id, model_name')
      .eq('barcode', barcode)
      .maybeSingle();

    if (!asset) {
      console.log(`  ⚠️  DB에 없는 바코드: ${barcode} (${file})`);
      notFound++;
      continue;
    }

    // 2. Supabase Storage에 업로드
    const fileBuffer = readFileSync(resolve(IMAGES_DIR, file));
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, fileBuffer, {
        contentType: MIME_MAP[ext] || 'image/jpeg',
        upsert: true, // 이미 있으면 덮어쓰기
      });

    if (uploadError) {
      console.error(`  ❌ 업로드 실패 [${barcode}]: ${uploadError.message}`);
      failed++;
      continue;
    }

    // 3. Public URL 생성
    const { data: urlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(storagePath);

    // 4. assets 테이블에 이미지 URL 저장
    const { error: dbError } = await supabase
      .from('assets')
      .update({ asset_image: urlData.publicUrl })
      .eq('barcode', barcode);

    if (dbError) {
      console.error(`  ❌ DB 저장 실패 [${barcode}]: ${dbError.message}`);
      failed++;
    } else {
      console.log(`  ✅ 완료 [${barcode}] ${asset.model_name}`);
      success++;
    }
  }

  console.log('\n──────────────────────────────────');
  console.log(`✅ 성공: ${success}개`);
  if (notFound > 0) console.log(`⚠️  DB 미등록: ${notFound}개 (바코드 없음)`);
  if (failed > 0)   console.log(`❌ 실패: ${failed}개`);
  console.log('──────────────────────────────────\n');
}

main().catch(console.error);
