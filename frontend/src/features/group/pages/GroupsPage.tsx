import { FormEvent, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { groupApi, GroupResponse } from '../../../api/groupApi';
import { accessToken, errorMessage } from '../../../api/client';

export function GroupsPage() {
  const [groups, setGroups] = useState<GroupResponse[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    groupApi.list().then(setGroups).catch((value) => setError(errorMessage(value))).finally(() => setLoading(false));
  }, []);

  async function create(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const created = await groupApi.create({ name, description, timezone: 'Asia/Seoul' });
      setGroups((current) => [...current, created]);
      setName('');
      setDescription('');
    } catch (value) {
      setError(errorMessage(value));
    } finally {
      setSaving(false);
    }
  }

  if (!accessToken.get()) return <Navigate to="/login" replace />;
  return <main className="groups-page">
    <header className="groups-header">
      <div><span className="brand-mark">T</span><div><h1>내 그룹</h1><p>개인 공간과 참여 중인 팀을 관리합니다.</p></div></div>
      <Link to="/">홈으로</Link>
    </header>
    <section className="groups-layout">
      <div className="group-list-card">
        <h2>참여 중인 그룹</h2>
        {loading && <p className="muted">그룹을 불러오는 중...</p>}
        {!loading && groups.length === 0 && <p className="empty-state">참여 중인 그룹이 없습니다.</p>}
        <div className="group-list">{groups.map((group) => <Link className="group-item group-link" to={`/groups/${group.id}`} key={group.id}>
          <div><span className={`group-type ${group.type.toLowerCase()}`}>{group.type === 'PERSONAL' ? '개인' : '팀'}</span><strong>{group.name}</strong></div>
          <p>{group.description || (group.type === 'PERSONAL' ? '나만의 업무 공간' : '설명 없음')}</p>
          <small>{group.role === 'LEADER' ? '팀장' : '팀원'} · {group.timezone} · 설정 보기 →</small>
        </Link>)}</div>
      </div>
      <form className="group-create-card form" onSubmit={create}>
        <div><h2>새 팀 만들기</h2><p>생성한 사용자가 첫 팀장이 됩니다.</p></div>
        <label className="field"><span>팀 이름</span><input required maxLength={80} value={name} onChange={(event) => setName(event.target.value)} placeholder="예: 졸업 프로젝트팀" /></label>
        <label className="field"><span>설명 (선택)</span><input maxLength={500} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="팀의 목적을 입력하세요" /></label>
        {error && <p className="error">{error}</p>}
        <button className="primary" disabled={saving}>{saving ? '생성 중...' : '팀 생성'}</button>
      </form>
    </section>
  </main>;
}
