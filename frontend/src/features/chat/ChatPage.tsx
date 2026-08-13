import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { accessToken, errorMessage } from '../../api/client';
import { ChatChannel, ChatMessage, chatApi, openChatSocket } from '../../api/chatApi';
import { groupApi, GroupFeaturePolicy, GroupResponse } from '../../api/groupApi';
import { projectApi, ProjectResponse } from '../../api/projectApi';
import { ProjectIssue, projectIssueApi } from '../../api/projectIssueApi';
import { AppNavigation, Modal } from '../../app/AppNavigation';
import { useLanguage } from '../../app/LanguageContext';

export function ChatPage() {
  const { t, language } = useLanguage();
  const groupId = Number(useParams().groupId);
  const [group, setGroup] = useState<GroupResponse>();
  const [features, setFeatures] = useState<GroupFeaturePolicy>();
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [selectedId, setSelectedId] = useState<number>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [nextBeforeId, setNextBeforeId] = useState<number>();
  const [draft, setDraft] = useState('');
  const [connection, setConnection] = useState<'CONNECTING' | 'OPEN' | 'CLOSED'>('CONNECTING');
  const [showChannel, setShowChannel] = useState(false);
  const [channelName, setChannelName] = useState('');
  const [projects, setProjects] = useState<ProjectResponse[]>([]);
  const [projectId, setProjectId] = useState('');
  const [majorIssues, setMajorIssues] = useState<ProjectIssue[]>([]);
  const [majorId, setMajorId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const socket = useRef<WebSocket>();
  const subscribed = useRef(false);
  const messageEnd = useRef<HTMLDivElement>(null);
  const selected = channels.find((channel) => channel.id === selectedId);
  const channelProjects = projects.filter((project) => project.status !== 'ARCHIVED'
    && (group?.role === 'LEADER' || project.canManageFlow));

  useEffect(() => {
    if (!Number.isInteger(groupId) || groupId < 1) { setLoading(false); return; }
    Promise.all([groupApi.get(groupId), groupApi.features(groupId), chatApi.channels(groupId), projectApi.list(groupId)])
      .then(([groupValue, featureValue, channelValues, projectValues]) => {
        setGroup(groupValue); setFeatures(featureValue); setChannels(channelValues); setProjects(projectValues);
        setSelectedId(channelValues[0]?.id);
      }).catch((value) => setError(errorMessage(value))).finally(() => setLoading(false));
  }, [groupId]);
  useEffect(() => {
    if (!selectedId) return;
    setMessages([]); setNextBeforeId(undefined);
    let active = true;
    chatApi.history(selectedId).then((page) => { if (!active) return;
      setMessages(page.items); setNextBeforeId(page.nextBeforeId); })
      .catch((value) => setError(errorMessage(value)));
    return () => { active = false; };
  }, [selectedId]);
  useEffect(() => {
    if (!selectedId) return;
    let active = true; let reconnect: number | undefined;
    const connect = async () => {
      subscribed.current = false;
      setConnection('CONNECTING');
      try {
        const value = await openChatSocket(); if (!active) { value.close(); return; }
        socket.current = value;
        value.onopen = () => value.send(JSON.stringify({ action: 'SUBSCRIBE', channelId: selectedId }));
        value.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data) as { type: string; message?: ChatMessage; code?: string };
            if (payload.type === 'SUBSCRIBED') {
              subscribed.current = true; setConnection('OPEN');
              // REST 조회와 소켓 구독 사이 또는 재연결 중 들어온 메시지를 복구한다.
              chatApi.history(selectedId).then((page) => {
                if (!active) return;
                setMessages((current) => mergeMessages(current, page.items));
                setNextBeforeId(page.nextBeforeId);
              }).catch(() => undefined);
            } else if (payload.type === 'MESSAGE' && payload.message?.channelId === selectedId) {
              setMessages((current) => mergeMessages(current, [payload.message!]));
            } else if (payload.type === 'ERROR') {
              setError(String((payload as { message?: string }).message ?? t('채팅 연결 오류', 'Chat connection error')));
            }
          } catch { setError(t('채팅 응답을 읽을 수 없습니다.', 'Could not read the chat response.')); }
        };
        value.onclose = () => { subscribed.current = false;
          if (active) { setConnection('CLOSED'); reconnect = window.setTimeout(connect, 2000); } };
        value.onerror = () => { subscribed.current = false; setConnection('CLOSED'); };
      } catch (value) { if (active) { setConnection('CLOSED'); setError(errorMessage(value)); reconnect = window.setTimeout(connect, 3000); } }
    };
    connect();
    return () => { active = false; subscribed.current = false;
      if (reconnect) window.clearTimeout(reconnect); socket.current?.close(); socket.current = undefined; };
  }, [selectedId]);
  useEffect(() => { messageEnd.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);
  useEffect(() => {
    if (!projectId) { setMajorIssues([]); setMajorId(''); return; }
    projectIssueApi.list(Number(projectId)).then((values) => setMajorIssues(values.filter((value) => value.level === 'MAJOR')))
      .catch((value) => setError(errorMessage(value)));
  }, [projectId]);

  async function send(event: FormEvent) {
    event.preventDefault(); const content = draft.trim(); if (!content || !selectedId) return; setDraft(''); setError('');
    if (socket.current?.readyState === WebSocket.OPEN && subscribed.current) {
      socket.current.send(JSON.stringify({ action: 'SEND', channelId: selectedId, content }));
      return;
    }
    try { const sent = await chatApi.send(selectedId, content); setMessages((current) => [...current, sent]); }
    catch (value) { setDraft(content); setError(errorMessage(value)); }
  }
  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = ''; if (!file || !selectedId) return;
    try {
      const sent = await chatApi.upload(selectedId, file);
      if (socket.current?.readyState !== WebSocket.OPEN || !subscribed.current)
        setMessages((current) => mergeMessages(current, [sent]));
    } catch (value) { setError(errorMessage(value)); }
  }
  async function createChannel(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError('');
    try {
      const created = await chatApi.createChannel(groupId, channelName.trim(), projectId ? Number(projectId) : undefined,
        majorId ? Number(majorId) : undefined);
      setChannels((current) => [...current, created]); setSelectedId(created.id); setShowChannel(false);
    } catch (value) { setError(errorMessage(value)); }
    finally { setSaving(false); }
  }
  async function older() {
    if (!selectedId || !nextBeforeId) return;
    try { const page = await chatApi.history(selectedId, nextBeforeId);
      setMessages((current) => mergeMessages(page.items, current)); setNextBeforeId(page.nextBeforeId); }
    catch (value) { setError(errorMessage(value)); }
  }

  if (!accessToken.get()) return <Navigate to="/login" replace />;
  if (loading) return <main className="center-page">{t('채팅을 불러오는 중...', 'Loading chat...')}</main>;
  if (!group || group.type !== 'TEAM') return <Navigate to={`/groups/${groupId}`} replace />;
  return <><AppNavigation /><main className="chat-page app-page">
    <header className="chat-page-header"><div><Link to={`/groups/${groupId}`}>← {t('그룹으로', 'Back to group')}</Link><span className="page-eyebrow">REALTIME CHAT</span><h1>{group.name} {t('채팅', 'Chat')}</h1></div>
      <div className="chat-policy"><span>{features?.membershipPlan}</span><strong>{t(`${features?.messageRetentionDays ?? 0}일 보관`, `${features?.messageRetentionDays ?? 0}-day history`)}</strong></div></header>
    {error && <p className="error">{error}</p>}
    <div className="chat-layout"><aside className="chat-channels"><header><h2>{t('채팅방', 'Channels')}</h2>{features?.multipleChatChannels && (group.role === 'LEADER' || projects.some((project) => project.canManageFlow)) && <button type="button" onClick={() => { setChannelName(''); setProjectId(''); setMajorId(''); setShowChannel(true); }}>＋</button>}</header>
      {channels.map((channel) => <button className={selectedId === channel.id ? 'selected' : ''} key={channel.id} onClick={() => setSelectedId(channel.id)}><span>{channel.type === 'GENERAL' ? '●' : '#'}</span><div><strong>{channel.name}</strong><small>{channel.issueNodeTitle ?? channel.projectName ?? t('그룹 전체', 'Whole group')}</small></div></button>)}
      {!features?.multipleChatChannels && <p>{t('무료 그룹은 공용 채팅방 1개를 사용합니다.', 'Free groups use one shared channel.')}</p>}
    </aside><section className="chat-room"><header><div><h2>{selected?.name ?? t('채팅방', 'Channel')}</h2><p>{selected?.issueNodeTitle ?? selected?.projectName ?? t('그룹 공용 대화', 'Group conversation')}</p></div><span className={`socket-state ${connection.toLowerCase()}`}>{connection === 'OPEN' ? t('실시간 연결됨', 'Live') : connection === 'CONNECTING' ? t('연결 중', 'Connecting') : t('재연결 중', 'Reconnecting')}</span></header>
      <div className="chat-messages">{nextBeforeId && <button className="older-messages" onClick={older}>{t('이전 메시지 불러오기', 'Load older messages')}</button>}{messages.length === 0 && <p className="chat-empty">{t('아직 메시지가 없습니다. 첫 대화를 시작하세요.', 'No messages yet. Start the conversation.')}</p>}
        {messages.map((message) => <article className="chat-message" key={message.id}><div className="chat-avatar">{message.senderNickname.slice(0, 1)}</div><div><header><strong>{message.senderNickname}</strong><time>{formatTime(message.createdAt, language)}</time></header>{message.content && <p>{message.content}</p>}{message.type === 'IMAGE' && <ChatImage message={message} />}{message.type === 'FILE' && <button className="chat-file" onClick={() => chatApi.download(message).catch((value) => setError(errorMessage(value)))}>▤ <span>{message.originalFilename}</span><small>{formatBytes(message.sizeBytes ?? 0)}</small></button>}</div></article>)}<div ref={messageEnd} />
      </div><form className="chat-composer" onSubmit={send}><label className="chat-attach">＋<input type="file" accept=".pdf,.png,.jpg,.jpeg,.gif,.txt,.csv,.docx,.xlsx,.pptx,.zip" onChange={upload} /></label><textarea rows={1} maxLength={4000} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={t('메시지를 입력하세요', 'Type a message')} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} /><button className="primary" disabled={!draft.trim()}>{t('전송', 'Send')}</button></form>
    </section></div>
    {showChannel && <Modal title={t('새 채팅방', 'New channel')} onClose={() => setShowChannel(false)}><form className="form modal-form" onSubmit={createChannel}><label className="field"><span>{t('채팅방 이름', 'Channel name')}</span><input autoFocus required maxLength={80} value={channelName} onChange={(event) => setChannelName(event.target.value)} /></label><label className="field"><span>{t('프로젝트', 'Project')}</span><select required={group.role !== 'LEADER'} value={projectId} onChange={(event) => { setProjectId(event.target.value); setMajorId(''); }}>{group.role === 'LEADER' && <option value="">{t('그룹 전체', 'Whole group')}</option>}{group.role !== 'LEADER' && <option value="">{t('프로젝트 선택', 'Select a project')}</option>}{channelProjects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>{projectId && <label className="field"><span>{t('대주제', 'Major topic')}</span><select value={majorId} onChange={(event) => setMajorId(event.target.value)}><option value="">{t('프로젝트 전체', 'Whole project')}</option>{majorIssues.map((issue) => <option key={issue.id} value={issue.id}>{issue.title}</option>)}</select></label>}<div className="modal-actions"><button className="secondary" type="button" onClick={() => setShowChannel(false)}>{t('취소', 'Cancel')}</button><button className="primary" disabled={saving}>{saving ? t('만드는 중...', 'Creating...') : t('만들기', 'Create')}</button></div></form></Modal>}
  </main></>;
}

function ChatImage({ message }: { message: ChatMessage }) {
  const [url, setUrl] = useState('');
  useEffect(() => { let active = true; let objectUrl = ''; chatApi.attachmentBlob(message).then(({ blob }) => {
    if (!active) return; objectUrl = URL.createObjectURL(blob); setUrl(objectUrl);
  }).catch(() => undefined); return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); }; }, [message.id]);
  return url ? <a href={url} target="_blank" rel="noreferrer"><img className="chat-image" src={url} alt={message.originalFilename ?? ''} loading="lazy" /></a> : <span className="chat-image-placeholder" />;
}
function formatTime(value: string, language: 'ko' | 'en') { return new Intl.DateTimeFormat(language === 'ko' ? 'ko-KR' : 'en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value)); }
function formatBytes(value: number) { return value >= 1024 ** 2 ? `${(value / 1024 ** 2).toFixed(1)} MB` : `${Math.max(1, Math.round(value / 1024))} KB`; }
function mergeMessages(current: ChatMessage[], incoming: ChatMessage[]) {
  const values = new Map(current.map((message) => [message.id, message]));
  incoming.forEach((message) => values.set(message.id, message));
  return [...values.values()].sort((left, right) => left.id - right.id);
}
