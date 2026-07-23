import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { calendarApi, CalendarEventType, CalendarItem } from '../../../api/calendarApi';
import { accessToken, errorMessage } from '../../../api/client';
import { groupApi, GroupResponse, MemberResponse } from '../../../api/groupApi';
import { AppNavigation, Modal } from '../../../app/AppNavigation';
import { useLanguage } from '../../../app/LanguageContext';

const typeLabels: Record<CalendarItem['type'], string> = {
  SCHEDULE: '일정', MEETING: '회의', VACATION: '휴가', TODO: '할 일', DEADLINE: '업무 마감',
};
const weekLabels = ['일', '월', '화', '수', '목', '금', '토'];

export function CalendarPage() {
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const today = new Date();
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [groups, setGroups] = useState<GroupResponse[]>([]);
  const [groupFilter, setGroupFilter] = useState(searchParams.get('groupId') ?? '');
  const [query, setQuery] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('');
  const [groupMembers, setGroupMembers] = useState<{ groupId: number; groupName: string; member: MemberResponse }[]>([]);
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [editing, setEditing] = useState<CalendarItem>();
  const [detailItem, setDetailItem] = useState<CalendarItem>();
  const [selectedDate, setSelectedDate] = useState(() => dateText(today));
  const [draggingId, setDraggingId] = useState<number>();
  const [modal, setModal] = useState<'event' | 'detail' | 'import'>();
  const [formGroupId, setFormGroupId] = useState('');
  const [type, setType] = useState<CalendarEventType>('SCHEDULE');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [allDay, setAllDay] = useState(false);
  const [importFile, setImportFile] = useState<File>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const range = useMemo(() => monthRange(month), [month]);
  const days = useMemo(() => calendarDays(month), [month]);

  useEffect(() => {
    groupApi.list().then((values) => {
      setGroups(values);
      const firstEditable = values.find((group) => group.role === 'LEADER');
      if (firstEditable) setFormGroupId(String(firstEditable.id));
      Promise.all(values.map(async (group) => {
        const members = await groupApi.members(group.id).catch(() => [] as MemberResponse[]);
        return members.map((member) => ({ groupId: group.id, groupName: group.name, member }));
      })).then((memberGroups) => setGroupMembers(memberGroups.flat()));
    }).catch((value) => setError(errorMessage(value)));
  }, []);

  useEffect(() => { load(); }, [range.from, range.to, groupFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    setLoading(true);
    try {
      const response = await calendarApi.list(range.from, range.to, groupFilter ? Number(groupFilter) : undefined);
      setItems(response.items); setError('');
    } catch (value) { setError(errorMessage(value)); }
    finally { setLoading(false); }
  }

  function openCreate(date = today) {
    resetForm();
    setError('');
    const dateValue = dateText(date);
    setStartAt(`${dateValue}T09:00`);
    setEndAt(`${dateValue}T10:00`);
    setModal('event');
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!formGroupId) return;
    setSaving(true); setError('');
    const normalizedStart = allDay ? `${startAt.slice(0, 10)}T00:00:00` : withSeconds(startAt);
    const normalizedEnd = allDay ? `${nextDateText(startAt.slice(0, 10))}T00:00:00` : withSeconds(endAt);
    if (!allDay && normalizedEnd <= normalizedStart) { setError('종료 시각은 시작 시각보다 늦어야 합니다.'); setSaving(false); return; }
    try {
      if (editing?.eventId) {
        await calendarApi.update(editing.eventId, { type, title, description, location, startAt: normalizedStart, endAt: normalizedEnd, allDay, expectedVersion: editing.version, clearDescription: !description, clearLocation: !location });
      } else {
        await calendarApi.create(Number(formGroupId), { type, title, description: description || undefined, location: location || undefined, startAt: normalizedStart, endAt: normalizedEnd, allDay });
      }
      closeModal(); await load();
    } catch (value) { setError(errorMessage(value)); }
    finally { setSaving(false); }
  }

  function select(item: CalendarItem) {
    setDetailItem(item); setModal('detail');
  }

  function editSelected() {
    const item = detailItem;
    if (!item || item.source !== 'EVENT') return;
    setEditing(item); setFormGroupId(String(item.groupId)); setType(item.type as CalendarEventType);
    setTitle(item.title); setDescription(item.description ?? ''); setLocation(item.location ?? ''); setAllDay(item.allDay);
    setStartAt(item.allDay ? item.startAt.slice(0, 10) : item.startAt.slice(0, 16));
    setEndAt(item.allDay ? item.endAt.slice(0, 10) : item.endAt.slice(0, 16)); setModal('event');
  }

  async function moveEvent(item: CalendarItem, targetDate: string) {
    if (item.source !== 'EVENT' || !item.eventId || item.startAt.slice(0, 10) === targetDate) return;
    const delta = dateDifference(item.startAt.slice(0, 10), targetDate);
    setSaving(true); setError('');
    try {
      await calendarApi.update(item.eventId, {
        startAt: shiftDateTime(item.startAt, delta), endAt: shiftDateTime(item.endAt, delta),
        expectedVersion: item.version,
      });
      setSelectedDate(targetDate); await load();
    } catch (value) { setError(errorMessage(value)); }
    finally { setSaving(false); setDraggingId(undefined); }
  }

  async function remove() {
    if (!editing?.eventId || !window.confirm('이 일정을 삭제할까요?')) return;
    setSaving(true);
    try { await calendarApi.delete(editing.eventId, editing.version); closeModal(); await load(); }
    catch (value) { setError(errorMessage(value)); }
    finally { setSaving(false); }
  }

  async function importCalendar(event: FormEvent) {
    event.preventDefault();
    if (!importFile || !formGroupId) return;
    setSaving(true); setError('');
    try {
      const events = parseIcs(await importFile.text());
      if (events.length === 0) throw new Error('가져올 수 있는 일정이 없습니다. ICS 파일을 확인해 주세요.');
      await Promise.all(events.map((item) => calendarApi.create(Number(formGroupId), item)));
      setImportFile(undefined); setModal(undefined); await load();
    } catch (value) { setError(errorMessage(value)); }
    finally { setSaving(false); }
  }

  function resetForm() {
    setEditing(undefined); setType('SCHEDULE'); setTitle(''); setDescription(''); setLocation(''); setStartAt(''); setEndAt(''); setAllDay(false);
    const firstEditable = groups.find((group) => group.role === 'LEADER');
    setFormGroupId(firstEditable ? String(firstEditable.id) : '');
  }
  function closeModal() { setModal(undefined); setDetailItem(undefined); resetForm(); }

  if (!accessToken.get()) return <Navigate to="/login?next=%2Fcalendar" replace />;
  const editableGroups = groups.filter((group) => group.role === 'LEADER');
  const filteredItems = items.filter((item) => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    const searchMatch = !normalizedQuery || [item.title, item.description, item.location, item.groupName, item.ownerNickname].some((value) => value?.toLocaleLowerCase().includes(normalizedQuery));
    if (!searchMatch || !ownerFilter) return searchMatch;
    if (ownerFilter === 'me') return groups.some((group) => group.id === item.groupId && group.memberId === item.ownerMemberId);
    const [filterGroupId, memberId] = ownerFilter.split(':').map(Number);
    return item.groupId === filterGroupId && item.ownerMemberId === memberId;
  }).sort((left, right) => left.startAt.localeCompare(right.startAt) || left.title.localeCompare(right.title, 'ko'));
  const visibleMembers = groupMembers.filter((entry) => !groupFilter || entry.groupId === Number(groupFilter));
  const selectedItems = filteredItems.filter((item) => item.startAt.slice(0, 10) === selectedDate);
  return <><AppNavigation /><main className="calendar-page app-page">
    <header className="calendar-header"><div><div><span className="page-eyebrow">SCHEDULE</span><h1>{t('캘린더', 'Calendar')}</h1><p>{t('팀의 일정과 업무 마감을 한눈에 살펴보세요.', 'See team events and task deadlines at a glance.')}</p></div></div><div className="calendar-header-actions"><button className="secondary" type="button" onClick={() => setModal('import')}>⇩ {t('일정 가져오기', 'Import')}</button><button className="primary create-action" type="button" onClick={() => openCreate()}><span>＋</span> {t('일정 추가', 'Add event')}</button></div></header>
    {error && <p className="error calendar-global-error">{error}</p>}
    <section className="calendar-shell">
      <div className="calendar-toolbar"><div className="month-controls"><button type="button" aria-label="이전 달" onClick={() => setMonth(addMonth(month, -1))}>‹</button><strong aria-live="polite">{month.getFullYear()}년 {month.getMonth() + 1}월</strong><button type="button" aria-label="다음 달" onClick={() => setMonth(addMonth(month, 1))}>›</button><button className="today-button" type="button" onClick={() => setMonth(new Date(today.getFullYear(), today.getMonth(), 1))}>오늘</button></div>
        <div className="calendar-filters"><label className="calendar-search"><span className="sr-only">일정 검색</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="일정·업무 검색" /><i aria-hidden="true">⌕</i></label><label className="calendar-filter"><span>그룹</span><select value={groupFilter} onChange={(event) => { const value = event.target.value; setGroupFilter(value); setOwnerFilter(''); setSearchParams(value ? { groupId: value } : {}); }}><option value="">모든 그룹</option>{groups.map((group) => <option value={group.id} key={group.id}>{group.name}</option>)}</select></label><label className="calendar-filter"><span>담당자</span><select value={ownerFilter} onChange={(event) => setOwnerFilter(event.target.value)}><option value="">전체</option><option value="me">내 업무만</option>{visibleMembers.map(({ groupId, groupName, member }) => <option value={`${groupId}:${member.id}`} key={`${groupId}:${member.id}`}>{member.nickname}{groupFilter ? '' : ` · ${groupName}`}</option>)}</select></label></div></div>
      <div className="month-calendar" aria-label={`${month.getFullYear()}년 ${month.getMonth() + 1}월 달력`}>
        {weekLabels.map((label, index) => <div className={`weekday-label weekday-${index}`} key={label}>{label}</div>)}
        {days.map((day) => {
          const date = dateText(day); const dayItems = filteredItems.filter((item) => item.startAt.slice(0, 10) === date);
          const current = day.getMonth() === month.getMonth(); const isToday = date === dateText(today);
          const selected = date === selectedDate;
          return <div className={`calendar-day ${current ? '' : 'outside'} ${isToday ? 'today' : ''} ${selected ? 'selected' : ''} ${draggingId ? 'drop-ready' : ''}`} key={date}
            onClick={() => setSelectedDate(date)} onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; }} onDrop={(event) => { event.preventDefault(); const eventId = draggingId ?? Number(event.dataTransfer.getData('text/plain')); const item = items.find((value) => value.eventId === eventId); if (item) void moveEvent(item, date); }}>
            <button className="day-number" type="button" onClick={() => setSelectedDate(date)} aria-label={`${date} 일정 보기`}>{day.getDate()}</button>
            <div className="day-events">{dayItems.slice(0, 3).map((item) => item.source === 'TASK_DEADLINE'
              ? <button className={`day-event type-${item.type.toLowerCase()}`} type="button" onClick={(event) => { event.stopPropagation(); select(item); }} key={`task-${item.sourceTaskId}`} title={item.title}><span>{item.allDay ? '' : item.startAt.slice(11, 16)}</span>{item.title}</button>
              : <button className={`day-event type-${item.type.toLowerCase()}`} type="button" draggable={groups.find((group) => group.id === item.groupId)?.role === 'LEADER'} onDragStart={(event) => { event.stopPropagation(); setDraggingId(item.eventId); event.dataTransfer.setData('text/plain', String(item.eventId)); event.dataTransfer.effectAllowed = 'move'; }} onDragEnd={() => setDraggingId(undefined)} onClick={(event) => { event.stopPropagation(); select(item); }} key={`event-${item.eventId}`} title={`${item.title} · 드래그해서 날짜 이동`}><span>{item.allDay ? '' : item.startAt.slice(11, 16)}</span>{item.title}</button>)}
              {dayItems.length > 3 && <small>+ {dayItems.length - 3}개 더보기</small>}</div>
          </div>;
        })}
      </div>
      {loading && <div className="calendar-loading">일정을 불러오는 중...</div>}
      <div className="calendar-legend"><span><i className="legend-schedule" />일정</span><span><i className="legend-meeting" />회의</span><span><i className="legend-vacation" />휴가</span><span><i className="legend-deadline" />업무 마감</span></div>
    </section>
    <section className="selected-day-panel"><header><div><span>{formatSelectedDate(selectedDate)}</span><h2>{t('이날의 업무와 일정', 'Tasks and events')}</h2></div><button className="secondary" type="button" onClick={() => openCreate(new Date(`${selectedDate}T00:00:00`))}>＋ {t('일정 추가', 'Add event')}</button></header>
      {selectedItems.length === 0 ? <p className="empty-state">{t('등록된 업무나 일정이 없습니다.', 'No tasks or events on this day.')}</p> : <div className="selected-day-list">{selectedItems.map((item) => <button type="button" onClick={() => select(item)} key={`${item.source}-${item.eventId ?? item.sourceTaskId}`}><i className={`type-${item.type.toLowerCase()}`} /><span><strong>{item.title}</strong><small>{item.allDay ? t('종일', 'All day') : item.type === 'DEADLINE' ? `${item.startAt.slice(11, 16)} ${t('마감', 'due')}` : `${item.startAt.slice(11, 16)} – ${item.endAt.slice(11, 16)}`} · {item.groupName}</small></span><b>›</b></button>)}</div>}
    </section>
    {modal === 'detail' && detailItem && <Modal title={detailItem.title} description={`${typeLabels[detailItem.type]} · ${detailItem.groupName}`} onClose={closeModal}><div className="calendar-detail">
      <dl>{detailItem.source === 'TASK_DEADLINE' && <div><dt>업무 등록일</dt><dd>{formatCreatedAt(detailItem.createdAt)}</dd></div>}<div><dt>{detailItem.source === 'TASK_DEADLINE' ? '마감일' : '날짜와 시간'}</dt><dd>{formatItemPeriod(detailItem)}</dd></div><div><dt>그룹</dt><dd>{detailItem.groupName}</dd></div>{detailItem.location && <div><dt>장소</dt><dd>{detailItem.location}</dd></div>}<div><dt>설명</dt><dd>{detailItem.description || '등록된 설명이 없습니다.'}</dd></div></dl>
      <div className="modal-actions"><button className="secondary" type="button" onClick={closeModal}>닫기</button>{detailItem.source === 'TASK_DEADLINE' ? <Link className="primary" to={`/tasks/${detailItem.sourceTaskId}`}>업무 상세 보기</Link> : groups.find((group) => group.id === detailItem.groupId)?.role === 'LEADER' && <button className="primary" type="button" onClick={editSelected}>편집하기</button>}</div>
    </div></Modal>}
    {modal === 'event' && <Modal title={editing ? '일정 편집' : '새 일정 추가'} description="필요한 정보만 가볍게 입력해 주세요." onClose={closeModal}><form className="calendar-form form modal-form" onSubmit={save}>
      {editableGroups.length === 0 ? <p className="muted">일정 등록 권한이 있는 그룹이 없습니다.</p> : <>
        <div className="form-row"><label className="field"><span>그룹</span><select disabled={Boolean(editing)} required value={formGroupId} onChange={(event) => setFormGroupId(event.target.value)}>{editableGroups.map((group) => <option value={group.id} key={group.id}>{group.name}</option>)}</select></label><label className="field"><span>유형</span><select value={type} onChange={(event) => setType(event.target.value as CalendarEventType)}>{Object.entries(typeLabels).filter(([value]) => value !== 'DEADLINE').map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label></div>
        <label className="field"><span>제목</span><input autoFocus required maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="일정 제목" /></label>
        <label className="calendar-all-day"><input type="checkbox" checked={allDay} onChange={(event) => { const checked = event.target.checked; const date = startAt.slice(0, 10) || dateText(today); setAllDay(checked); setStartAt(checked ? date : `${date}T09:00`); setEndAt(checked ? nextDateText(date) : `${date}T10:00`); setError(''); }} /> 종일 일정</label>
        {allDay ? <div className="all-day-date-field"><label className="field"><span>날짜</span><input required type="date" value={startAt.slice(0, 10)} onChange={(event) => { setStartAt(event.target.value); setEndAt(nextDateText(event.target.value)); }} /></label><p>시간과 종료일은 비활성화되며 선택한 날짜의 하루 일정으로 저장됩니다.</p></div> : <div className="form-row calendar-time-row"><label className="field"><span>시작 날짜·시간</span><input required type="datetime-local" value={startAt} onChange={(event) => setStartAt(event.target.value)} /></label><label className="field"><span>종료 날짜·시간</span><input required type="datetime-local" value={endAt} min={startAt} onChange={(event) => setEndAt(event.target.value)} /></label></div>}
        <label className="field"><span>장소 (선택)</span><input maxLength={300} value={location} onChange={(event) => setLocation(event.target.value)} placeholder="장소 또는 화상 회의 링크" /></label>
        <label className="field"><span>메모 (선택)</span><textarea maxLength={2000} value={description} onChange={(event) => setDescription(event.target.value)} /></label>
        {error && <p className="error modal-error">{error}</p>}<div className="modal-actions">{editing && <button className="danger" type="button" disabled={saving} onClick={remove}>삭제</button>}<button className="secondary" type="button" onClick={closeModal}>취소</button><button className="primary" disabled={saving}>{saving ? '저장 중...' : editing ? '변경사항 저장' : '일정 추가'}</button></div>
      </>}
    </form></Modal>}
    {modal === 'import' && <Modal title="일정 가져오기" description="다른 캘린더에서 내보낸 ICS 파일을 가져올 수 있어요." onClose={closeModal}><form className="form modal-form" onSubmit={importCalendar}><label className="field"><span>가져올 그룹</span><select required value={formGroupId} onChange={(event) => setFormGroupId(event.target.value)}>{editableGroups.map((group) => <option value={group.id} key={group.id}>{group.name}</option>)}</select></label><label className="import-dropzone"><span aria-hidden="true">⇧</span><strong>{importFile?.name ?? 'ICS 파일 선택'}</strong><small>파일을 선택해 일정을 한 번에 추가하세요.</small><input required type="file" accept=".ics,text/calendar" onChange={(event) => setImportFile(event.target.files?.[0])} /></label>{error && <p className="error modal-error">{error}</p>}<div className="modal-actions"><button className="secondary" type="button" onClick={closeModal}>취소</button><button className="primary" disabled={saving || !importFile}>{saving ? '가져오는 중...' : '가져오기'}</button></div></form></Modal>}
  </main></>;
}

function monthRange(month: Date) { return { from: dateText(month), to: dateText(new Date(month.getFullYear(), month.getMonth() + 1, 1)) }; }
function addMonth(value: Date, amount: number) { return new Date(value.getFullYear(), value.getMonth() + amount, 1); }
function dateText(value: Date) { return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`; }
function withSeconds(value: string) { return value.length === 16 ? `${value}:00` : value; }
function nextDateText(value: string) { const date = new Date(`${value}T00:00:00`); date.setDate(date.getDate() + 1); return dateText(date); }
function calendarDays(month: Date) { const first = new Date(month.getFullYear(), month.getMonth(), 1); const start = new Date(first); start.setDate(1 - first.getDay()); return Array.from({ length: 42 }, (_, index) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + index)); }
function dateDifference(from: string, to: string) { return Math.round((new Date(`${to}T00:00:00`).getTime() - new Date(`${from}T00:00:00`).getTime()) / 86_400_000); }
function shiftDateTime(value: string, days: number) { const date = new Date(`${value.slice(0, 10)}T00:00:00`); date.setDate(date.getDate() + days); return `${dateText(date)}T${value.slice(11, 19)}`; }
function formatSelectedDate(value: string) { return new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' }).format(new Date(`${value}T00:00:00`)); }
function formatItemPeriod(item: CalendarItem) {
  const date = new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' }).format(new Date(`${item.startAt.slice(0, 10)}T00:00:00`));
  if (item.allDay) return `${date} · 종일`;
  if (item.type === 'DEADLINE') return `${date} ${item.startAt.slice(11, 16)} 마감`;
  return `${date} ${item.startAt.slice(11, 16)} – ${item.endAt.slice(11, 16)}`;
}
function formatCreatedAt(value: string) { return new Intl.DateTimeFormat('ko-KR', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(value)); }
function parseIcs(text: string) {
  const blocks = text.replace(/\r?\n[ \t]/g, '').split('BEGIN:VEVENT').slice(1).map((block) => block.split('END:VEVENT')[0]);
  return blocks.map((block) => {
    const value = (key: string) => block.match(new RegExp(`(?:^|\\n)${key}(?:;[^:]*)?:(.*)`, 'i'))?.[1]?.trim();
    const start = value('DTSTART'); const end = value('DTEND'); const title = value('SUMMARY');
    if (!start || !title) return undefined;
    const allDay = /^\d{8}$/.test(start); const format = (raw: string) => allDay ? `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}T00:00:00` : `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}T${raw.slice(9, 11)}:${raw.slice(11, 13)}:${raw.slice(13, 15) || '00'}`;
    const startAt = format(start.replace(/Z$/, '')); const endAt = end ? format(end.replace(/Z$/, '')) : startAt;
    return { type: 'SCHEDULE' as CalendarEventType, title: title.replace(/\\,/g, ','), description: value('DESCRIPTION'), location: value('LOCATION'), startAt, endAt, allDay };
  }).filter((item): item is NonNullable<typeof item> => Boolean(item));
}
