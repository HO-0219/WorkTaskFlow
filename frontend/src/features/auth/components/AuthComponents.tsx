import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { BrandMark } from '../../../app/BrandMark';
import { useLanguage } from '../../../app/LanguageContext';

export function AuthLayout({ title, description, children }: {
  title: string; description: string; children: ReactNode;
}) {
  const { t } = useLanguage();
  return <main className="auth-page"><section className="brand"><span className="brand-mark"><BrandMark /></span><p>WORK TASK FLOW</p><h1>{t('업무의 시작부터 완료까지', 'From kickoff to completion')}<br />{t('한 흐름으로 연결하세요.', 'keep work in one flow.')}</h1><span>{t('팀의 일정과 진행 상황을 놓치지 않고 함께 관리합니다.', 'Keep team schedules and progress visible in one place.')}</span></section><section className="auth-card"><header><Link to="/" className="mobile-logo"><BrandMark />Work Task Flow</Link><h2>{title}</h2><p>{description}</p></header>{children}</section></main>;
}

export function Field({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return <label className="field"><span>{label}</span><input {...props} /></label>;
}

export function SubmitButton({ children, pending, disabled }: {
  children: ReactNode; pending?: boolean; disabled?: boolean;
}) {
  const { t } = useLanguage();
  return <button className="primary" type="submit" disabled={pending || disabled}>
    {pending ? t('처리 중...', 'Processing...') : children}
  </button>;
}
