import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { BrandMark } from './BrandMark';
import { useLanguage } from './LanguageContext';

type DemoView = 'dashboard' | 'tasks' | 'calendar' | 'notifications';
type DemoStatus = 'REQUESTED' | 'TODO' | 'IN_PROGRESS' | 'ON_HOLD' | 'COMPLETED';
type DemoTask = {
  id: number;
  ko: string;
  en: string;
  status: DemoStatus;
  priority: 'NORMAL' | 'HIGH' | 'URGENT';
  owner: string;
  due: [string, string];
  description: [string, string];
  progress: number;
};

const tasks: DemoTask[] = [
  { id: 1, ko: 'OAuth2 로그인 회귀 테스트', en: 'OAuth2 login regression test', status: 'IN_PROGRESS', priority: 'URGENT', owner: '이개발', due: ['오늘 18:00', 'Today 18:00'], description: ['Google 로그인과 신규 가입 동의 흐름을 점검합니다.', 'Verify Google login and the new-user consent flow.'], progress: 67 },
  { id: 2, ko: '결제 정보 마스킹 검증', en: 'Payment data masking review', status: 'IN_PROGRESS', priority: 'URGENT', owner: '정품질', due: ['오늘 17:00', 'Today 17:00'], description: ['카드번호와 빌링키가 응답 및 로그에 노출되지 않는지 확인합니다.', 'Confirm card data and billing keys never appear in responses or logs.'], progress: 80 },
  { id: 3, ko: '대시보드 디자인 시스템 적용', en: 'Apply dashboard design system', status: 'IN_PROGRESS', priority: 'HIGH', owner: '한디자인', due: ['내일', 'Tomorrow'], description: ['카드, 상태 배지와 반응형 간격을 일관되게 적용합니다.', 'Apply consistent cards, badges, and responsive spacing.'], progress: 54 },
  { id: 4, ko: '서비스 이용약관 최종 검토', en: 'Final terms review', status: 'ON_HOLD', priority: 'HIGH', owner: '최기획', due: ['8월 4일', 'Aug 4'], description: ['출시 버전 약관과 개인정보 처리 안내를 검토합니다.', 'Review launch terms and the privacy notice.'], progress: 45 },
  { id: 5, ko: '운영 배포 체크리스트', en: 'Production deployment checklist', status: 'COMPLETED', priority: 'URGENT', owner: '이개발', due: ['완료', 'Completed'], description: ['백업, 헬스체크와 롤백 절차를 실제 배포 기준으로 확인했습니다.', 'Verified backups, health checks, and rollback procedures.'], progress: 100 },
  { id: 6, ko: '모바일 브라우저 호환성 점검', en: 'Mobile browser compatibility', status: 'TODO', priority: 'HIGH', owner: '정품질', due: ['8월 2일', 'Aug 2'], description: ['Chrome과 Safari의 핵심 사용자 흐름을 점검합니다.', 'Test core user flows in Chrome and Safari.'], progress: 20 },
  { id: 7, ko: '출시 공지 초안', en: 'Draft launch announcement', status: 'IN_PROGRESS', priority: 'NORMAL', owner: '최기획', due: ['8월 3일', 'Aug 3'], description: ['주요 기능과 사용 방법을 고객 관점에서 정리합니다.', 'Explain key features and usage from the customer perspective.'], progress: 38 },
  { id: 8, ko: '이메일 템플릿 개선 제안', en: 'Improve email templates', status: 'REQUESTED', priority: 'NORMAL', owner: '미지정', due: ['8월 7일', 'Aug 7'], description: ['가입과 비밀번호 재설정 메일의 완성도를 높입니다.', 'Improve signup and password-reset email quality.'], progress: 0 },
  { id: 9, ko: '알림 읽음 처리 API', en: 'Notification read-state API', status: 'TODO', priority: 'NORMAL', owner: '박백엔드', due: ['8월 5일', 'Aug 5'], description: ['알림 목록과 읽음 상태 동기화를 마무리합니다.', 'Finish notification list and read-state synchronization.'], progress: 15 },
  { id: 10, ko: '온보딩 와이어프레임', en: 'Onboarding wireframes', status: 'COMPLETED', priority: 'HIGH', owner: '한디자인', due: ['완료', 'Completed'], description: ['첫 로그인부터 팀 생성까지의 화면 흐름입니다.', 'Covers first login through team creation.'], progress: 100 },
  { id: 11, ko: '부하 테스트 결과 정리', en: 'Document load-test results', status: 'TODO', priority: 'NORMAL', owner: '정품질', due: ['8월 6일', 'Aug 6'], description: ['단일 서버 기준 병목과 안전 운영 범위를 정리합니다.', 'Document bottlenecks and safe operating limits for one server.'], progress: 10 },
  { id: 12, ko: '고객 문의 FAQ 작성', en: 'Write customer FAQ', status: 'IN_PROGRESS', priority: 'NORMAL', owner: '박지원', due: ['어제', 'Yesterday'], description: ['로그인, 초대와 결제 관련 질문을 정리합니다.', 'Cover common login, invitation, and payment questions.'], progress: 72 },
];

const statusText: Record<DemoStatus, [string, string]> = {
  REQUESTED: ['승인 대기', 'Pending'],
  TODO: ['할 일', 'To do'],
  IN_PROGRESS: ['진행 중', 'In progress'],
  ON_HOLD: ['보류', 'On hold'],
  COMPLETED: ['완료', 'Completed'],
};

export function DemoPage() {
  const { t, language, setLanguage } = useLanguage();
  const [view, setView] = useState<DemoView>('dashboard');
  const [status, setStatus] = useState<'ALL' | DemoStatus>('ALL');
  const [selectedTask, setSelectedTask] = useState<DemoTask>(tasks[0]);
  const filtered = status === 'ALL' ? tasks : tasks.filter((task) => task.status === status);

  return <div className="demo-page">
    <aside className="demo-nav">
      <Link className="demo-brand" to="/"><span><BrandMark /></span><strong>{t('퇴사', 'toesa')}</strong></Link>
      <div className="demo-readonly"><b>● {t('읽기 전용 데모', 'Read-only demo')}</b><small>{t('API와 데이터베이스에 연결되지 않습니다.', 'No API or database connection.')}</small></div>
      <label className="demo-team-switcher"><span>{t('현재 그룹', 'Current team')}</span><strong>🚀 {t('퇴사 런칭 준비팀', 'toesa Launch Team')}</strong><small>{t('멤버 6명 · 팀장 김서준', '6 members · Lead Seo-jun Kim')}</small></label>
      <nav aria-label={t('데모 메뉴', 'Demo navigation')}>
        <DemoNavButton active={view === 'dashboard'} icon="⌂" onClick={() => setView('dashboard')}>{t('대시보드', 'Dashboard')}</DemoNavButton>
        <DemoNavButton active={view === 'tasks'} icon="✓" onClick={() => setView('tasks')}>{t('업무', 'Tasks')}<i>12</i></DemoNavButton>
        <DemoNavButton active={view === 'calendar'} icon="□" onClick={() => setView('calendar')}>{t('캘린더', 'Calendar')}</DemoNavButton>
        <DemoNavButton active={view === 'notifications'} icon="♢" onClick={() => setView('notifications')}>{t('알림', 'Notifications')}<i>5</i></DemoNavButton>
      </nav>
      <div className="demo-profile"><span>김</span><div><strong>{t('김서준 팀장', 'Seo-jun Kim')}</strong><small>demo@totaskflow.local</small></div></div>
    </aside>

    <main className="demo-main">
      <header className="demo-topbar">
        <div><b>{t('제품 체험', 'Product tour')}</b><span>{t('화면을 자유롭게 둘러보세요. 저장되는 내용은 없습니다.', 'Explore freely. Nothing is saved.')}</span></div>
        <div><button type="button" onClick={() => setLanguage(language === 'ko' ? 'en' : 'ko')}>{language === 'ko' ? 'EN' : '한글'}</button><Link to="/">{t('랜딩으로', 'Back')}</Link><Link className="demo-start" to="/login">{t('내 계정으로 시작', 'Start with my account')} →</Link></div>
      </header>

      {view === 'dashboard' && <DemoDashboard onOpenTasks={() => setView('tasks')} onSelect={(task) => { setSelectedTask(task); setView('tasks'); }} />}
      {view === 'tasks' && <DemoTasks filtered={filtered} selected={selectedTask} status={status} onStatus={setStatus} onSelect={setSelectedTask} />}
      {view === 'calendar' && <DemoCalendar />}
      {view === 'notifications' && <DemoNotifications onOpenTask={(task) => { setSelectedTask(task); setView('tasks'); }} />}
    </main>
  </div>;
}

function DemoNavButton({ active, icon, onClick, children }: { active: boolean; icon: string; onClick: () => void; children: ReactNode }) {
  return <button type="button" className={active ? 'active' : ''} onClick={onClick}><span aria-hidden="true">{icon}</span>{children}</button>;
}

function DemoDashboard({ onOpenTasks, onSelect }: { onOpenTasks: () => void; onSelect: (task: DemoTask) => void }) {
  const { t, language } = useLanguage();
  const label = (pair: [string, string]) => pair[language === 'ko' ? 0 : 1];
  return <section className="demo-view">
    <header className="demo-view-heading"><div><span className="page-eyebrow">OVERVIEW</span><h1>{t('김서준님, 오늘의 팀 흐름이에요.', 'Here is your team flow, Seo-jun.')}</h1><p>{t('승인할 업무 2개와 마감이 가까운 업무 3개를 먼저 확인해 주세요.', 'Start with 2 approvals and 3 tasks nearing their deadlines.')}</p></div><button type="button" disabled title={t('읽기 전용 데모입니다.', 'This is a read-only demo.')}>＋ {t('새 업무', 'New task')}</button></header>
    <div className="demo-kpis">
      <article><span>{t('전체 업무', 'Total tasks')}</span><strong>32</strong><small>+6 {t('이번 주', 'this week')}</small></article>
      <article><span>{t('진행 중', 'In progress')}</span><strong>8</strong><small>25%</small></article>
      <article><span>{t('완료', 'Completed')}</span><strong>19</strong><small>↗ 12%</small></article>
      <article className="risk"><span>{t('마감 임박', 'Due soon')}</span><strong>3</strong><small>{t('확인 필요', 'Needs review')}</small></article>
      <article><span>{t('완료율', 'Completion')}</span><strong>76%</strong><small>{t('지난주 71%', '71% last week')}</small></article>
    </div>
    <div className="demo-dashboard-grid">
      <article className="demo-panel demo-priority-panel"><header><div><span>MY PRIORITY</span><h2>{t('먼저 볼 업무', 'Priority work')}</h2></div><button type="button" onClick={onOpenTasks}>{t('전체 보기', 'View all')} →</button></header>{tasks.slice(0, 5).map((task) => <button className="demo-task-row" type="button" onClick={() => onSelect(task)} key={task.id}><span className={`demo-status ${task.status.toLowerCase()}`}>{label(statusText[task.status])}</span><strong>{language === 'ko' ? task.ko : task.en}</strong><small>{task.owner}</small><time>{label(task.due)}</time></button>)}</article>
      <article className="demo-panel demo-flow-panel"><header><div><span>WORKFLOW</span><h2>{t('업무 상태', 'Task status')}</h2></div><b>32</b></header><div className="demo-donut"><strong>76<small>%</small></strong></div><ul><li><i className="requested" />{t('승인 대기', 'Pending')}<b>2</b></li><li><i className="todo" />{t('할 일', 'To do')}<b>7</b></li><li><i className="progress" />{t('진행 중', 'In progress')}<b>8</b></li><li><i className="hold" />{t('보류', 'On hold')}<b>2</b></li><li><i className="done" />{t('완료', 'Completed')}<b>13</b></li></ul></article>
      <article className="demo-panel demo-workload"><header><div><span>TEAM</span><h2>{t('팀 업무량', 'Team workload')}</h2></div><small>{t('최근 30일', 'Last 30 days')}</small></header><div>{[['김서준', 82, 6], ['이개발', 68, 5], ['한디자인', 54, 4], ['최기획', 46, 3], ['정품질', 75, 5], ['박지원', 39, 2]].map(([name, width, count]) => <div className="demo-member-load" key={String(name)}><span>{String(name).slice(0, 1)}</span><strong>{name}</strong><i><b style={{ width: `${width}%` }} /></i><small>{count}{t('개', '')}</small></div>)}</div></article>
      <article className="demo-panel demo-upcoming"><header><div><span>SCHEDULE</span><h2>{t('다가오는 일정', 'Upcoming')}</h2></div></header><div><span><b>31</b><small>JUL</small></span><p><strong>{t('주간 진행 공유', 'Weekly progress sync')}</strong><small>10:00 · {t('회의실 A', 'Room A')}</small></p></div><div><span><b>01</b><small>AUG</small></span><p><strong>{t('출시 전 보안 점검', 'Pre-launch security review')}</strong><small>14:00 · Online</small></p></div><div><span><b>04</b><small>AUG</small></span><p><strong>{t('고객 피드백 리뷰', 'Customer feedback review')}</strong><small>11:00 · {t('회의실 B', 'Room B')}</small></p></div></article>
    </div>
  </section>;
}

function DemoTasks({ filtered, selected, status, onStatus, onSelect }: { filtered: DemoTask[]; selected: DemoTask; status: 'ALL' | DemoStatus; onStatus: (status: 'ALL' | DemoStatus) => void; onSelect: (task: DemoTask) => void }) {
  const { t, language } = useLanguage();
  const label = (pair: [string, string]) => pair[language === 'ko' ? 0 : 1];
  const filters: Array<'ALL' | DemoStatus> = ['ALL', 'REQUESTED', 'TODO', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED'];
  return <section className="demo-view">
    <header className="demo-view-heading"><div><span className="page-eyebrow">TASKS</span><h1>{t('팀 업무', 'Team tasks')}</h1><p>{t('업무를 선택하면 체크리스트와 대화 맥락까지 확인할 수 있습니다.', 'Select a task to inspect its checklist and conversation context.')}</p></div><button type="button" disabled>＋ {t('업무 요청', 'Request task')}</button></header>
    <div className="demo-filter">{filters.map((value) => <button className={status === value ? 'active' : ''} type="button" onClick={() => onStatus(value)} key={value}>{value === 'ALL' ? t('전체', 'All') : label(statusText[value])}<small>{value === 'ALL' ? tasks.length : tasks.filter((task) => task.status === value).length}</small></button>)}</div>
    <div className="demo-task-layout"><div className="demo-task-list">{filtered.map((task) => <button type="button" className={selected.id === task.id ? 'selected' : ''} onClick={() => onSelect(task)} key={task.id}><div><span className={`demo-status ${task.status.toLowerCase()}`}>{label(statusText[task.status])}</span><span className={`demo-priority ${task.priority.toLowerCase()}`}>{task.priority}</span></div><strong>{language === 'ko' ? task.ko : task.en}</strong><p>{label(task.description)}</p><footer><span>○ {task.owner}</span><time>◷ {label(task.due)}</time></footer></button>)}</div><aside className="demo-task-detail"><div className="demo-detail-lock">🔒 <span><b>{t('읽기 전용', 'Read only')}</b><small>{t('모든 변경 기능이 비활성화되어 있습니다.', 'All mutation controls are disabled.')}</small></span></div><span className={`demo-status ${selected.status.toLowerCase()}`}>{label(statusText[selected.status])}</span><h2>{language === 'ko' ? selected.ko : selected.en}</h2><p>{label(selected.description)}</p><dl><div><dt>{t('담당자', 'Owner')}</dt><dd>{selected.owner}</dd></div><div><dt>{t('마감', 'Due')}</dt><dd>{label(selected.due)}</dd></div><div><dt>{t('진행률', 'Progress')}</dt><dd>{selected.progress}%</dd></div></dl><div className="demo-progress"><i style={{ width: `${selected.progress}%` }} /></div><section><h3>{t('체크리스트', 'Checklist')} <small>2/3</small></h3><label><input type="checkbox" checked readOnly />{t('요청·응답 필드 확인', 'Review request/response fields')}</label><label><input type="checkbox" checked readOnly />{t('운영 로그 마스킹 확인', 'Verify production log masking')}</label><label><input type="checkbox" readOnly />{t('최종 결과 공유', 'Share final result')}</label></section><section><h3>{t('최근 댓글', 'Recent comments')}</h3><blockquote><b>김서준</b><p>{t('민감 정보가 화면과 로그에 남지 않는지 마지막으로 확인해 주세요.', 'Please make one final check that sensitive data never remains on screen or in logs.')}</p><small>{t('35분 전', '35 min ago')}</small></blockquote><blockquote><b>{selected.owner}</b><p>{t('확인 중입니다. 완료 후 결과를 공유하겠습니다.', 'Reviewing now. I will share the result when complete.')}</p><small>{t('18분 전', '18 min ago')}</small></blockquote></section></aside></div>
  </section>;
}

function DemoCalendar() {
  const { t, language } = useLanguage();
  const [weekOffset, setWeekOffset] = useState(0);
  const days = useMemo(() => {
    const start = new Date();
    start.setHours(12, 0, 0, 0);
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    start.setDate(start.getDate() + weekOffset * 7);
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return date;
    });
  }, [weekOffset]);
  const events = [[0, '09:30', t('주간 계획', 'Weekly planning'), 'meeting'], [1, '14:00', t('디자인 QA', 'Design QA'), 'schedule'], [2, '11:00', t('OAuth2 점검', 'OAuth2 review'), 'task'], [3, '10:00', t('주간 진행 공유', 'Weekly sync'), 'meeting'], [3, '15:30', t('결제 보안 검토', 'Payment security review'), 'task'], [4, '14:00', t('발표 리허설', 'Presentation rehearsal'), 'schedule'], [6, '18:00', t('스프린트 마감', 'Sprint close'), 'task']] as const;
  return <section className="demo-view"><header className="demo-view-heading"><div><span className="page-eyebrow">CALENDAR</span><h1>{t('팀 통합 캘린더', 'Team calendar')}</h1><p>{t('업무 마감과 팀 일정을 한 주 단위로 확인합니다.', 'View task deadlines and team events in one weekly view.')}</p></div><button type="button" disabled>＋ {t('일정 추가', 'Add event')}</button></header><div className="demo-calendar-toolbar"><button type="button" onClick={() => setWeekOffset((value) => value - 1)} aria-label={t('이전 주', 'Previous week')}>‹</button><strong>{days[0].toLocaleDateString(language === 'ko' ? 'ko-KR' : 'en-US', { month: 'long', year: 'numeric' })}</strong><button type="button" onClick={() => setWeekOffset((value) => value + 1)} aria-label={t('다음 주', 'Next week')}>›</button><span><i className="meeting" />{t('회의', 'Meeting')}<i className="schedule" />{t('일정', 'Schedule')}<i className="task" />{t('업무 마감', 'Task due')}</span></div><div className="demo-calendar">{days.map((day, index) => <article className={day.toDateString() === new Date().toDateString() ? 'today' : ''} key={day.toISOString()}><header><span>{day.toLocaleDateString(language === 'ko' ? 'ko-KR' : 'en-US', { weekday: 'short' })}</span><b>{day.getDate()}</b></header>{events.filter(([dayIndex]) => dayIndex === index).map(([, time, title, type]) => <div className={type} key={`${time}-${title}`}><time>{time}</time><strong>{title}</strong><small>{type === 'meeting' ? t('팀 일정', 'Team event') : type === 'task' ? t('업무 마감', 'Task due') : t('공유 일정', 'Shared event')}</small></div>)}</article>)}</div></section>;
}

function DemoNotifications({ onOpenTask }: { onOpenTask: (task: DemoTask) => void }) {
  const { t } = useLanguage();
  const items = [
    ['urgent', t('업무 마감 임박', 'Task due soon'), t('결제 정보 마스킹 검증 업무가 오늘 마감됩니다.', 'Payment data masking review is due today.'), '12분 전', tasks[1]],
    ['mention', t('댓글에서 회원님을 언급했습니다.', 'You were mentioned in a comment.'), t('OAuth2 로그인 회귀 테스트에서 새 댓글을 확인하세요.', 'Review a new comment in the OAuth2 regression test.'), '35분 전', tasks[0]],
    ['status', t('업무가 진행 중으로 변경됐습니다.', 'Task moved to in progress.'), t('한디자인님이 대시보드 디자인 시스템 적용을 시작했습니다.', 'Han Design started applying the dashboard design system.'), '1시간 전', tasks[2]],
    ['request', t('새 업무 승인 요청', 'New approval request'), t('이메일 템플릿 개선 제안이 승인을 기다리고 있습니다.', 'The email template proposal is waiting for approval.'), '2시간 전', tasks[7]],
    ['hold', t('업무가 보류됐습니다.', 'Task placed on hold.'), t('서비스 이용약관 최종 검토가 법무 회신을 기다립니다.', 'Final terms review is waiting for legal feedback.'), '4시간 전', tasks[3]],
    ['done', t('업무가 완료됐습니다.', 'Task completed.'), t('운영 배포 체크리스트가 완료 처리됐습니다.', 'The production deployment checklist was completed.'), '어제', tasks[4]],
  ] as const;
  return <section className="demo-view"><header className="demo-view-heading"><div><span className="page-eyebrow">NOTIFICATIONS</span><h1>{t('알림', 'Notifications')}</h1><p>{t('승인, 상태 변경, 댓글과 마감 알림을 한곳에서 확인합니다.', 'Review approvals, status changes, comments, and due-date alerts.')}</p></div><button type="button" disabled>{t('모두 읽음', 'Mark all read')}</button></header><div className="demo-notification-list">{items.map(([type, title, message, time, task], index) => <button type="button" className={index < 4 ? 'unread' : ''} onClick={() => onOpenTask(task)} key={title}><span className={type}>{type === 'urgent' ? '!' : type === 'mention' ? '@' : type === 'done' ? '✓' : '↗'}</span><div><strong>{title}</strong><p>{message}</p><small>{t(time, time === '어제' ? 'Yesterday' : time.replace('분 전', ' min ago').replace('시간 전', ' hr ago'))}</small></div><i>›</i></button>)}</div></section>;
}
