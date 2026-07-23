import { useCallback, useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { accessToken, errorMessage } from '../../../api/client';
import { notificationApi, NotificationResponse } from '../../../api/notificationApi';
import { AppNavigation } from '../../../app/AppNavigation';
import { useLanguage } from '../../../app/LanguageContext';

export function NotificationsPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [items, setItems] = useState<NotificationResponse[]>([]);
  const [nextCursor, setNextCursor] = useState<number>();
  const [hasNext, setHasNext] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [readFilter, setReadFilter] = useState<'ALL' | 'UNREAD' | 'READ'>('ALL');
  const [groupFilter, setGroupFilter] = useState('');

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

  async function deleteNotification(notification: NotificationResponse) {
    if (!window.confirm('이 알림을 삭제할까요?')) return;
    setPending(true);
    try {
      await notificationApi.delete(notification.id);
      setItems((current) => current.filter((item) => item.id !== notification.id));
      if (!notification.read) setUnreadCount((count) => Math.max(0, count - 1));
      window.dispatchEvent(new Event('notifications:refresh'));
    } catch (value) { setError(errorMessage(value)); }
    finally { setPending(false); }
  }

  if (!accessToken.get()) return <Navigate to="/login" replace />;
  const groupOptions = Array.from(new Map(items.filter((item) => item.groupId)
    .map((item) => [String(item.groupId), item.groupName ?? `그룹 #${item.groupId}`])).entries());
  const visibleItems = items.filter((item) => (!groupFilter || String(item.groupId) === groupFilter)
    && (readFilter === 'ALL' || (readFilter === 'READ' ? item.read : !item.read)));
  const groupedItems = Array.from(visibleItems.reduce((groups, item) => {
    const name = item.groupName ?? '그룹 없음';
    groups.set(name, [...(groups.get(name) ?? []), item]); return groups;
  }, new Map<string, NotificationResponse[]>()).entries());
  return <><AppNavigation unreadCount={unreadCount} /><main className="notifications-page app-page">
    <header className="notifications-header">
      <div><div><span className="page-eyebrow">INBOX</span><h1>{t('알림', 'Alerts')}</h1><p>{t('새로운 소식과 놓치면 안 될 업데이트예요.', 'Updates and news you should not miss.')}</p></div></div>
      <div className="notification-header-actions"><button className="secondary" type="button" disabled={pending || unreadCount === 0} onClick={readAll}>✓ {t('모두 읽음', 'Mark all read')}</button></div>
    </header>
    {error && <p className="error">{error}</p>}
    <section className="notification-filters"><div className="notification-tabs" role="tablist" aria-label="읽음 상태"><button className={readFilter === 'ALL' ? 'active' : ''} type="button" onClick={() => setReadFilter('ALL')}>전체 <b>{items.length}</b></button><button className={readFilter === 'UNREAD' ? 'active' : ''} type="button" onClick={() => setReadFilter('UNREAD')}>안 읽음 <b>{unreadCount}</b></button><button className={readFilter === 'READ' ? 'active' : ''} type="button" onClick={() => setReadFilter('READ')}>읽음</button></div><label><span>그룹</span><select value={groupFilter} onChange={(event) => setGroupFilter(event.target.value)}><option value="">모든 그룹</option>{groupOptions.map(([id, name]) => <option value={id} key={id}>{name}</option>)}</select></label></section>
    <section className="notification-card" aria-live="polite">
      <div className="notification-summary"><h2>최근 알림</h2><span>읽지 않음 {unreadCount}개</span></div>
      {loading && <p className="muted">알림을 불러오는 중...</p>}
      {!loading && visibleItems.length === 0 && <p className="empty-state">조건에 맞는 알림이 없습니다.</p>}
      <div className="notification-list">{groupedItems.map(([groupName, notifications]) => <section className="notification-group" key={groupName}><h3><span>◆</span>{groupName}<small>{notifications.length}</small></h3>{notifications.map((notification) => <article className={`notification-item ${notification.read ? 'read' : 'unread'}`} key={notification.id}>
        <button className="notification-open" type="button" onClick={() => openNotification(notification)}><span className="notification-dot" aria-label={notification.read ? '읽음' : '읽지 않음'} /><span className="notification-content"><strong>{notification.title}</strong><span>{notification.message}</span><small>{notification.actorNickname ? `${notification.actorNickname} · ` : ''}{formatDate(notification.createdAt)}</small></span><span aria-hidden="true">→</span></button>
        <button className="notification-delete" type="button" disabled={pending} onClick={() => deleteNotification(notification)} aria-label={`${notification.title} 알림 삭제`}>삭제</button>
      </article>)}</section>)}</div>
      {hasNext && <button className="notification-more secondary" type="button" disabled={pending} onClick={loadMore}>{pending ? '불러오는 중...' : '이전 알림 더 보기'}</button>}
    </section>
  </main></>;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    .format(new Date(value));
}
