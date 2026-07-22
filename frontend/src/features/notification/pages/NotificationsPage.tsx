import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { accessToken, errorMessage } from '../../../api/client';
import { notificationApi, NotificationResponse } from '../../../api/notificationApi';

export function NotificationsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<NotificationResponse[]>([]);
  const [nextCursor, setNextCursor] = useState<number>();
  const [hasNext, setHasNext] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  const reload = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const page = await notificationApi.list(Math.min(Math.max(items.length, 20), 50));
      setItems(page.items);
      setNextCursor(page.nextCursor);
      setHasNext(page.hasNext);
      setUnreadCount(page.unreadCount);
      setError('');
    } catch (value) {
      if (!silent) setError(errorMessage(value));
    } finally {
      if (!silent) setLoading(false);
    }
  }, [items.length]);

  useEffect(() => { reload(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const interval = window.setInterval(() => reload(true), 30_000);
    return () => window.clearInterval(interval);
  }, [reload]);

  async function loadMore() {
    if (!nextCursor) return;
    setPending(true);
    try {
      const page = await notificationApi.list(20, nextCursor);
      setItems((current) => [...current, ...page.items]);
      setNextCursor(page.nextCursor);
      setHasNext(page.hasNext);
      setUnreadCount(page.unreadCount);
    } catch (value) { setError(errorMessage(value)); }
    finally { setPending(false); }
  }

  async function openNotification(notification: NotificationResponse) {
    try {
      if (!notification.read) {
        await notificationApi.read(notification.id);
        setUnreadCount((count) => Math.max(0, count - 1));
        setItems((current) => current.map((item) => item.id === notification.id
          ? { ...item, read: true, readAt: new Date().toISOString() } : item));
      }
      navigate(notification.taskId ? `/tasks/${notification.taskId}` : '/');
    } catch (value) { setError(errorMessage(value)); }
  }

  async function readAll() {
    setPending(true);
    try {
      await notificationApi.readAll();
      const readAt = new Date().toISOString();
      setItems((current) => current.map((item) => ({ ...item, read: true, readAt })));
      setUnreadCount(0);
    } catch (value) { setError(errorMessage(value)); }
    finally { setPending(false); }
  }

  if (!accessToken.get()) return <Navigate to="/login" replace />;
  return <main className="notifications-page">
    <header className="notifications-header">
      <div><span className="brand-mark">T</span><div><h1>알림</h1><p>업무 요청과 담당자 지정, 댓글 소식을 확인합니다.</p></div></div>
      <div className="notification-header-actions"><Link to="/">홈으로</Link><button className="secondary" type="button" disabled={pending || unreadCount === 0} onClick={readAll}>모두 읽음</button></div>
    </header>
    {error && <p className="error">{error}</p>}
    <section className="notification-card" aria-live="polite">
      <div className="notification-summary"><h2>최근 알림</h2><span>읽지 않음 {unreadCount}개</span></div>
      {loading && <p className="muted">알림을 불러오는 중...</p>}
      {!loading && items.length === 0 && <p className="empty-state">새로운 알림이 없습니다.</p>}
      <div className="notification-list">{items.map((notification) => <button
        className={`notification-item ${notification.read ? 'read' : 'unread'}`}
        type="button" key={notification.id} onClick={() => openNotification(notification)}>
        <span className="notification-dot" aria-label={notification.read ? '읽음' : '읽지 않음'} />
        <span className="notification-content"><strong>{notification.title}</strong><span>{notification.message}</span>
          <small>{notification.actorNickname ? `${notification.actorNickname} · ` : ''}{formatDate(notification.createdAt)}</small></span>
        <span aria-hidden="true">→</span>
      </button>)}</div>
      {hasNext && <button className="notification-more secondary" type="button" disabled={pending} onClick={loadMore}>{pending ? '불러오는 중...' : '이전 알림 더 보기'}</button>}
    </section>
  </main>;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    .format(new Date(value));
}
