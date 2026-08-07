import { useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { assistantApi, type AssistantActionResponse, type AssistantTurn } from '../../api/assistantApi';
import { errorMessage } from '../../api/client';
import { groupApi, type GroupResponse } from '../../api/groupApi';
import { AppNavigation } from '../../app/AppNavigation';
import { useLanguage } from '../../app/LanguageContext';

type ChatItem = AssistantTurn & {
  id: number;
  actionId?: number;
  actionSummary?: string;
  actionResult?: AssistantActionResponse;
};

export function AiAssistantPage() {
  const { t } = useLanguage();
  const [params, setParams] = useSearchParams();
  const [groups, setGroups] = useState<GroupResponse[]>([]);
  const [message, setMessage] = useState('');
  const [items, setItems] = useState<ChatItem[]>([]);
  const [pending, setPending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const groupId = Number(params.get('groupId') ?? 0);

  useEffect(() => {
    groupApi.list().then((values) => {
      setGroups(values);
      if (!groupId && values.length > 0) setParams({ groupId: String(values[0].id) }, { replace: true });
    }).catch((caught) => setItems([assistantMessage(errorMessage(caught))]));
  }, []);

  useEffect(() => {
    if (!groupId) return;
    setLoadingHistory(true);
    assistantApi.messages(groupId).then((values) => {
      setItems(values.length > 0 ? values.map((value) => ({
        id: value.id, role: value.role, content: value.content,
        actionId: value.actionId, actionSummary: value.actionSummary,
        actionResult: value.actionId && value.actionStatus && value.actionStatus !== 'PENDING'
          ? {
            actionId: value.actionId, status: value.actionStatus,
            message: value.actionStatus === 'COMPLETED'
              ? t('이미 실행한 작업입니다.', 'This action was already completed.')
              : t('실행할 수 없는 작업입니다.', 'This action can no longer be run.'),
          } : undefined,
      })) : [welcomeMessage(t)]);
    }).catch((caught) => setItems([assistantMessage(errorMessage(caught))]))
      .finally(() => setLoadingHistory(false));
  }, [groupId]);

  async function send(event: FormEvent) {
    event.preventDefault();
    const content = message.trim();
    if (!content || !groupId || pending) return;
    const userItem: ChatItem = { id: Date.now(), role: 'user', content };
    setItems((old) => [...old, userItem]);
    setMessage('');
    setPending(true);
    try {
      const response = await assistantApi.chat(groupId, content);
      setItems((old) => [...old, {
        id: Date.now() + 1, role: 'assistant', content: response.message,
        actionId: response.pendingActionId, actionSummary: response.actionSummary,
      }]);
    } catch (caught) {
      setItems((old) => [...old, assistantMessage(errorMessage(caught))]);
    } finally {
      setPending(false);
    }
  }

  async function decide(item: ChatItem, confirm: boolean) {
    if (!item.actionId || pending) return;
    setPending(true);
    try {
      const result = confirm
        ? await assistantApi.confirm(item.actionId)
        : await assistantApi.cancel(item.actionId);
      setItems((old) => old.map((value) => value.id === item.id
        ? { ...value, actionResult: result } : value));
      if (result.selectedGroupId) {
        setParams({ groupId: String(result.selectedGroupId) });
      }
    } catch (caught) {
      setItems((old) => [...old, assistantMessage(errorMessage(caught))]);
    } finally {
      setPending(false);
    }
  }

  async function copyInvite(url: string) {
    await navigator.clipboard.writeText(url);
    setItems((old) => [...old, assistantMessage(t('초대 링크를 복사했습니다.', 'Invite link copied.'))]);
  }

  return <><AppNavigation /><main className="assistant-page app-page">
    <header className="assistant-header"><div><span className="page-eyebrow">AI ASSISTANT</span>
      <h1>{t('업무 비서', 'Work assistant')}</h1>
      <p>{t('현재 계정의 권한 안에서만 제안하고, 확인한 작업만 실행합니다.',
        'It only proposes actions within your current permissions and runs them after confirmation.')}</p></div>
      <label><span>{t('작업할 그룹', 'Workspace')}</span><select value={groupId || ''} onChange={(event) => {
        setParams({ groupId: event.target.value });
        setItems((old) => [...old, assistantMessage(t('작업 그룹을 변경했습니다.', 'Workspace changed.'))]);
      }}><option value="" disabled>{t('그룹 선택', 'Choose a group')}</option>{groups.map((group) =>
        <option value={group.id} key={group.id}>{group.name}</option>)}</select></label>
    </header>

    <section className="assistant-chat" aria-label={t('AI 비서 대화', 'AI assistant chat')}>
      <div className="assistant-messages" aria-live="polite">{items.map((item) =>
        <article className={`assistant-message ${item.role}`} key={item.id}>
          <span>{item.role === 'assistant' ? 'AI' : t('나', 'Me')}</span><p>{item.content}</p>
          {item.actionId && item.actionSummary && <div className="assistant-action-card">
            <strong>{item.actionSummary}</strong>
            {!item.actionResult && <div><button type="button" disabled={pending} onClick={() => decide(item, true)}>{t('확인하고 실행', 'Confirm and run')}</button>
              <button type="button" className="secondary" disabled={pending} onClick={() => decide(item, false)}>{t('취소', 'Cancel')}</button></div>}
            {item.actionResult && <div className={`assistant-action-result ${item.actionResult.status.toLowerCase()}`}><p>{item.actionResult.message}</p>
              {item.actionResult.targetUrl && <Link to={item.actionResult.targetUrl}>{t('결과 열기', 'Open result')}</Link>}
              {item.actionResult.inviteUrl && <button type="button" onClick={() => copyInvite(item.actionResult!.inviteUrl!)}>{t('초대 링크 복사', 'Copy invite link')}</button>}</div>}
          </div>}
        </article>)}</div>
      {(pending || loadingHistory) && <p className="assistant-thinking" role="status">{loadingHistory
        ? t('이전 대화를 불러오고 있어요…', 'Loading previous messages…')
        : t('비서가 확인하고 있어요…', 'The assistant is working…')}</p>}
      <form className="assistant-composer" onSubmit={send}><textarea value={message} maxLength={2000}
        onChange={(event) => setMessage(event.target.value)} disabled={!groupId || pending}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
            event.preventDefault();
            event.currentTarget.form?.requestSubmit();
          }
        }}
        placeholder={t("예: '배포 점검 업무를 만들고 체크리스트에 테스트, 모니터링을 넣어줘'",
          "Example: 'Create a release check task with testing and monitoring checklist items'")} />
        <button type="submit" disabled={!message.trim() || !groupId || pending}>{t('보내기', 'Send')}</button></form>
    </section>
  </main></>;
}

function assistantMessage(content: string): ChatItem {
  return { id: Date.now() + Math.random(), role: 'assistant', content };
}

function welcomeMessage(t: (ko: string, en: string) => string): ChatItem {
  return assistantMessage(t(
    '무엇을 도와드릴까요? 업무·댓글·멘션·알림 처리와 작업 그룹 선택을 맡길 수 있어요.',
    'How can I help? I can handle tasks, comments, mentions, notifications, and workspace selection.'));
}
