import { 
  Zap, Target, Rocket, Lightbulb, CheckCircle2, 
  BrainCircuit, Layout, ShieldCheck, Microscope, 
  Cpu, Users, AlertTriangle, Layers, BookOpen,
  ArrowRight, Sparkles, MessageSquare, Code2, Terminal, Plus
} from 'lucide-react'
import { Card } from '../../../shared/ui/card'
import { useState } from 'react'

export function AiMethodologyPage() {
  const [activeTab, setActiveTab] = useState('summary')

  const sections = [
    { id: 'summary', title: '핵심 결론', icon: Sparkles },
    { id: 'tools', title: '기본 도구화', icon: Terminal },
    { id: 'foundation', title: '개발의 본질', icon: Layout },
    { id: 'input', title: '입력 증폭기', icon: BrainCircuit },
    { id: 'validation', title: '검증의 가치', icon: Microscope },
    { id: 'comparison', title: 'Claude vs GPT', icon: MessageSquare },
    { id: 'levels', title: '활용 레벨', icon: Layers },
    { id: 'strategy', title: '자산 및 시스템', icon: ShieldCheck },
    { id: 'risk', title: '위험 요소', icon: AlertTriangle },
    { id: 'video', title: '참고 영상', icon: Rocket },
  ]

  return (
    <div className="flex flex-col lg:flex-row gap-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      {/* Sticky Navigation Sidebar */}
      <aside className="lg:w-64 shrink-0">
        <div className="sticky top-24 space-y-1">
          <div className="px-3 mb-4">
            <h2 className="text-[11px] font-black uppercase tracking-[0.2em] ui-text-muted">Methodology Map</h2>
          </div>
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveTab(section.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${
                activeTab === section.id 
                ? 'bg-brand-primary text-primary-foreground shadow-lg shadow-brand-primary/20' 
                : 'ui-text-secondary hover:bg-surface-muted hover:ui-text-primary'
              }`}
            >
              <section.icon className="size-4" />
              {section.title}
            </button>
          ))}
          <div className="pt-6 mt-6 border-t border-surface-border-soft px-3">
             <div className="p-4 rounded-xl bg-surface-muted/50 border border-surface-border-soft">
                <p className="text-[10px] leading-relaxed ui-text-muted italic">
                  "AI 시대의 개발자는 코드를 많이 치는 사람이 아니라, AI가 만든 코드를 설계·검증·조합·운영할 수 있는 사람이다."
                </p>
             </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 space-y-12">
        <header className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-glass border border-brand-border text-brand-primary text-[10px] font-black uppercase tracking-widest">
            <Zap className="size-3 fill-brand-primary" /> 실무 가이드
          </div>
          <h1 className="text-4xl font-black tracking-tight ui-text-primary lg:text-6xl">
            AI 개발 통합 정리
          </h1>
          <p className="text-xl ui-text-secondary font-medium">
            AI와 함께하는 실무 개발의 변곡점을 넘는 전략
          </p>
        </header>

        {activeTab === 'summary' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <section className="space-y-6">
              <div className="ui-panel p-8 bg-brand-primary/5 border-brand-border/30 rounded-2xl relative overflow-hidden">
                <div className="absolute -right-10 -bottom-10 opacity-5 pointer-events-none">
                  <Sparkles className="size-64 text-brand-primary" />
                </div>
                <h2 className="text-2xl font-bold ui-text-primary mb-6 flex items-center gap-3">
                  <Sparkles className="size-6 text-brand-primary" /> 0. 핵심 결론
                </h2>
                <div className="space-y-4 text-lg ui-text-secondary leading-relaxed">
                  <p>AI 개발은 더 이상 선택이 아니라 <b className="ui-text-primary">기본 도구</b>입니다. 하지만 본질은 변하지 않았습니다.</p>
                  <p>AI가 코드를 더 빠르게 만들 뿐, <b>무엇을 만들지, 어떤 구조로 만들지, 어떻게 검증할지</b>는 여전히 개발자의 몫입니다.</p>
                  <div className="mt-8 p-6 bg-background/80 rounded-xl border border-brand-border/20 shadow-sm">
                    <p className="text-xl font-bold ui-text-primary leading-tight">
                      👉 AI 시대의 개발자는 코드를 많이 치는 사람이 아니라,<br />
                      <span className="text-brand-primary">AI가 만든 코드를 설계·검증·조합·운영할 수 있는 사람</span>입니다.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <Card className="p-8 border-l-4 border-l-brand-primary">
                  <h3 className="text-lg font-bold ui-text-primary mb-4">프로토타이핑은 거의 공짜</h3>
                  <p className="text-sm ui-text-secondary leading-relaxed mb-4">
                    UI 시안 3개, API 구조 비교, 데이터 모델링 초안 비교 — 모두 빠르게 가능합니다.
                  </p>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-xs ui-text-muted">
                      <span className="font-bold ui-text-primary">과거:</span> 많이 만들어보는 능력이 강점
                    </div>
                    <div className="flex items-center gap-2 text-xs ui-text-muted">
                      <span className="font-bold text-brand-primary">현재:</span> 좋은 것을 고르는 판단력이 더 중요
                    </div>
                  </div>
               </Card>
               <Card className="p-8 border-l-4 border-l-orange-500">
                  <h3 className="text-lg font-bold ui-text-primary mb-4">AI 코딩의 변곡점</h3>
                  <p className="text-sm ui-text-secondary leading-relaxed mb-4">
                    AI 에이전트는 단순 자동완성을 넘어 "시키면 어느 정도 완성해오는 수준"입니다.
                  </p>
                  <div className="p-3 bg-surface-muted rounded-lg text-xs font-mono ui-text-primary">
                    진짜 질문: "AI가 만든 대량의 코드를 어떻게 검증·관리할 거냐?"
                  </div>
               </Card>
            </section>
          </div>
        )}

        {activeTab === 'tools' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <section className="space-y-6">
              <h2 className="text-2xl font-bold ui-text-primary flex items-center gap-3">
                <Terminal className="size-6 text-brand-primary" /> 1. AI = 이미 기본 도구
              </h2>
              <p className="ui-text-secondary">코드 생성부터 아키텍처 검토까지, 전 영역에서 생산성에 직접적인 영향을 미칩니다.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { title: '안 쓰는 개발자', desc: '경쟁력 하락', status: 'danger' },
                  { title: '잘 쓰는 개발자', desc: '생산성 폭발', status: 'success' },
                  { title: '시스템화하는 개발자', desc: '팀 전체 생산성 상승', status: 'brand' }
                ].map((item, idx) => (
                  <div key={idx} className="p-5 rounded-xl border border-surface-border bg-surface-muted/30">
                    <div className="text-[10px] font-black uppercase tracking-widest ui-text-muted mb-1">{item.title}</div>
                    <div className={`text-lg font-bold ${
                      item.status === 'danger' ? 'text-red-500' : 
                      item.status === 'success' ? 'text-emerald-500' : 'text-brand-primary'
                    }`}>{item.desc}</div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                {['코드 생성', '디버깅', '리팩토링', '문서화', '테스트 작성', 'UI 프로토타이핑', '아키텍처 검토', '자동화'].map(tag => (
                  <span key={tag} className="px-3 py-1 rounded-md bg-surface-raised border border-surface-border text-xs font-medium ui-text-secondary">
                    {tag}
                  </span>
                ))}
              </div>
            </section>
          </div>
        )}

        {activeTab === 'foundation' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <section className="space-y-6">
              <h2 className="text-2xl font-bold ui-text-primary flex items-center gap-3">
                <Layout className="size-6 text-brand-primary" /> 2. AI 개발 = 기존 개발의 확장판
              </h2>
              <p className="ui-text-secondary leading-relaxed">
                개발의 본질은 그대로입니다. AI는 과정을 대신하지 않고, 증폭할 뿐입니다.
              </p>

              <div className="ui-panel-soft overflow-hidden rounded-2xl border border-surface-border-soft">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-muted/50 border-b border-surface-border-soft">
                      <th className="px-6 py-4 text-xs font-black uppercase tracking-widest ui-text-secondary w-1/4">영역</th>
                      <th className="px-6 py-4 text-xs font-black uppercase tracking-widest ui-text-secondary">주요 내용</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border-soft">
                    {[
                      { key: '설계', val: 'DB 설계, UI/UX 흐름, 도메인 구조' },
                      { key: '구조', val: '비즈니스 로직, 아키텍처, 책임 분리' },
                      { key: '협업', val: '테스트, 코드 리뷰, 문서화, 컨벤션' },
                      { key: '관측', val: '로그, 모니터링, 오류 추적' },
                      { key: '운영', val: '배포, 장애 대응, 유지보수' },
                    ].map((row) => (
                      <tr key={row.key} className="hover:bg-surface-muted/20 transition-colors">
                        <td className="px-6 py-4 text-sm font-bold ui-text-primary">{row.key}</td>
                        <td className="px-6 py-4 text-sm ui-text-secondary">{row.val}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 rounded-xl border border-red-500/20 bg-red-500/5">
                  <h4 className="text-sm font-bold text-red-500 mb-2">기본기 약하면</h4>
                  <p className="text-xs ui-text-secondary">AI는 부실 코드를 빠르게 만듭니다.</p>
                </div>
                <div className="p-6 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                  <h4 className="text-sm font-bold text-emerald-500 mb-2">기본기 강하면</h4>
                  <p className="text-xs ui-text-secondary">AI는 생산성을 폭발시킵니다.</p>
                </div>
              </div>
            </section>
          </div>
        )}

        {activeTab === 'input' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <section className="space-y-6">
              <h2 className="text-2xl font-bold ui-text-primary flex items-center gap-3">
                <BrainCircuit className="size-6 text-brand-primary" /> 3. AI = 입력 증폭기
              </h2>
              <p className="ui-text-secondary">AI는 정답 자판기가 아니라, 내 입력을 증폭하는 도구입니다.</p>
              
              <div className="space-y-4">
                <div className="group p-6 rounded-xl border border-brand-border/30 bg-brand-glass/10 hover:bg-brand-glass/20 transition-all">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="size-8 rounded-lg bg-brand-primary flex items-center justify-center text-primary-foreground">
                      <CheckCircle2 className="size-5" />
                    </div>
                    <h4 className="font-bold ui-text-primary">좋은 입력 (Good Input)</h4>
                  </div>
                  <p className="text-sm ui-text-secondary leading-relaxed">
                    명확한 요구사항, DB 구조, API 스펙, UI 흐름, 비즈니스 규칙, 예외 케이스
                  </p>
                </div>

                <div className="group p-6 rounded-xl border border-red-500/20 bg-red-500/5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="size-8 rounded-lg bg-red-500 flex items-center justify-center text-white">
                      <AlertTriangle className="size-5" />
                    </div>
                    <h4 className="font-bold ui-text-primary">나쁜 입력 (Bad Input)</h4>
                  </div>
                  <p className="text-sm ui-text-secondary leading-relaxed">
                    애매한 요구사항, 구조 없는 지시, 도메인 이해 부족, 검증 기준 없음 → <span className="text-red-500 font-medium">그럴듯하지만 위험한 코드</span>
                  </p>
                </div>
              </div>

              <div className="p-8 rounded-2xl bg-surface-muted/50 border border-surface-border text-center">
                <div className="text-xs font-black uppercase tracking-[0.2em] ui-text-muted mb-4">AI 품질 공식</div>
                <div className="text-2xl font-black ui-text-primary flex flex-wrap items-center justify-center gap-4">
                  <span>질문 능력</span>
                  <Plus />
                  <span>설계 능력</span>
                  <Plus />
                  <span>검증 능력</span>
                </div>
              </div>
            </section>
          </div>
        )}

        {activeTab === 'validation' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <section className="space-y-6">
              <h2 className="text-2xl font-bold ui-text-primary flex items-center gap-3">
                <Microscope className="size-6 text-brand-primary" /> 5. 코드는 싸졌다, 검증은 비싸졌다
              </h2>
              <p className="ui-text-secondary leading-relaxed">
                이제 문제는 코드 부족이 아니라 <b>코드 과잉</b>입니다. 구조 흐트러짐, 중복 증가, 유지보수 난도 폭증을 막아야 합니다.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-6">
                   <h4 className="text-sm font-black uppercase tracking-widest ui-text-muted mb-4">검증 방식</h4>
                   <div className="flex flex-wrap gap-2">
                     {['단위 테스트', '통합 테스트', 'E2E 테스트', '타입 체크', '린트', '코드 리뷰', 'TDD'].map(v => (
                       <span key={v} className="px-3 py-1.5 rounded bg-surface-muted border border-surface-border text-xs font-bold ui-text-primary">
                         {v}
                       </span>
                     ))}
                   </div>
                </Card>
                <Card className="p-6 bg-brand-primary/5 border-brand-border/20">
                   <h4 className="text-sm font-bold text-brand-primary mb-3">TDD + AI 시너지</h4>
                   <div className="space-y-3">
                     {[
                       '실패 테스트 작성',
                       'AI가 통과 코드 생성',
                       '실행 및 리팩토링',
                       '재검증'
                     ].map((step, i) => (
                       <div key={i} className="flex items-center gap-3 text-xs ui-text-secondary">
                         <div className="size-5 rounded-full bg-brand-glass border border-brand-border text-brand-primary flex items-center justify-center font-bold">{i+1}</div>
                         {step}
                       </div>
                     ))}
                   </div>
                </Card>
              </div>
            </section>
          </div>
        )}

        {activeTab === 'comparison' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <section className="space-y-6">
              <h2 className="text-2xl font-bold ui-text-primary flex items-center gap-3">
                <MessageSquare className="size-6 text-brand-primary" /> 8. Claude vs GPT
              </h2>
              <p className="ui-text-secondary">Claude와 GPT는 경쟁이 아니라 교차 검증 파트너입니다.</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="ui-panel-soft rounded-2xl overflow-hidden border border-surface-border-soft">
                   <div className="p-5 bg-[#D97757]/10 border-b border-[#D97757]/20 flex items-center justify-between">
                     <span className="font-black text-[#D97757]">CLAUDE</span>
                     <div className="px-2 py-1 rounded bg-[#D97757] text-white text-[10px] font-bold">STABLE</div>
                   </div>
                   <div className="p-6 space-y-4">
                     <div>
                       <div className="text-[10px] font-bold ui-text-muted uppercase mb-1">특징</div>
                       <div className="text-sm ui-text-primary font-medium">안정적, 보수적, 긴 맥락 강함</div>
                     </div>
                     <div>
                       <div className="text-[10px] font-bold ui-text-muted uppercase mb-1">강점</div>
                       <div className="text-sm ui-text-secondary leading-relaxed">복잡한 로직, 디버깅, 구조 설계, 리팩토링, 리스크 판단</div>
                     </div>
                   </div>
                </div>

                <div className="ui-panel-soft rounded-2xl overflow-hidden border border-surface-border-soft">
                   <div className="p-5 bg-emerald-500/10 border-b border-emerald-500/20 flex items-center justify-between">
                     <span className="font-black text-emerald-500">GPT</span>
                     <div className="px-2 py-1 rounded bg-emerald-500 text-white text-[10px] font-bold">FAST</div>
                   </div>
                   <div className="p-6 space-y-4">
                     <div>
                       <div className="text-[10px] font-bold ui-text-muted uppercase mb-1">특징</div>
                       <div className="text-sm ui-text-primary font-medium">빠름, 유연함, 아이디어 확장</div>
                     </div>
                     <div>
                       <div className="text-[10px] font-bold ui-text-muted uppercase mb-1">강점</div>
                       <div className="text-sm ui-text-secondary leading-relaxed">빠른 코드 생성, UI/UX, 문서 정리, 예시 코드</div>
                     </div>
                   </div>
                </div>
              </div>

              <div className="p-6 rounded-xl bg-surface-muted border border-surface-border">
                <h4 className="text-sm font-bold ui-text-primary mb-4 flex items-center gap-2">
                  <BookOpen className="size-4 text-brand-primary" /> 교차 검증 공식
                </h4>
                <div className="flex flex-col md:flex-row items-center gap-4 text-xs ui-text-secondary">
                  <div className="flex-1 text-center p-3 rounded bg-background border border-surface-border-soft">같은 문제를 두 모델에 투입</div>
                  <ArrowRight className="hidden md:block shrink-0 opacity-40" />
                  <div className="flex-1 text-center p-3 rounded bg-background border border-surface-border-soft">결과 비교 및 충돌 지점 확인</div>
                  <ArrowRight className="hidden md:block shrink-0 opacity-40" />
                  <div className="flex-1 text-center p-3 rounded bg-background border border-surface-border-soft text-brand-primary font-bold">사람이 최종 판단 & 검증</div>
                </div>
              </div>
            </section>
          </div>
        )}

        {activeTab === 'levels' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <section className="space-y-6">
              <h2 className="text-2xl font-bold ui-text-primary flex items-center gap-3">
                <Layers className="size-6 text-brand-primary" /> 9. AI 활용 개발자 레벨
              </h2>
              
              <div className="space-y-4">
                {[
                  { lv: 'Lv 1~2', title: '검색툴', desc: '단발성 질문, 복붙, 검증 약함', color: 'ui-text-muted' },
                  { lv: 'Lv 3~4', title: '생산성 도구', desc: '구조 맞춰 재구성, 코드 생성 활용', color: 'ui-text-secondary' },
                  { lv: 'Lv 5', title: '문제 해결 도구', desc: '생성 + 검증 균형, 도메인 이해, 테스트 병행', color: 'text-brand-primary font-bold' },
                  { lv: 'Lv 6~7', title: '시스템 구성 요소', desc: '에이전트·자동화·팀 표준화 설계', color: 'text-brand-primary font-black' },
                ].map((l) => (
                  <div key={l.lv} className="flex items-center gap-6 p-4 rounded-xl hover:bg-surface-muted transition-colors border border-transparent hover:border-surface-border">
                    <div className="w-20 text-xs font-black ui-text-muted">{l.lv}</div>
                    <div className="w-32 text-sm font-bold ui-text-primary">{l.title}</div>
                    <div className={`flex-1 text-sm ${l.color}`}>{l.desc}</div>
                  </div>
                ))}
              </div>

              <div className="mt-10 p-8 rounded-2xl border-2 border-dashed border-surface-border-soft text-center">
                 <h4 className="text-lg font-bold ui-text-primary mb-6">AI 활용 능력의 본질</h4>
                 <div className="flex flex-col md:flex-row gap-4 items-stretch">
                   <div className="flex-1 p-4 rounded-xl bg-surface-muted border border-surface-border">
                     <div className="text-[10px] font-bold ui-text-muted uppercase mb-2">기본기</div>
                     <div className="text-xs ui-text-secondary">아키텍처, DB, 도메인, UI/UX</div>
                   </div>
                   <div className="flex-1 p-4 rounded-xl bg-surface-muted border border-surface-border">
                     <div className="text-[10px] font-bold ui-text-muted uppercase mb-2">복잡성 해결</div>
                     <div className="text-xs ui-text-secondary">상태 흐름, 트랜잭션, 정합성</div>
                   </div>
                   <div className="flex-1 p-4 rounded-xl bg-surface-muted border border-surface-border">
                     <div className="text-[10px] font-bold ui-text-muted uppercase mb-2">시스템화</div>
                     <div className="text-xs ui-text-secondary">컨벤션, 재사용, 자동화</div>
                   </div>
                 </div>
              </div>
            </section>
          </div>
        )}

        {activeTab === 'strategy' && (
          <div className="space-y-12 animate-in fade-in slide-in-from-right-4 duration-500">
            <section className="space-y-6">
              <h2 className="text-2xl font-bold ui-text-primary flex items-center gap-3">
                <ShieldCheck className="size-6 text-brand-primary" /> 개인 및 팀 전략
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <h3 className="text-xl font-bold ui-text-primary flex items-center gap-2">
                    <Users className="size-5 text-brand-primary" /> 개인 전략: 자산 축적
                  </h3>
                  <div className="space-y-3">
                    {[
                      { t: '보일러플레이트', d: '인증, 권한, 레이아웃, API 구조' },
                      { t: '기능 모듈', d: '알림, 결제, 업로드, 관리자 테이블' },
                      { t: '도메인 파일럿', d: '예약, 커머스, 상담/채팅 시나리오' },
                      { t: '검증 템플릿', d: '구현 계획, 테스트 케이스, 리뷰 리스트' }
                    ].map(i => (
                      <div key={i.t} className="p-4 rounded-lg bg-surface-muted border border-surface-border-soft">
                        <div className="text-sm font-bold ui-text-primary mb-1">{i.t}</div>
                        <div className="text-xs ui-text-secondary">{i.d}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-xl font-bold ui-text-primary flex items-center gap-2">
                    <Cpu className="size-5 text-emerald-500" /> 팀 전략: 시스템화
                  </h3>
                  <div className="space-y-3">
                    {[
                      { t: '팀 표준', d: '폴더 구조, 네이밍, 에러 코드, PR 리뷰' },
                      { t: '팀 자산', d: '공통 UI, 훅, API 클라이언트, 테스트 유틸' },
                      { t: '팀 자동화', d: 'AI 코드 리뷰, 문서 생성, PR 요약' }
                    ].map(i => (
                      <div key={i.t} className="p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                        <div className="text-sm font-bold ui-text-primary mb-1">{i.t}</div>
                        <div className="text-xs ui-text-secondary">{i.d}</div>
                      </div>
                    ))}
                  </div>
                  <div className="p-5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                    <p className="text-sm font-bold text-emerald-600">
                      팀 경쟁력 = AI가 잘 작동하는 개발 시스템을 갖췄느냐
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {activeTab === 'risk' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <section className="space-y-6">
              <h2 className="text-2xl font-bold ui-text-primary flex items-center gap-3">
                <AlertTriangle className="size-6 text-red-500" /> 14. 위험 요소
              </h2>
              <p className="ui-text-secondary">AI가 강력해질수록 위험도 커집니다. 자동화의 핵심은 편리함보다 권한 통제와 검증 구조입니다.</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  '보안 정보 노출',
                  '잘못된 코드 자동 생성',
                  '테스트 없는 대량 코드',
                  '컨벤션·책임 분리 붕괴',
                  '사람이 이해 못 하는 코드 증가'
                ].map((risk) => (
                  <div key={risk} className="p-4 rounded-lg bg-red-500/5 border border-red-500/10 flex items-center gap-3">
                    <div className="size-2 rounded-full bg-red-500 shrink-0" />
                    <span className="text-sm font-medium text-red-700">{risk}</span>
                  </div>
                ))}
              </div>

              <div className="p-8 rounded-2xl bg-surface-muted border border-surface-border text-center">
                 <h4 className="text-lg font-bold ui-text-primary mb-2">최종 한줄 결론</h4>
                 <p className="text-xl ui-text-secondary leading-relaxed">
                   AI 개발자는 코드를 직접 많이 치는 사람이 아니라,<br />
                   <b className="ui-text-primary">AI가 만든 코드를 설계하고, 검증하고, 조합하고, 운영 가능한 시스템으로 만드는 사람</b>입니다.
                 </p>
              </div>
            </section>
          </div>
        )}

        {activeTab === 'video' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <section className="space-y-6">
              <h2 className="text-2xl font-bold ui-text-primary flex items-center gap-3">
                <Rocket className="size-6 text-brand-primary" /> 참고 영상 및 자료
              </h2>
              <p className="ui-text-secondary">AI 개발론과 관련된 학습 영상 및 심화 자료입니다.</p>
              
              <div className="aspect-video w-full overflow-hidden rounded-2xl border border-surface-border bg-surface-muted shadow-xl">
                <iframe 
                  width="100%" 
                  height="100%" 
                  src="https://www.youtube.com/embed/p3R-8dPzkI8" 
                  title="YouTube video player" 
                  frameBorder="0" 
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                  allowFullScreen
                ></iframe>
              </div>

              <Card className="p-6">
                <h4 className="text-sm font-bold ui-text-primary mb-4 flex items-center gap-2">
                  <BookOpen className="size-4 text-brand-primary" /> 참고 문서 및 링크
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <a 
                    href="https://eopla.net/magazines/41947" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-4 rounded-xl border border-surface-border-soft bg-surface-muted/30 hover:bg-brand-glass hover:border-brand-border transition-all group"
                  >
                    <div className="text-sm font-bold ui-text-primary group-hover:text-brand-primary mb-1">Eopla Magazine: AI 개발론</div>
                    <div className="text-xs ui-text-muted">실무에서 바로 쓰는 AI 개발 방법론 심화 아티클</div>
                  </a>
                  <a 
                    href="https://youtu.be/DjawYbasns4?si=mgqVC_FqfsYCqn5U" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-4 rounded-xl border border-surface-border-soft bg-surface-muted/30 hover:bg-brand-glass hover:border-brand-border transition-all group"
                  >
                    <div className="text-sm font-bold ui-text-primary group-hover:text-brand-primary mb-1 flex items-center gap-2">
                      <Zap className="size-3 text-brand-primary" /> AI 협업 실무 가이드
                    </div>
                    <div className="text-xs ui-text-muted">AI와 함께 일하는 개발자의 태도와 방법</div>
                  </a>
                  <a 
                    href="https://youtube.com/shorts/rjkSYOafGSg?si=YgGfjLDR_Fvm9dYq" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-4 rounded-xl border border-surface-border-soft bg-surface-muted/30 hover:bg-brand-glass hover:border-brand-border transition-all group"
                  >
                    <div className="text-sm font-bold ui-text-primary group-hover:text-brand-primary mb-1 flex items-center gap-2">
                      <Rocket className="size-3 text-brand-primary" /> AI 개발 생산성 Shorts
                    </div>
                    <div className="text-xs ui-text-muted">핵심만 빠르게 짚어주는 AI 코딩 팁</div>
                  </a>
                  <a 
                    href="https://hibot-docu.com/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-4 rounded-xl border border-surface-border-soft bg-surface-muted/30 hover:bg-brand-glass hover:border-brand-border transition-all group"
                  >
                    <div className="text-sm font-bold ui-text-primary group-hover:text-brand-primary mb-1">Hibot Documentation</div>
                    <div className="text-xs ui-text-muted">시스템화된 AI 개발 가이드 및 문서</div>
                  </a>
                </div>
              </Card>
            </section>
          </div>
        )}
      </main>
    </div>
  )
}
