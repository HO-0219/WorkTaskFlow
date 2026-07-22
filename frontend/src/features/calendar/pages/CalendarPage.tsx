import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { calendarApi, CalendarEventType, CalendarItem } from '../../../api/calendarApi';
import { accessToken, errorMessage } from '../../../api/client';
import { groupApi, GroupResponse } from '../../../api/groupApi';

const typeLabels: Record<CalendarItem['type'], string> = {
  SCHEDULE: '일정', MEETING: '회의', VACATION: '휴가', TODO: '할 일', DEADLINE: '업무 마감',
};

export function CalendarPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const today = new Date();
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [groups, setGroups] = useState<GroupResponse[]>([]);
  const [groupFilter, setGroupFilter] = useState(searchParams.get('groupId') ?? '');
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [editing, setEditing] = useState<CalendarItem>();
  const [formGroupId, setFormGroupId] = useState('');
  const [type, setType] = useState<CalendarEventType>('SCHEDULE');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [allDay, setAllDay] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const range = useMemo(() => monthRange(month), [month]);

  useEffect(() => {
    groupApi.list().then((values) => {
      setGroups(values);
      const firstEditable = values.find((group) => group.role === 'LEADER');
      if (firstEditable) setFormGroupId(String(firstEditable.id));
    }).catch((value) => setError(errorMessage(value)));
  }, []);

  useEffect(() => { load(); }, [range.from, range.to, groupFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    setLoading(true);
    try {
      const response = await calendarApi.list(range.from, range.to, groupFilter ? Number(groupFilter) : undefined);
      setItems(response.items);
      setError('');
    } catch (value) { setError(errorMessage(value)); }
    finally { setLoading(false); }
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!formGroupId) return;
    setSaving(true);
    setError('');
    const normalizedStart = allDay ? `${startAt.slice(0, 10)}T00:00:00` : withSeconds(startAt);
    const normalizedEnd = allDay ? `${endAt.slice(0, 10)}T00:00:00` : withSeconds(endAt);
    try {
      if (editing?.eventId) {
        await calendarApi.update(editing.eventId, {
          type, title, description, location, startAt: normalizedStart, endAt: normalizedEnd,
          allDay, expectedVersion: editing.version,
          clearDescription: !description, clearLocation: !location,
        });
      } else {
        await calendarApi.create(Number(formGroupId), {
          type, title, description: description || undefined, location: location || undefined,
          startAt: normalizedStart, endAt: normalizedEnd, allDay,
        });
      }
      resetForm();
      await load();
    } catch (value) { setError(errorMessage(value)); }
    finally { setSaving(false); }
  }

  function select(item: CalendarItem) {
    if (item.source !== 'EVENT') return;
    setEditing(item);
    setFormGroupId(String(item.groupId));
    setType(item.type as CalendarEventType);
    setTitle(item.title);
    setDescription(item.description ?? '');
    setLocation(item.location ?? '');
    setAllDay(item.allDay);
    setStartAt(item.allDay ? item.startAt.slice(0, 10) : item.startAt.slice(0, 16));
    setEndAt(item.allDay ? item.endAt.slice(0, 10) : item.endAt.slice(0, 16));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function remove() {
    if (!editing?.eventId || !window.confirm('이 일정을 삭제할까요?')) return;
    setSaving(true);
    try { await calendarApi.delete(editing.eventId, editing.version); resetForm(); await load(); }
    catch (value) { setError(errorMessage(value)); }
    finally { setSaving(false); }
  }

  function resetForm() {
    setEditing(undefined); setType('SCHEDULE'); setTitle(''); setDescription(''); setLocation('');
    setStartAt(''); setEndAt(''); setAllDay(false);
    const firstEditable = groups.find((group) => group.role === 'LEADER');
    setFormGroupId(firstEditable ? String(firstEditable.id) : '');
  }

  if (!accessToken.get()) return <Navigate to="/login?next=%2Fcalendar" replace />;
  const editableGroups = groups.filter((group) => group.role === 'LEADER');
  return <main className="calendar-page">
    <header className="calendar-header"><div><span className="brand-mark">T</span><div><h1>캘린더</h1><p>일정과 업무 마감일을 한곳에서 확인합니다.</p></div></div><Link to="/">홈으로</Link></header>
    {error && <p className="error">{error}</p>}
    <section className="calendar-toolbar">
      <div className="month-controls"><button type="button" aria-label="이전 달" onClick={() => setMonth(addMonth(month, -1))}>←</button><button type="button" onClick={() => setMonth(new Date(today.getFullYear(), today.getMonth(), 1))}>오늘</button><strong aria-live="polite">{month.getFullYear()}년 {month.getMonth() + 1}월</strong><button type="button" aria-label="다음 달" onClick={() => setMonth(addMonth(month, 1))}>→</button></div>
      <label>그룹 <select value={groupFilter} onChange={(event) => { const value = event.target.value; setGroupFilter(value); setSearchParams(value ? { groupId: value } : {}); }}><option value="">전체</option>{groups.map((group) => <option value={group.id} key={group.id}>{group.name}</option>)}</select></label>
    </section>
    <section className="calendar-layout">
      <section className="calendar-list-card"><h2>월간 일정 <small>{items.length}</small></h2>
        {loading && <p className="muted">일정을 불러오는 중...</p>}
        {!loading && items.length === 0 && <p className="empty-state">이 달에 등록된 일정이나 업무 마감이 없습니다.</p>}
        <div className="calendar-list">{items.map((item) => <article className={`calendar-item source-${item.source.toLowerCase()}`} key={`${item.source}-${item.eventId ?? item.sourceTaskId}`}>
          <div className="calendar-date"><strong>{item.startAt.slice(8, 10)}</strong><span>{weekday(item.startAt)}</span></div>
          <div className="calendar-item-content"><div><span className={`calendar-type type-${item.type.toLowerCase()}`}>{typeLabels[item.type]}</span><small>{item.groupName}</small></div><h3>{item.title}</h3><p>{item.allDay ? '종일' : item.type === 'DEADLINE' ? `${item.startAt.slice(11, 16)} 마감` : `${item.startAt.slice(11, 16)}–${item.endAt.slice(11, 16)}`}{item.location ? ` · ${item.location}` : ''}</p><small>{item.timezone}</small></div>
          {item.source === 'TASK_DEADLINE' ? <Link to={`/tasks/${item.sourceTaskId}`}>업무 보기</Link> : groups.find((group) => group.id === item.groupId)?.role === 'LEADER' ? <button className="secondary" type="button" onClick={() => select(item)}>편집</button> : null}
        </article>)}</div>
      </section>
      <form className="calendar-form form" onSubmit={save}><div><h2>{editing ? '일정 편집' : '새 일정'}</h2><p>입력 시각은 선택한 그룹의 시간대를 사용합니다.</p></div>
        {editableGroups.length === 0 ? <p className="muted">일정 등록 권한이 있는 그룹이 없습니다.</p> : <>
          <label className="field"><span>그룹</span><select disabled={Boolean(editing)} required value={formGroupId} onChange={(event) => setFormGroupId(event.target.value)}>{editableGroups.map((group) => <option value={group.id} key={group.id}>{group.name} · {group.timezone}</option>)}</select></label>
          <label className="field"><span>유형</span><select value={type} onChange={(event) => setType(event.target.value as CalendarEventType)}>{Object.entries(typeLabels).filter(([value]) => value !== 'DEADLINE').map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
          <label className="field"><span>제목</span><input required maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} /></label>
          <label className="calendar-all-day"><input type="checkbox" checked={allDay} onChange={(event) => { setAllDay(event.target.checked); setStartAt(''); setEndAt(''); }} /> 종일 일정</label>
          <label className="field"><span>{allDay ? '시작일' : '시작 시각'}</span><input required type={allDay ? 'date' : 'datetime-local'} value={startAt} onChange={(event) => setStartAt(event.target.value)} /></label>
          <label className="field"><span>{allDay ? '종료일 (포함하지 않음)' : '종료 시각'}</span><input required type={allDay ? 'date' : 'datetime-local'} value={endAt} onChange={(event) => setEndAt(event.target.value)} /></label>
          <label className="field"><span>장소 (선택)</span><input maxLength={300} value={location} onChange={(event) => setLocation(event.target.value)} /></label>
          <label className="field"><span>설명 (선택)</span><textarea maxLength={2000} value={description} onChange={(event) => setDescription(event.target.value)} /></label>
          <div className="calendar-form-actions"><button className="primary" disabled={saving}>{saving ? '저장 중...' : editing ? '수정 저장' : '일정 등록'}</button>{editing && <><button className="secondary" type="button" onClick={resetForm}>취소</button><button className="danger" type="button" disabled={saving} onClick={remove}>삭제</button></>}</div>
        </>}
      </form>
    </section>
  </main>;
}

function monthRange(month: Date) {
  return { from: dateText(month), to: dateText(new Date(month.getFullYear(), month.getMonth() + 1, 1)) };
}
function addMonth(value: Date, amount: number) { return new Date(value.getFullYear(), value.getMonth() + amount, 1); }
function dateText(value: Date) { return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`; }
function withSeconds(value: string) { return value.length === 16 ? `${value}:00` : value; }
function weekday(value: string) { return ['일', '월', '화', '수', '목', '금', '토'][new Date(`${value.slice(0, 10)}T00:00:00`).getDay()]; }
