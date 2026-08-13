import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { accessToken, errorMessage } from '../../api/client';
import { ChatChannel, ChatMessage, chatApi, openChatSocket } from '../../api/chatApi';
import { groupApi, GroupFeaturePolicy, GroupResponse, MemberResponse } from '../../api/groupApi';
import { projectApi, ProjectResponse } from '../../api/projectApi';
import { ProjectIssue, projectIssueApi } from '../../api/projectIssueApi';
import { AppNavigation, Modal } from '../../app/AppNavigation';
import { AuthenticatedImage } from '../../app/AuthenticatedImage';
import { useLanguage } from '../../app/LanguageContext';

export function ChatPage() {
  const { t, language } = useLanguage();
  const groupId = Number(useParams().groupId);
  const [searchParams, setSearchParams] = useSearchParams();
  const channelParam = searchParams.get('channel');
  const [group, setGroup] = useState<GroupResponse>();
  const [features, setFeatures] = useState<GroupFeaturePolicy>();
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [selectedId, setSelectedId] = useState<number>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [nextBeforeId, setNextBeforeId] = useState<number>();
  const [draft, setDraft] = useState('');
  const [attachment, setAttachment] = useState<File>();
  const [uploading, setUploading] = useState(false);
  const [connection, setConnection] = useState<'CONNECTING' | 'OPEN' | 'CLOSED'>('CONNECTING');
  const [showChannel, setShowChannel] = useState(false);
  const [channelName, setChannelName] = useState('');
  const [projects, setProjects] = useState<ProjectResponse[]>([]);
  const [members, setMembers] = useState<MemberResponse[]>([]);
  const [showMembers, setShowMembers] = useState(false);
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
    Promise.all([groupApi.get(groupId), groupApi.features(groupId), chatApi.channels(groupId), projectApi.list(groupId), groupApi.members(groupId)])
      .then(([groupValue, featureValue, channelValues, projectValues, memberValues]) => {
        setGroup(groupValue); setFeatures(featureValue); setChannels(channelValues); setProjects(projectValues);
        setMembers(memberValues.filter((member) => member.status === 'ACTIVE'));
        const requestedChannelId = Number(channelParam);
        setSelectedId(channelValues.some((channel) => channel.id === requestedChannelId) ? requestedChannelId : channelValues[0]?.id);
      }).catch((value) => setError(errorMessage(value))).finally(() => setLoading(false));
  }, [groupId]);

  function selectChannel(channelId: number) {
    setSelectedId(channelId);
    setSearchParams({ channel: String(channelId) }, { replace: true });
  }
  useEffect(() => {
    const requestedChannelId = Number(channelParam);
    if (channels.some((channel) => channel.id === requestedChannelId) && requestedChannelId !== selectedId) {
      setSelectedId(requestedChannelId);
    }
  }, [channelParam, channels, selectedId]);
  useEffect(() => {
    if (!selectedId) return;
    setAttachment(undefined);
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
    event.preventDefault(); const content = draft.trim(); if ((!content && !attachment) || !selectedId || uploading) return;
    setError('');
    if (attachment) {
      setUploading(true);
      try {
        const sent = await chatApi.upload(selectedId, attachment, content || undefined);
        setMessages((current) => mergeMessages(current, [sent]));
        setAttachment(undefined); setDraft('');
      } catch (value) { setError(errorMessage(value)); }
      finally { setUploading(false); }
      return;
    }
    setDraft('');
    if (socket.current?.readyState === WebSocket.OPEN && subscribed.current) {
      socket.current.send(JSON.stringify({ action: 'SEND', channelId: selectedId, content }));
      return;
    }
    try { const sent = await chatApi.send(selectedId, content); setMessages((current) => [...current, sent]); }
    catch (value) { setDraft(content); setError(errorMessage(value)); }
  }
  function chooseAttachment(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = ''; if (!file || !selectedId) return;
    if (features && file.size > features.attachmentLimitBytes) {
      setError(t(`파일은 ${formatBytes(features.attachmentLimitBytes)} 이하만 첨부할 수 있습니다.`,
        `Files must be ${formatBytes(features.attachmentLimitBytes)} or smaller.`));
      return;
    }
    setError(''); setAttachment(file);
  }
  async function createChannel(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError('');
    try {
      const created = await chatApi.createChannel(groupId, channelName.trim(), projectId ? Number(projectId) : undefined,
        majorId ? Number(majorId) : undefined);
      setChannels((current) => [...current, created]); selectChannel(created.id); setShowChannel(false);
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
    <header className="chat-page-header"><div><Link to={`/groups/${groupId}/dashboard`}>← {t('그룹 대시보드', 'Group dashboard')}</Link><h1>{t('팀 채팅', 'Team chat')}</h1><p>{t(`${group.name} 팀의 업무 대화와 자료를 한곳에서 나누세요.`, `Discuss work and share files with ${group.name} in one place.`)}</p></div></header>
    {error && <p className="error">{error}</p>}
    <div className="chat-layout"><aside className="chat-channels"><header><h2>{t('채팅방', 'Channels')}</h2>{features?.multipleChatChannels && (group.role === 'LEADER' || projects.some((project) => project.canManageFlow)) && <button type="button" onClick={() => { setChannelName(''); setProjectId(''); setMajorId(''); setShowChannel(true); }}>＋</button>}</header>
      {channels.map((channel) => <button className={selectedId === channel.id ? 'selected' : ''} key={channel.id} onClick={() => selectChannel(channel.id)}><span>{channel.type === 'GENERAL' ? '●' : '#'}</span><div><strong>{channel.name}</strong><small>{channel.issueNodeTitle ?? channel.projectName ?? t('그룹 전체', 'Whole group')}</small></div></button>)}
      {!features?.multipleChatChannels && <p>{t('무료 그룹은 공용 채팅방 1개를 사용합니다.', 'Free groups use one shared channel.')}</p>}
    </aside><section className="chat-room"><header><div><h2>{selected?.name ?? t('채팅방', 'Channel')}</h2><p>{selected?.issueNodeTitle ?? selected?.projectName ?? t('모든 팀원이 참여하는 그룹 공용 대화', 'A group conversation for every teammate')}</p></div><button className="chat-member-toggle" type="button" aria-expanded={showMembers} onClick={() => setShowMembers((value) => !value)}>♙ {t(`${members.length}명`, `${members.length} members`)}</button></header>
      {connection !== 'OPEN' && <p className="chat-connection-notice" role="status">{connection === 'CONNECTING' ? t('대화 내용을 연결하고 있습니다.', 'Connecting to the conversation.') : t('실시간 업데이트를 복구 중입니다. 메시지는 계속 전송할 수 있습니다.', 'Restoring live updates. You can continue sending messages.')}</p>}
      <div className="chat-messages">{nextBeforeId && <button className="older-messages" onClick={older}>{t('이전 메시지 불러오기', 'Load older messages')}</button>}{messages.length === 0 && <p className="chat-empty">{t('아직 메시지가 없습니다. 첫 대화를 시작하세요.', 'No messages yet. Start the conversation.')}</p>}
        {messages.map((message) => <article className="chat-message" key={message.id}><div className="chat-avatar">{message.senderNickname.slice(0, 1)}</div><div><header><strong>{message.senderNickname}</strong><time>{formatTime(message.createdAt, language)}</time></header>{message.content && <p>{message.content}</p>}{message.type === 'IMAGE' && <ChatImage message={message} />}{message.type === 'FILE' && <button className="chat-file" onClick={() => chatApi.download(message).catch((value) => setError(errorMessage(value)))}>▤ <span>{message.originalFilename}</span><small>{formatBytes(message.sizeBytes ?? 0)}</small></button>}</div></article>)}<div ref={messageEnd} />
      </div><form className={`chat-composer ${attachment ? 'has-attachment' : ''}`} onSubmit={send}>{attachment && <AttachmentPreview file={attachment} onRemove={() => setAttachment(undefined)} />}<label className={`chat-attach ${attachment ? 'selected' : ''}`} title={t('파일 또는 이미지 첨부', 'Attach a file or image')}>＋<input type="file" accept=".pdf,.png,.jpg,.jpeg,.gif,.txt,.csv,.docx,.xlsx,.pptx,.zip" onChange={chooseAttachment} /></label><textarea rows={1} maxLength={4000} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={attachment ? t('첨부 파일에 설명을 추가하세요 (선택)', 'Add a caption (optional)') : t('메시지를 입력하세요', 'Type a message')} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} /><button className="primary" disabled={uploading || (!draft.trim() && !attachment)}>{uploading ? t('올리는 중...', 'Uploading...') : t('전송', 'Send')}</button></form>
    </section><aside className={`chat-members ${showMembers ? 'open' : ''}`}><header><div><h2>{t('팀원', 'Teammates')}</h2><p>{t('이 그룹의 활성 팀원', 'Active members of this group')}</p></div><button type="button" onClick={() => setShowMembers(false)} aria-label={t('팀원 목록 닫기', 'Close member list')}>×</button></header><div className="chat-member-list">{members.map((member) => <div className="chat-member" key={member.id}><span>{member.profileImageUrl ? <AuthenticatedImage src={member.profileImageUrl} alt="" /> : member.nickname.slice(0, 1)}</span><div><strong>{member.nickname}</strong><small>{t(member.role === 'LEADER' ? '팀장' : '팀원', member.role === 'LEADER' ? 'Leader' : 'Member')}</small></div></div>)}</div><p>{t('이 그룹의 모든 활성 팀원이 채팅방을 보고 메시지를 보낼 수 있습니다.', 'Every active teammate can view and send messages in these channels.')}</p></aside></div>
    {showChannel && <Modal title={t('새 채팅방', 'New channel')} onClose={() => setShowChannel(false)}><form className="form modal-form" onSubmit={createChannel}><label className="field"><span>{t('채팅방 이름', 'Channel name')}</span><input autoFocus required maxLength={80} value={channelName} onChange={(event) => setChannelName(event.target.value)} /></label><label className="field"><span>{t('프로젝트', 'Project')}</span><select required={group.role !== 'LEADER'} value={projectId} onChange={(event) => { setProjectId(event.target.value); setMajorId(''); }}>{group.role === 'LEADER' && <option value="">{t('그룹 전체', 'Whole group')}</option>}{group.role !== 'LEADER' && <option value="">{t('프로젝트 선택', 'Select a project')}</option>}{channelProjects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>{projectId && <label className="field"><span>{t('대주제', 'Major topic')}</span><select value={majorId} onChange={(event) => setMajorId(event.target.value)}><option value="">{t('프로젝트 전체', 'Whole project')}</option>{majorIssues.map((issue) => <option key={issue.id} value={issue.id}>{issue.title}</option>)}</select></label>}<div className="modal-actions"><button className="secondary" type="button" onClick={() => setShowChannel(false)}>{t('취소', 'Cancel')}</button><button className="primary" disabled={saving}>{saving ? t('만드는 중...', 'Creating...') : t('만들기', 'Create')}</button></div></form></Modal>}
  </main></>;
}

function ChatImage({ message }: { message: ChatMessage }) {
  const [url, setUrl] = useState('');
  const [failed, setFailed] = useState(false);
  useEffect(() => { let active = true; let objectUrl = ''; chatApi.attachmentBlob(message).then(({ blob }) => {
    if (!active) return; objectUrl = URL.createObjectURL(blob); setUrl(objectUrl);
  }).catch(() => { if (active) setFailed(true); }); return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); }; }, [message.id]);
  if (failed) return <button className="chat-file" onClick={() => chatApi.download(message)}>▧ <span>{message.originalFilename}</span><small>{formatBytes(message.sizeBytes ?? 0)}</small></button>;
  return <div className="chat-image-card">{url ? <a href={url} target="_blank" rel="noreferrer"><img className="chat-image" src={url} alt={message.originalFilename ?? ''} loading="lazy" /></a> : <span className="chat-image-placeholder" />}<span>{message.originalFilename}</span></div>;
}

function AttachmentPreview({ file, onRemove }: { file: File; onRemove: () => void }) {
  const { t } = useLanguage();
  const [previewUrl, setPreviewUrl] = useState('');
  const image = file.type.startsWith('image/') && /\.(png|jpe?g|gif)$/i.test(file.name);
  useEffect(() => {
    if (!image) { setPreviewUrl(''); return; }
    const url = URL.createObjectURL(file); setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file, image]);
  return <div className="chat-attachment-preview">{previewUrl ? <img src={previewUrl} alt="" /> : <span aria-hidden="true">▤</span>}<div><strong>{file.name}</strong><small>{image ? `${formatBytes(file.size)} · ${t('이미지 미리보기', 'Image preview')}` : formatBytes(file.size)}</small></div><button type="button" onClick={onRemove} aria-label={t(`${file.name} 첨부 취소`, `Remove ${file.name}`)}>×</button></div>;
}
function formatTime(value: string, language: 'ko' | 'en') { return new Intl.DateTimeFormat(language === 'ko' ? 'ko-KR' : 'en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value)); }
function formatBytes(value: number) { return value >= 1024 ** 2 ? `${(value / 1024 ** 2).toFixed(1)} MB` : `${Math.max(1, Math.round(value / 1024))} KB`; }
function mergeMessages(current: ChatMessage[], incoming: ChatMessage[]) {
  const values = new Map(current.map((message) => [message.id, message]));
  incoming.forEach((message) => values.set(message.id, message));
  return [...values.values()].sort((left, right) => left.id - right.id);
}
