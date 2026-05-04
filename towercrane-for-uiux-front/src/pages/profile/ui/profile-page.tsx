import { useMemo, useState } from 'react'
import {
  Activity,
  BadgeCheck,
  CalendarDays,
  Clock3,
  FileText,
  Fingerprint,
  ImagePlus,
  KeyRound,
  Loader2,
  Mail,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserRound,
} from 'lucide-react'
import { useUpdateProfileImage, type SessionUser } from '../../../shared/api/auth'
import { uploadFile } from '../../../shared/api/upload'
import { Card } from '../../../shared/ui/card'

type ProfilePageProps = {
  user: SessionUser | undefined
}

type ProfileTabId = 'overview' | 'activity' | 'security' | 'workspace'

const tabs: Array<{
  id: ProfileTabId
  label: string
  icon: typeof UserRound
}> = [
  { id: 'overview', label: '기본 정보', icon: UserRound },
  { id: 'activity', label: '활동 메타', icon: Activity },
  { id: 'security', label: '보안/권한', icon: ShieldCheck },
  { id: 'workspace', label: '워크스페이스', icon: FileText },
]

function formatDate(value: string | undefined) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(value))
}

function getInitials(name: string | undefined, email: string | undefined) {
  const source = name?.trim() || email?.trim() || 'TC'
  const words = source.split(/\s+/).filter(Boolean)
  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase()
  }
  return source.slice(0, 2).toUpperCase()
}

export function ProfilePage({ user }: ProfilePageProps) {
  const [activeTab, setActiveTab] = useState<ProfileTabId>('overview')
  const [uploading, setUploading] = useState(false)
  const updateProfileImage = useUpdateProfileImage()

  const initials = useMemo(() => getInitials(user?.name, user?.email), [user?.email, user?.name])
  const joinedAt = formatDate(user?.createdAt)
  const updatedAt = formatDate(user?.updatedAt)
  const isImageBusy = uploading || updateProfileImage.isPending

  const handleProfileImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) return

    setUploading(true)
    try {
      const publicUrl = await uploadFile(file)
      await updateProfileImage.mutateAsync(publicUrl)
    } catch (error) {
      console.error('Profile image upload failed:', error)
      alert('프로필 이미지 업로드에 실패했습니다.')
    } finally {
      setUploading(false)
    }
  }

  const tabPanels: Record<ProfileTabId, Array<{ label: string; value: string; icon: typeof UserRound }>> = {
    overview: [
      { label: '표시 이름', value: user?.name || '-', icon: UserRound },
      { label: '이메일', value: user?.email || '-', icon: Mail },
      { label: '사용자 ID', value: user?.id || '-', icon: Fingerprint },
      { label: '프로필 갱신', value: updatedAt, icon: Clock3 },
    ],
    activity: [
      { label: '최근 작업 영역', value: 'Prototype Registry', icon: Sparkles },
      { label: '문서 참여', value: 'README / Docu Workspace', icon: FileText },
      { label: '워크룸 상태', value: '프로젝트 채널 참여 가능', icon: MessageSquareText },
      { label: '계정 생성일', value: joinedAt, icon: CalendarDays },
    ],
    security: [
      { label: '역할', value: user?.role === 'admin' ? '관리자' : '일반 사용자', icon: ShieldCheck },
      { label: '세션 상태', value: user ? '활성 세션' : '확인 필요', icon: BadgeCheck },
      { label: '인증 방식', value: '이메일 로그인', icon: KeyRound },
      { label: '권한 스코프', value: user?.role === 'admin' ? '전체 콘솔 관리' : '개인 작업 공간', icon: Fingerprint },
    ],
    workspace: [
      { label: '기본 진입 메뉴', value: 'Prototype', icon: Sparkles },
      { label: '문서 보기', value: 'Docu / README', icon: FileText },
      { label: '커뮤니케이션', value: 'Workroom', icon: MessageSquareText },
      { label: '테마 동기화', value: '로컬 설정 유지', icon: BadgeCheck },
    ],
  }

  return (
    <div className="grid w-full min-w-0 items-start gap-3 xl:grid-cols-[minmax(0,1fr)_300px]">
      <Card className="min-h-[620px] min-w-0 overflow-hidden rounded-md p-5 sm:p-6">
        <div className="mb-6 flex flex-col gap-3 border-b border-surface-border-soft pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-brand-primary">Profile Console</p>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-text-primary">내 프로필</h1>
            <p className="mt-1 text-sm text-text-secondary">
              계정 정보, 활동 메타, 권한 상태를 한 화면에서 확인합니다.
            </p>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-sm border border-brand-border bg-brand-glass px-3 py-1.5 text-xs font-bold text-brand-primary">
            <BadgeCheck className="size-3.5" />
            {user?.role === 'admin' ? 'Admin Access' : 'User Access'}
          </span>
        </div>

        <div className="grid min-w-0 gap-4 lg:grid-cols-[190px_minmax(0,1fr)]">
          <nav className="flex min-w-0 gap-2 overflow-x-auto pb-1 lg:block lg:space-y-2 lg:overflow-visible lg:pb-0">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex h-11 shrink-0 items-center gap-2 rounded-md border px-3 text-left text-sm font-bold transition-all lg:w-full ${
                    isActive
                      ? 'border-brand-border bg-brand-glass text-brand-primary shadow-sm'
                      : 'border-surface-border-soft bg-surface-muted/30 text-text-secondary hover:border-surface-border hover:bg-surface-muted hover:text-text-primary'
                  }`}
                >
                  <Icon className="size-4 shrink-0" />
                  {tab.label}
                </button>
              )
            })}
          </nav>

          <section className="grid min-w-0 gap-3 md:grid-cols-2">
            {tabPanels[activeTab].map((item) => {
              const Icon = item.icon
              return (
                <div key={item.label} className="ui-panel-soft min-h-[112px] p-4">
                  <div className="mb-4 flex size-9 items-center justify-center rounded-md border border-brand-border bg-brand-glass text-brand-primary">
                    <Icon className="size-4" />
                  </div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-text-muted">{item.label}</p>
                  <p className="mt-1 break-words text-sm font-bold leading-6 text-text-primary">{item.value}</p>
                </div>
              )
            })}
          </section>
        </div>
      </Card>

      <aside className="min-w-0">
        <Card className="rounded-md p-5">
          <div className="flex flex-col items-center text-center">
            <div className="relative flex size-28 items-center justify-center overflow-hidden rounded-md border border-brand-border bg-brand-glass text-3xl font-black text-brand-primary shadow-sm">
              {user?.profileImageUrl ? (
                <img
                  src={user.profileImageUrl}
                  alt={`${user.name} 프로필 이미지`}
                  className="size-full object-cover"
                />
              ) : (
                initials
              )}
              {isImageBusy ? (
                <div className="absolute inset-0 flex items-center justify-center bg-surface-muted/80 text-brand-primary">
                  <Loader2 className="size-5 animate-spin" />
                </div>
              ) : null}
            </div>
            <h2 className="mt-4 text-xl font-black text-text-primary">{user?.name || '사용자'}</h2>
            <p className="mt-1 max-w-full break-words text-sm text-text-secondary">{user?.email || '로그인 정보 확인 중'}</p>
            <div className="mt-4 flex w-full gap-2">
              <label className="inline-flex h-9 flex-1 cursor-pointer items-center justify-center gap-2 rounded-sm border border-brand-border bg-brand-glass px-3 text-xs font-bold text-brand-primary transition-colors hover:bg-surface-muted">
                <ImagePlus className="size-3.5" />
                이미지 변경
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  disabled={isImageBusy}
                  onChange={handleProfileImageUpload}
                />
              </label>
              {user?.profileImageUrl ? (
                <button
                  type="button"
                  disabled={isImageBusy}
                  onClick={() => updateProfileImage.mutate(null)}
                  className="inline-flex size-9 items-center justify-center rounded-sm border border-surface-border bg-surface-muted text-text-secondary transition-colors hover:text-text-primary disabled:opacity-50"
                  aria-label="프로필 이미지 삭제"
                  title="프로필 이미지 삭제"
                >
                  <Trash2 className="size-3.5" />
                </button>
              ) : null}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2">
            <div className="rounded-md border border-surface-border-soft bg-surface-raised p-3 text-center">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-text-muted">Role</p>
              <p className="mt-1 text-sm font-black text-text-primary">{user?.role ?? '-'}</p>
            </div>
            <div className="rounded-md border border-surface-border-soft bg-surface-raised p-3 text-center">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-text-muted">Status</p>
              <p className="mt-1 text-sm font-black text-brand-primary">Active</p>
            </div>
          </div>

          <dl className="mt-5 space-y-3 border-t border-surface-border-soft pt-4 text-sm">
            <div className="flex items-start justify-between gap-3">
              <dt className="text-text-secondary">가입일</dt>
              <dd className="text-right font-bold text-text-primary">{joinedAt}</dd>
            </div>
            <div className="flex items-start justify-between gap-3">
              <dt className="text-text-secondary">마지막 동기화</dt>
              <dd className="text-right font-bold text-text-primary">{updatedAt}</dd>
            </div>
            <div className="flex items-start justify-between gap-3">
              <dt className="text-text-secondary">작업 권한</dt>
              <dd className="text-right font-bold text-text-primary">
                {user?.role === 'admin' ? '관리/작성/조회' : '작성/조회'}
              </dd>
            </div>
          </dl>
        </Card>
      </aside>
    </div>
  )
}
