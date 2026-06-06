'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';

// ────────────────────────────────────────────────────────────
// FAQ 데이터
// ────────────────────────────────────────────────────────────
type FAQItem = {
  id: string;
  question: string;   // 추천 질문 버튼에 표시
  keywords: string[]; // 키워드 매칭용
  answer: string;     // \n 으로 줄바꿈
};

const FAQ_DATA: FAQItem[] = [
  // ── 대여 신청 ──────────────────────────────────────────────
  {
    id: 'how-rent',
    question: '기자재 대여 신청 방법이 뭔가요?',
    keywords: ['대여','빌리','신청','어떻게','방법'],
    answer: `기자재 대여 신청 방법을 안내드릴게요!\n\n① 왼쪽 메뉴에서 [기자재 대여 신청]을 탭해요.\n② 대여 가능 목록에서 원하는 기자재를 찾아요.\n   - 카테고리 필터로 노트북·카메라 등으로 걸러볼 수 있어요.\n   - 사진을 탭하면 기자재 이미지를 확인할 수 있어요.\n③ [대여 신청] 버튼을 누르면 담당 관리자에게 신청이 접수돼요.\n④ 관리자 승인 후 [나의 대여 현황] 메뉴에서 확인할 수 있어요.`,
  },
  {
    id: 'rent-status',
    question: '대여 신청 후 승인이 얼마나 걸리나요?',
    keywords: ['승인','얼마','기다','시간','언제'],
    answer: `승인 시간은 담당 교수님 또는 교직원이 직접 확인하는 방식이에요.\n\n보통 수업일 기준 당일~1일 이내에 처리되지만, 담당자 상황에 따라 다를 수 있어요.\n\n급한 경우 담당 학과 사무실에 직접 문의하는 것을 권장해요.\n\n신청 현황은 [기자재 대여 신청 → 대여 신청 현황] 탭에서 확인할 수 있어요.`,
  },
  {
    id: 'rent-cancel',
    question: '대여 신청을 취소하고 싶어요.',
    keywords: ['취소','신청 취소','철회'],
    answer: `승인 전이라면 직접 취소할 수 있어요!\n\n① [기자재 대여 신청] 메뉴로 이동해요.\n② [대여 신청 현황] 탭을 눌러요.\n③ 취소하려는 항목의 [신청 취소] 버튼을 눌러요.\n\n이미 승인(대여 중)된 경우에는 취소가 아닌 반납 신청을 해야 해요.`,
  },
  {
    id: 'rent-period',
    question: '대여 기간은 얼마나 되나요?',
    keywords: ['기간','얼마나','언제까지','기한','반납 기한','due'],
    answer: `반납 기한은 관리자가 대여 승인 시 직접 설정해요.\n\n승인되면 [나의 대여 현황 → 대여 중] 탭에서 남은 날수(D-3 등)를 확인할 수 있어요.\n\n반납 기한이 가까워지면 주황색, 초과되면 빨간색으로 표시되니 확인해주세요.\n\n기한 연장이 필요하면 담당 학과에 직접 문의하세요.`,
  },

  // ── 반납 ───────────────────────────────────────────────────
  {
    id: 'how-return',
    question: '반납은 어떻게 하나요?',
    keywords: ['반납','돌려','반환','반납 방법'],
    answer: `반납 절차를 안내드릴게요!\n\n① 기자재를 담당 학과 사무실 또는 지정 장소에 실물로 가져다 주세요.\n② [나의 대여 현황 → 대여 중] 탭에서 해당 기자재의 [반납 신청] 버튼을 눌러요.\n③ 담당 관리자가 실물을 확인하고 반납을 승인해줘요.\n④ 승인되면 [완료 내역] 탭에서 확인할 수 있어요.\n\n⚠️ 반납 신청만 하고 실물을 가져다주지 않으면 처리가 안 돼요!`,
  },
  {
    id: 'overdue',
    question: '반납 기한이 지났어요.',
    keywords: ['연체','기한 초과','늦었','지났','오버'],
    answer: `반납 기한이 초과되면 [나의 대여 현황]에서 빨간색으로 표시돼요.\n\n빠르게 반납 처리해주세요!\n\n① 기자재를 담당 학과 사무실에 즉시 반납하세요.\n② [대여 중 탭] → [즉시 반납 신청(연체)] 버튼을 눌러요.\n③ 지속적인 연체는 향후 대여가 제한될 수 있어요.\n\n부득이한 사정이 있다면 담당 학과에 미리 연락해주세요.`,
  },

  // ── 고장 신고 ──────────────────────────────────────────────
  {
    id: 'fault-report',
    question: '기자재 고장 신고는 어떻게 하나요?',
    keywords: ['고장','파손','망가','신고','부서','불량'],
    answer: `고장 신고 방법을 안내드릴게요!\n\n① 왼쪽 메뉴에서 [고장 신고]를 탭해요.\n② 기자재에 붙어있는 바코드 번호를 입력해요.\n③ 고장 증상을 자세히 작성해요. (구체적일수록 빠른 처리 가능)\n④ 사진을 찍어 첨부하면 더 빠르게 처리할 수 있어요. (선택)\n⑤ [고장 신고 접수하기] 버튼을 눌러요.\n\n신고 후 담당 관리자가 확인하고 조치해요.`,
  },
  {
    id: 'barcode-location',
    question: '바코드가 어디 있는지 모르겠어요.',
    keywords: ['바코드','번호','어디','찾','스티커'],
    answer: `바코드는 기자재에 부착된 스티커에 인쇄되어 있어요!\n\n보통 이런 위치에 붙어있어요:\n• 노트북: 하단 또는 배터리 칸 근처\n• 카메라/장비: 기기 하단이나 측면\n• 모니터: 후면 패널\n• 기타 기기: 외부 케이스 하단\n\n스티커가 훼손되어 확인이 어렵다면 담당 학과에 문의해주세요.`,
  },

  // ── 재물조사 ───────────────────────────────────────────────
  {
    id: 'inspection',
    question: '재물조사는 어떻게 하나요? (근로장학생)',
    keywords: ['재물조사','스캔','스캐너','조사','근로'],
    answer: `재물조사 방법을 안내드릴게요! (근로장학생 전용 기능)\n\n① 메뉴에서 [재물조사]를 탭해요.\n② 담당 강의실을 드롭다운에서 선택해요.\n③ 카메라가 자동으로 실행되면 기자재 바코드를 스캔해요.\n   - 바코드가 잘 안 읽히면 하단 입력창에 직접 입력할 수 있어요.\n④ 모든 기자재 체크 후 [재물조사 완료 제출] 버튼을 눌러요.\n\n강의실이 목록에 없다면 관리자에게 배정을 요청하세요.`,
  },
  {
    id: 'inspection-room',
    question: '강의실 배정을 받으려면 어떻게 하나요?',
    keywords: ['강의실','배정','배치','근로 배정','할당'],
    answer: `강의실 배정은 담당 교수님 또는 교직원이 처리해요.\n\n담당 학과 사무실에 다음을 요청하세요:\n"UniAsset 재물조사 강의실 배정 요청"\n\n관리자가 시스템에서 배정하면, 재물조사 메뉴에 강의실이 자동으로 표시돼요.`,
  },

  // ── 대여 현황 ──────────────────────────────────────────────
  {
    id: 'check-rental',
    question: '내가 대여 중인 기자재를 확인하고 싶어요.',
    keywords: ['현황','확인','내 대여','지금','빌린','대여 중'],
    answer: `현재 대여 중인 기자재는 여기서 확인해요!\n\n① 메뉴에서 [나의 대여 현황]을 탭해요.\n② [대여 중] 탭: 현재 보유 중인 기자재 목록\n③ [반납 신청 현황] 탭: 반납 신청 후 승인 대기 중인 목록\n④ [완료 내역] 탭: 과거 대여 기록\n\n각 기자재의 반납 기한과 남은 날수도 함께 확인할 수 있어요.`,
  },

  // ── 계정/로그인 ────────────────────────────────────────────
  {
    id: 'login-issue',
    question: '로그인이 안 돼요.',
    keywords: ['로그인','접속','안됨','오류','에러','못 들어가','못들어가'],
    answer: `로그인이 안 될 때 확인해보세요!\n\n✅ 체크리스트:\n• 이메일: xxx@hanshin.ac.kr 형식인지 확인\n• 비밀번호: 초기 비밀번호는 hanshin1234!\n• 대소문자 구분 확인\n• 인터넷 연결 상태 확인\n\n그래도 안 된다면 담당 학과 사무실에 계정 확인을 요청해주세요.`,
  },
  {
    id: 'password',
    question: '비밀번호를 잊어버렸어요.',
    keywords: ['비밀번호','패스워드','잊','모르','초기화','리셋'],
    answer: `비밀번호를 잊어버리셨나요?\n\n현재 시스템에서 자체 비밀번호 초기화 기능은 없어요.\n\n담당 학과 사무실에 방문하거나 연락하여 아래를 요청해주세요:\n"UniAsset 비밀번호 초기화 요청"\n\n초기 비밀번호는 hanshin1234! 예요. 바꾼 적 없다면 이 비밀번호로 시도해보세요.`,
  },
  {
    id: 'my-role',
    question: '나는 어떤 메뉴를 쓸 수 있나요?',
    keywords: ['메뉴','권한','역할','기능','뭐','무엇'],
    answer: `역할에 따라 사용할 수 있는 메뉴가 달라요!\n\n👩‍🎓 일반 학생\n• 기자재 대여 신청\n• 나의 대여 현황\n• 고장 신고\n\n👷 근로장학생 (위 기능 + 추가)\n• 재물조사 (바코드 스캔)\n\n👨‍💼 교수 / 교직원 (관리자)\n• 자산 관리 대장\n• 대여 신청 관리 (승인/거절)\n• 고장 신고 관리\n• 재물조사 이력\n• 통계 및 리포트\n• 권한 및 근로 배정`,
  },

  // ── 기타 ───────────────────────────────────────────────────
  {
    id: 'contact',
    question: '담당자에게 직접 문의하고 싶어요.',
    keywords: ['문의','연락','전화','담당','사무실','직접'],
    answer: `시스템으로 해결이 어렵다면 학과 사무실에 직접 문의해주세요!\n\n📌 문의 방법:\n• 담당 학과 사무실 방문\n• 학과 대표 전화 또는 이메일\n• 담당 교수님께 직접 연락\n\n운영 시간: 평일 09:00 ~ 18:00`,
  },
];

// 빠른 주제 버튼
const QUICK_TOPICS = [
  { label: '대여 신청 방법', faqId: 'how-rent' },
  { label: '반납 방법', faqId: 'how-return' },
  { label: '고장 신고', faqId: 'fault-report' },
  { label: '대여 현황 확인', faqId: 'check-rental' },
  { label: '로그인 문제', faqId: 'login-issue' },
  { label: '재물조사 방법', faqId: 'inspection' },
];

// ────────────────────────────────────────────────────────────
// 키워드 매칭
// ────────────────────────────────────────────────────────────
function findFAQ(input: string): FAQItem | null {
  const lower = input.toLowerCase();
  let best: { item: FAQItem; score: number } | null = null;

  for (const faq of FAQ_DATA) {
    const score = faq.keywords.reduce((acc, kw) => {
      return lower.includes(kw.toLowerCase()) ? acc + kw.length : acc;
    }, 0);
    if (score > 0 && (!best || score > best.score)) {
      best = { item: faq, score };
    }
  }
  return best?.item ?? null;
}

// ────────────────────────────────────────────────────────────
// 채팅 메시지 타입
// ────────────────────────────────────────────────────────────
type Msg = { role: 'bot' | 'user'; text: string; showTopics?: boolean };

const WELCOME: Msg = {
  role: 'bot',
  text: '안녕하세요! UniAsset 도우미예요 👋\n무엇이 궁금하신가요? 아래에서 주제를 선택하거나 직접 질문해주세요.',
  showTopics: true,
};

const FALLBACK = '죄송해요, 정확히 이해하지 못했어요. 😅\n아래 주제 중 선택하시거나, 더 구체적으로 질문해주세요!';

// ────────────────────────────────────────────────────────────
// 컴포넌트
// ────────────────────────────────────────────────────────────
export default function Chatbot() {
  const [open, setOpen]       = useState(false);
  const [msgs, setMsgs]       = useState<Msg[]>([WELCOME]);
  const [input, setInput]     = useState('');
  const [typing, setTyping]   = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs, typing]);

  const sendUserMsg = useCallback((text: string) => {
    if (!text.trim()) return;
    setMsgs(prev => [...prev, { role: 'user', text }]);
    setInput('');
    setTyping(true);

    setTimeout(() => {
      const faq = findFAQ(text);
      setMsgs(prev => [
        ...prev,
        {
          role: 'bot',
          text: faq ? faq.answer : FALLBACK,
          showTopics: !faq,
        },
      ]);
      setTyping(false);
    }, 400);
  }, []);

  const handleTopic = useCallback((faqId: string) => {
    const faq = FAQ_DATA.find(f => f.id === faqId);
    if (!faq) return;
    setMsgs(prev => [
      ...prev,
      { role: 'user', text: faq.question },
    ]);
    setTyping(true);
    setTimeout(() => {
      setMsgs(prev => [...prev, { role: 'bot', text: faq.answer }]);
      setTyping(false);
    }, 400);
  }, []);

  const handleReset = () => {
    setMsgs([WELCOME]);
    setInput('');
  };

  return (
    <>
      {/* ── 채팅창 ── */}
      {open && (
        <div className="fixed bottom-20 right-4 left-4 md:left-auto md:w-96 z-50 flex flex-col rounded-2xl shadow-2xl border border-slate-200 overflow-hidden bg-white"
          style={{ height: 'min(520px, calc(100vh - 120px))' }}>

          {/* 헤더 */}
          <div className="bg-sky-600 px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                </svg>
              </div>
              <div>
                <p className="text-white font-bold text-sm">UniAsset 도우미</p>
                <p className="text-sky-200 text-[11px]">FAQ 자동 응답</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={handleReset} title="대화 초기화"
                className="p-1.5 rounded-lg hover:bg-white/10 text-sky-200 transition">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
              </button>
              <button onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-sky-200 transition">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>
            </div>
          </div>

          {/* 메시지 영역 */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-slate-50">
            {msgs.map((msg, i) => (
              <div key={i}>
                {msg.role === 'bot' ? (
                  <div className="flex items-start gap-2">
                    <div className="shrink-0 w-7 h-7 bg-sky-100 rounded-full flex items-center justify-center mt-0.5">
                      <svg className="w-3.5 h-3.5 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                      </svg>
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-slate-700 leading-relaxed shadow-sm"
                        style={{ whiteSpace: 'pre-line' }}>
                        {msg.text}
                      </div>
                      {/* 빠른 주제 버튼 */}
                      {msg.showTopics && (
                        <div className="flex flex-wrap gap-1.5">
                          {QUICK_TOPICS.map(t => (
                            <button key={t.faqId} onClick={() => handleTopic(t.faqId)}
                              className="px-2.5 py-1.5 bg-sky-50 border border-sky-200 text-sky-700 rounded-full text-xs font-semibold hover:bg-sky-100 transition">
                              {t.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-end">
                    <div className="bg-sky-600 text-white rounded-2xl rounded-tr-sm px-4 py-3 text-sm max-w-[80%] leading-relaxed"
                      style={{ whiteSpace: 'pre-line' }}>
                      {msg.text}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* 타이핑 인디케이터 */}
            {typing && (
              <div className="flex items-center gap-2">
                <div className="shrink-0 w-7 h-7 bg-sky-100 rounded-full flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                  </svg>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                  <div className="flex gap-1 items-center h-4">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* 입력창 */}
          <div className="px-3 py-3 border-t border-slate-200 bg-white shrink-0">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendUserMsg(input); } }}
                placeholder="질문을 입력하세요..."
                className="flex-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition text-base bg-slate-50"
              />
              <button
                onClick={() => sendUserMsg(input)}
                disabled={!input.trim()}
                className="p-2.5 bg-sky-600 text-white rounded-xl hover:bg-sky-700 transition disabled:opacity-40 shrink-0"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
              </button>
            </div>
            <p className="text-[10px] text-slate-400 text-center mt-1.5">
              FAQ 기반 자동 응답 · 정확한 문의는 담당 학과에 연락하세요
            </p>
          </div>
        </div>
      )}

      {/* ── 플로팅 버튼 ── */}
      <button
        onClick={() => setOpen(v => !v)}
        className={`fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-200 active:scale-95 ${
          open ? 'bg-slate-700 hover:bg-slate-800' : 'bg-sky-600 hover:bg-sky-700'
        }`}
      >
        {open ? (
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        ) : (
          <>
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
            </svg>
            {/* 뉴 배지 */}
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[9px] font-black text-white flex items-center justify-center">
              ?
            </span>
          </>
        )}
      </button>
    </>
  );
}
