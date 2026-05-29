/**
 * 한신대학교 Auth 계정 일괄 생성 스크립트
 *
 * 사용법:
 *   1. .env.local에 SUPABASE_SERVICE_ROLE_KEY 추가
 *      (Supabase 대시보드 → Project Settings → API → service_role 키)
 *   2. node scripts/seed-auth.mjs
 *
 * 생성되는 계정 비밀번호: hanshin1234!
 * (로그인 후 개별 변경 권장)
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

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
  console.error('SUPABASE_SERVICE_ROLE_KEY가 .env.local에 없습니다.');
  console.error('Supabase 대시보드 → Project Settings → API → service_role 키를 추가하세요.');
  process.exit(1);
}

// service_role 키로 Admin 클라이언트 생성
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEFAULT_PASSWORD = 'hanshin1234!';

// 생성할 계정 목록 — user_id는 이미 DB에 삽입된 값과 일치해야 합니다
const USERS = [
  // 교직원 (STAFF)
  { userId: 'staff_001', email: 'staff001@hanshin.ac.kr', name: '김학사' },
  { userId: 'staff_002', email: 'staff002@hanshin.ac.kr', name: '이총무' },
  { userId: 'staff_003', email: 'staff003@hanshin.ac.kr', name: '박시설' },
  { userId: 'staff_004', email: 'staff004@hanshin.ac.kr', name: '최정보' },
  // 교수 (PROFESSOR)
  { userId: 'prof_001',  email: 'prof001@hanshin.ac.kr',  name: '이컴퓨터' },
  { userId: 'prof_002',  email: 'prof002@hanshin.ac.kr',  name: '김보안'   },
  { userId: 'prof_003',  email: 'prof003@hanshin.ac.kr',  name: '박경영'   },
  { userId: 'prof_004',  email: 'prof004@hanshin.ac.kr',  name: '정복지'   },
  { userId: 'prof_005',  email: 'prof005@hanshin.ac.kr',  name: '한신학'   },
  { userId: 'prof_006',  email: 'prof006@hanshin.ac.kr',  name: '오디자인' },
  // 일반 학생 (STUDENT)
  { userId: 'stu_001',   email: 'stu001@hanshin.ac.kr',   name: '김민준' },
  { userId: 'stu_002',   email: 'stu002@hanshin.ac.kr',   name: '이서연' },
  { userId: 'stu_003',   email: 'stu003@hanshin.ac.kr',   name: '박지호' },
  { userId: 'stu_004',   email: 'stu004@hanshin.ac.kr',   name: '최수아' },
  { userId: 'stu_005',   email: 'stu005@hanshin.ac.kr',   name: '정우진' },
  { userId: 'stu_006',   email: 'stu006@hanshin.ac.kr',   name: '강하은' },
  { userId: 'stu_007',   email: 'stu007@hanshin.ac.kr',   name: '윤도현' },
  { userId: 'stu_008',   email: 'stu008@hanshin.ac.kr',   name: '한지민' },
  // 근로장학생
  { userId: 'work_001',  email: 'work001@hanshin.ac.kr',  name: '송근로'   },
  { userId: 'work_002',  email: 'work002@hanshin.ac.kr',  name: '임장학'   },
  { userId: 'work_003',  email: 'work003@hanshin.ac.kr',  name: '조도우미' },
];

async function main() {
  console.log(`\n한신대학교 Auth 계정 생성 시작 (총 ${USERS.length}명)\n`);

  let success = 0;
  let failed = 0;

  for (const user of USERS) {
    // 1. Supabase Auth 계정 생성
    const { data, error } = await supabase.auth.admin.createUser({
      email: user.email,
      password: DEFAULT_PASSWORD,
      email_confirm: true, // 이메일 인증 생략
    });

    if (error) {
      console.error(`  실패 [${user.userId}] ${user.name}: ${error.message}`);
      failed++;
      continue;
    }

    const authUuid = data.user.id;

    // 2. public.User 테이블에 user_uuid 연결
    const { error: updateError } = await supabase
      .from('User')
      .update({ user_uuid: authUuid })
      .eq('user_id', user.userId);

    if (updateError) {
      console.error(`  UUID 연결 실패 [${user.userId}]: ${updateError.message}`);
      failed++;
    } else {
      console.log(`  완료 [${user.userId}] ${user.name} <${user.email}>`);
      success++;
    }
  }

  console.log(`\n결과: 성공 ${success}명 / 실패 ${failed}명`);
  console.log(`초기 비밀번호: ${DEFAULT_PASSWORD}`);
  console.log('로그인 후 개별 비밀번호 변경을 권장합니다.\n');
}

main().catch(console.error);
