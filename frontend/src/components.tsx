import { FormEvent, ReactNode, useState } from 'react';
import { Link } from 'react-router-dom';

export function AuthLayout({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <main className="auth-page"><section className="brand"><span className="brand-mark">T</span><p>TEAM PROJECT STARTER</p><h1>함께 만드는 서비스의<br />첫 단추를 준비했습니다.</h1><span>인증 이후의 핵심 기능에 팀의 시간을 집중하세요.</span></section><section className="auth-card"><header><Link to="/" className="mobile-logo">Team Project</Link><h2>{title}</h2><p>{description}</p></header>{children}</section></main>;
}

export function Field({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return <label className="field"><span>{label}</span><input {...props} /></label>;
}

export function SubmitButton({ children, pending, disabled }: { children: ReactNode; pending?: boolean; disabled?: boolean }) {
  return <button className="primary" type="submit" disabled={pending || disabled}>{pending ? '처리 중...' : children}</button>;
}

export function useAsyncAction(action: () => Promise<unknown>, onSuccess?: () => void) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>();
  const run = async (event?: FormEvent) => {
    event?.preventDefault(); setPending(true); setError(undefined);
    try { await action(); onSuccess?.(); } catch (caught) { setError(caught); } finally { setPending(false); }
  };
  return { run, pending, error, clearError: () => setError(undefined) };
}

