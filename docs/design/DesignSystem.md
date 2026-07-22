# 디자인 시스템 기준선

상태: 로컬 알파 시각·접근성 기준과 현재 구현 위치

업무 집중형 제품으로 설계한다. 장식보다 정보 계층, 상태 비교, 다음 행동의 명확성을 우선한다. 기존 인증 화면의 인디고 계열을 제품 전체의 주 색상으로 이어간다.

## 토큰

```css
:root {
  --color-brand-50: #eef1ff;
  --color-brand-100: #e0e6ff;
  --color-brand-500: #5268d5;
  --color-brand-600: #4359c4;
  --color-brand-700: #3548a7;

  --color-neutral-0: #ffffff;
  --color-neutral-50: #f6f7fb;
  --color-neutral-100: #eceef4;
  --color-neutral-300: #c9ceda;
  --color-neutral-500: #727b90;
  --color-neutral-700: #394157;
  --color-neutral-900: #1b2234;

  --color-success: #23845b;
  --color-warning: #a86608;
  --color-danger: #b3263e;
  --color-info: #2563a7;

  --font-sans: "Noto Sans KR", system-ui, sans-serif;
  --font-display: "Manrope", "Noto Sans KR", sans-serif;
  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-md: 1rem;
  --text-lg: 1.25rem;
  --text-xl: 1.75rem;
  --text-2xl: 2.25rem;

  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --space-6: 32px;
  --space-7: 48px;
  --space-8: 64px;

  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --radius-pill: 999px;
  --shadow-card: 0 8px 24px rgb(34 44 88 / 8%);
  --shadow-overlay: 0 20px 50px rgb(20 28 64 / 18%);
  --focus-ring: 0 0 0 3px rgb(82 104 213 / 22%);
}
```

기본 본문은 16px/1.6, 보조 문구는 14px/1.5를 사용한다. 한 화면에서 카드 반경은 10px 또는 16px 중 하나로 통일한다.

## 상태 표현

| 분류 | 표시 | 원칙 |
|---|---|---|
| 업무 상태 | 텍스트 배지 + 아이콘 | 색상만으로 구분하지 않음 |
| 우선순위 | `긴급`, `높음`, `보통`, `낮음` | 항상 텍스트 표시 |
| 지연 | 위험 아이콘 + `지연` | 마감일 색상만 바꾸지 않음 |
| 읽지 않은 알림 | 점 + 굵은 제목 | 읽음과 최소 2가지 차이 제공 |
| 성공/실패 | 토스트 + 화면 상태 갱신 | 토스트만으로 결과를 남기지 않음 |

업무 상태의 기본 의미는 다음과 같다.

- `REQUESTED`: 정보색, 요청
- `TODO`: 중립/브랜드색, 할 일
- `IN_PROGRESS`: 브랜드색, 진행
- `ON_HOLD`: 경고색, 보류
- `COMPLETED`: 성공색, 완료
- `REJECTED`·`CANCELLED`: 위험 또는 중립 위험색, 반려·취소

## 공통 UI 동작 기준

- `AppShell`: PC 사이드바·상단바·모바일 하단 탐색
- `PageHeader`: 경로, 제목, 설명, 주요 행동 1개
- `GroupSwitcher`: 현재 그룹과 역할, 그룹 전환
- `Button`: primary, secondary, text, danger
- `FormField`: label, hint, error, required 상태를 한 단위로 처리
- `StatusBadge`, `PriorityBadge`, `MemberAvatar`
- `FilterBar`, `SearchField`, `SortMenu`
- `DataTable`과 모바일 대응 `CardList`
- `Modal`, 모바일 `BottomSheet`, `ConfirmDialog`, `ReasonDialog`
- `ToastRegion`: 성공·실패 알림의 `aria-live` 영역
- `Skeleton`, `EmptyState`, `ErrorState`, `ForbiddenState`, `NotFoundState`, `OfflineState`

페이지는 공통 상태 컴포넌트를 사용하며 자체적인 “로딩 중...” 텍스트만 임시로 만들지 않는다.

## 상호작용 기준

- 한 화면의 primary 버튼은 원칙적으로 하나다.
- 서버 요청 중 제출 버튼을 잠그고 중복 요청을 막는다.
- 삭제·탈퇴·반려·취소는 결과를 설명하는 확인 단계가 필요하다.
- 상태 변경 후 포커스를 의미 있는 제목 또는 변경 결과로 이동한다.
- 폼 오류는 필드 가까이 표시하고 첫 오류 필드로 포커스를 이동한다.
- hover에만 정보를 두지 않으며 키보드와 터치로 같은 동작을 제공한다.

## 접근성 기준

- 일반 텍스트 WCAG AA 대비 4.5:1 이상
- 터치 대상 최소 44×44px
- 모든 입력에 보이는 label 제공
- 키보드 포커스 표시 유지
- 대화상자 포커스 가두기와 닫은 뒤 원래 트리거로 복귀
- skeleton에도 스크린리더용 로딩 문구 제공
- 차트는 요약 수치 또는 표 형태의 대체 정보를 함께 제공

## 구현 위치

현재 로컬 알파의 전역 시각 규칙과 반응형·접근성 보정은 `frontend/src/styles.css`에 있고, 인증 공통 폼 요소는 `features/auth/components`에 있다. 위 컴포넌트 목록은 공통 동작 기준이며 아직 모두 독립 컴포넌트로 분리된 것은 아니다. `tokens.css`와 `shared/ui` 분리는 중복이 실제 유지보수 문제로 확인될 때 후속 리팩터링으로 진행한다.
