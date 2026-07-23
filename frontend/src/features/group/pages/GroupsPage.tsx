import { FormEvent, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { groupApi, GroupResponse } from '../../../api/groupApi';
import { accessToken, errorMessage } from '../../../api/client';
import { AppNavigation, Modal } from '../../../app/AppNavigation';
import { useLanguage } from '../../../app/LanguageContext';

export function GroupsPage() {
  const { t } = useLanguage();
  const [groups, setGroups] = useState<GroupResponse[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [timezone, setTimezone] = useState('Asia/Seoul');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [joinCode, setJoinCode] = useState('');

  useEffect(() => {
    groupApi.list().then(setGroups).catch((value) => setError(errorMessage(value))).finally(() => setLoading(false));
  }, []);

  async function create(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const created = await groupApi.create({ name, description, timezone });
      setGroups((current) => [...current, created]);
      setName('');
      setDescription('');
      setShowCreate(false);
      window.dispatchEvent(new Event('groups:refresh'));
    } catch (value) {
      setError(errorMessage(value));
    } finally {
      setSaving(false);
    }
  }

  async function join(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const joined = await groupApi.join(joinCode);
      setGroups((current) => [...current.filter((group) => group.id !== joined.id), joined]);
      setJoinCode('');
      setShowJoin(false);
      window.dispatchEvent(new Event('groups:refresh'));
    } catch (value) {
      setError(errorMessage(value));
    } finally {
      setSaving(false);
    }
  }

  if (!accessToken.get()) return <Navigate to="/login" replace />;
  return <><AppNavigation /><main className="groups-page app-page">
    <header className="groups-header">
      <div><div><span className="page-eyebrow">GROUPS</span><h1>{t('그룹', 'Groups')}</h1><p>{t('함께하는 사람들과 업무를 가볍게 시작해 보세요.', 'Create a space and get things moving together.')}</p></div></div>
      <div className="groups-header-actions"><button className="secondary" type="button" onClick={() => setShowJoin(true)}>{t('그룹 키로 참여', 'Join with key')}</button><button className="primary create-action" type="button" onClick={() => setShowCreate(true)}><span aria-hidden="true">＋</span> {t('새 그룹', 'New group')}</button></div>
    </header>
    {error && !showCreate && <p className="error group-global-error">{error}</p>}
    <section className="groups-layout groups-layout-single">
      <div className="group-list-card">
        <div className="section-title-row"><div><h2>{t('참여 중인 그룹', 'Your groups')}</h2><p>{t(`${groups.filter((group) => group.type === 'TEAM').length}개의 그룹`, `${groups.filter((group) => group.type === 'TEAM').length} groups`)}</p></div></div>
        {loading && <p className="muted">그룹을 불러오는 중...</p>}
        {!loading && groups.filter((group) => group.type === 'TEAM').length === 0 && <p className="empty-state">참여 중인 그룹이 없습니다.</p>}
        <div className="group-list group-card-grid">{groups.filter((group) => group.type === 'TEAM').map((group, index) => <article className="group-item group-card" key={group.id}>
          <Link className="group-link group-dashboard-link" to={`/groups/${group.id}/dashboard`}><span className={`group-avatar group-avatar-${index % 4}`} aria-hidden="true">{group.name.slice(0, 1)}</span>
            <div><span className="group-type team">{group.membershipPlan === 'PAID' ? '유료 그룹' : '무료 그룹'}</span><strong>{group.name}</strong></div>
            <p>{group.description || '설명 없음'}</p><small>{group.role === 'LEADER' ? '팀장' : '팀원'}</small>
          </Link><Link className="group-settings-button" to={`/groups/${group.id}`} aria-label={`${group.name} 설정`}>⚙</Link>
        </article>)}</div>
      </div>
    </section>
    {showCreate && <Modal title="새 그룹 만들기" description="새로운 팀 공간을 만들고 함께할 사람들을 초대해 보세요." onClose={() => setShowCreate(false)}><form className="form modal-form" onSubmit={create}>
        <label className="field"><span>팀 이름</span><input required maxLength={80} value={name} onChange={(event) => setName(event.target.value)} placeholder="예: 졸업 프로젝트팀" /></label>
        <label className="field"><span>설명 (선택)</span><input maxLength={500} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="팀의 목적을 입력하세요" /></label>
        <label className="field"><span>시간대</span><select value={timezone} onChange={(event) => setTimezone(event.target.value)}>{timezoneOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></label>
        {error && <p className="error">{error}</p>}
        <div className="modal-actions"><button className="secondary" type="button" onClick={() => setShowCreate(false)}>취소</button><button className="primary" disabled={saving}>{saving ? '생성 중...' : '그룹 만들기'}</button></div>
      </form></Modal>}
    {showJoin && <Modal title="그룹 키로 참여" description="팀장에게 받은 8자리 그룹 키를 입력하세요." onClose={() => setShowJoin(false)}><form className="form modal-form" onSubmit={join}>
      <label className="field"><span>그룹 키</span><input autoFocus required minLength={8} maxLength={12} value={joinCode} onChange={(event) => setJoinCode(event.target.value.toUpperCase().replace(/\s/g, ''))} placeholder="예: A2BC3D4E" /></label>
      {error && <p className="error">{error}</p>}
      <div className="modal-actions"><button className="secondary" type="button" onClick={() => setShowJoin(false)}>취소</button><button className="primary" disabled={saving || joinCode.length < 8}>{saving ? '참여 중...' : '그룹 참여'}</button></div>
    </form></Modal>}
  </main></>;
}

const timezoneOptions = [
  { value: 'Asia/Seoul', label: '서울 (UTC+09:00)' }, { value: 'Asia/Tokyo', label: '도쿄 (UTC+09:00)' },
  { value: 'Asia/Shanghai', label: '상하이 (UTC+08:00)' }, { value: 'Asia/Singapore', label: '싱가포르 (UTC+08:00)' },
  { value: 'America/Los_Angeles', label: '로스앤젤레스' }, { value: 'America/New_York', label: '뉴욕' },
  { value: 'Europe/London', label: '런던' }, { value: 'Europe/Paris', label: '파리' }, { value: 'UTC', label: 'UTC' },
];
