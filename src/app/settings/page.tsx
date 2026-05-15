"use client"

import { useEffect, useState } from 'react'
import AuthGuard from '../../components/AuthGuard'
import { ErrorState, LoadingState } from '../../components/StatePanel'
import {
  CoupleProfile,
  formatDateForDisplay,
  getCoupleProfile,
  updateCoupleProfile
} from '../../lib/coupleProfileService'
import { useToast } from '../../lib/useToast'

type ProfileForm = {
  coupleName: string
  anniversaryDate: string
  myName: string
  myBirthday: string
  myPhone: string
}

type IconName = 'heart' | 'calendar' | 'users' | 'user' | 'phone' | 'gift'

function formFromProfile(profile: CoupleProfile | null): ProfileForm {
  return {
    coupleName: profile?.coupleName || '',
    anniversaryDate: profile?.anniversaryDate || '',
    myName: profile?.me?.name || '',
    myBirthday: profile?.me?.birthday || '',
    myPhone: profile?.me?.phone || ''
  }
}

export default function SettingsPage() {
  const { success, error } = useToast()
  const [profile, setProfile] = useState<CoupleProfile | null>(null)
  const [profileForm, setProfileForm] = useState<ProfileForm>(formFromProfile(null))
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [savingProfile, setSavingProfile] = useState(false)

  useEffect(() => {
    let mounted = true
    async function loadProfile() {
      try {
        const data = await getCoupleProfile()
        if (!mounted) return
        setProfile(data)
        setProfileForm(formFromProfile(data))
        setProfileError(null)
      } catch {
        if (mounted) setProfileError('Chưa tải được hồ sơ của hai bạn.')
      } finally {
        if (mounted) setLoadingProfile(false)
      }
    }
    loadProfile()
    return () => {
      mounted = false
    }
  }, [])

  function updateForm(key: keyof ProfileForm, value: string) {
    setProfileForm((current) => ({ ...current, [key]: value }))
  }

  async function handleSaveProfile(event: React.FormEvent) {
    event.preventDefault()
    setSavingProfile(true)
    try {
      const next = await updateCoupleProfile(profileForm)
      setProfile(next)
      setProfileForm(formFromProfile(next))
      success('Đã lưu hồ sơ của hai bạn')
    } catch (err) {
      error((err as Error).message || 'Chưa lưu được hồ sơ.')
    } finally {
      setSavingProfile(false)
    }
  }

  const partnerBirthday = formatDateForDisplay(profile?.partner?.birthday)
  const partnerPhone = profile?.partner?.phone || 'Chưa đặt'

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(244,114,182,0.12),transparent_28%),linear-gradient(180deg,#fff7fb_0%,#ffffff_44%,#fff1f7_100%)] px-4 pb-28 pt-7 text-indigo-950">
        <main className="mx-auto max-w-[430px]">
          <header>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-pink-500">Profile</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-indigo-950">Cài đặt</h1>
          </header>

          {loadingProfile ? (
            <div className="mt-8">
              <LoadingState title="Đang tải hồ sơ" description="Đang lấy thông tin của hai bạn." />
            </div>
          ) : profileError ? (
            <div className="mt-8">
              <ErrorState title="Không thể tải hồ sơ" description={profileError} />
            </div>
          ) : (
            <>
              <section className="mt-6 flex items-center gap-3 overflow-hidden rounded-[24px] border border-pink-100 bg-white/90 p-4 shadow-[0_16px_44px_rgba(244,114,182,0.13)]">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-[18px] bg-pink-100/80 text-pink-500">
                  <Icon name="heart" className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-base font-black leading-tight text-indigo-950">{profile?.coupleName || 'Không gian của hai bạn'}</h2>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                    {profile?.daysTogether ? `${profile.daysTogether} ngày yêu nhau.` : 'Thêm ngày yêu nhau để Web Love tính đúng cho hai bạn.'}
                  </p>
                </div>
                <div className="shrink-0 opacity-90">
                  <HeartCalendarIllustration />
                </div>
              </section>

              <form onSubmit={handleSaveProfile} className="mt-4 rounded-[26px] border border-pink-100 bg-white p-4 shadow-[0_18px_54px_rgba(244,114,182,0.12)]">
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-pink-100 text-pink-500">
                    <Icon name="heart" className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black leading-tight text-indigo-950">Hồ sơ couple</h3>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Người ấy sẽ thấy tên cặp đôi và ngày yêu nhau. Số điện thoại chỉ hiện với hai bạn.
                    </p>
                  </div>
                </div>

                <div className="my-5 border-t border-dashed border-pink-200" />

                <Field
                  label="Tên không gian"
                  value={profileForm.coupleName}
                  onChange={(value) => updateForm('coupleName', value)}
                  placeholder="Ví dụ: Mình & Người thương"
                  icon="users"
                />

                <Field
                  label="Ngày yêu nhau"
                  type="date"
                  value={profileForm.anniversaryDate}
                  onChange={(value) => updateForm('anniversaryDate', value)}
                  icon="calendar"
                />

                <div className="grid grid-cols-1">
                  <Field
                    label="Tên của bạn"
                    value={profileForm.myName}
                    onChange={(value) => updateForm('myName', value)}
                    placeholder="Tên hiển thị"
                    icon="user"
                  />
                  <Field
                    label="Ngày sinh của bạn"
                    type="date"
                    value={profileForm.myBirthday}
                    onChange={(value) => updateForm('myBirthday', value)}
                    icon="calendar"
                  />
                </div>

                <Field
                  label="Số điện thoại"
                  value={profileForm.myPhone}
                  onChange={(value) => updateForm('myPhone', value)}
                  placeholder="Số để người ấy dễ liên lạc"
                  icon="phone"
                  inputMode="tel"
                />

                <section className="mt-5 flex gap-3 rounded-[22px] border border-pink-200 bg-gradient-to-r from-pink-50 to-white p-4">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-pink-200 bg-white text-pink-500">
                    <Icon name="gift" className="h-7 w-7" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-2">
                      <h4 className="truncate text-sm font-black text-indigo-950">{profile?.partner?.name || 'Người thương'}</h4>
                      {profile?.partner?.role ? <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[10px] font-bold uppercase text-pink-500">{profile.partner.role}</span> : null}
                    </div>
                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      Sinh nhật: <span className="font-bold text-pink-500">{partnerBirthday}</span>
                    </p>
                    <p className="text-xs leading-5 text-slate-500">
                      Số điện thoại: <span className="font-bold text-pink-500">{partnerPhone}</span>
                    </p>
                  </div>
                </section>

                <button
                  type="submit"
                  disabled={savingProfile}
                  className="mt-5 h-[52px] w-full rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 text-sm font-black text-white shadow-[0_14px_28px_rgba(236,72,153,0.28)] transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {savingProfile ? 'Đang lưu...' : '♥  Lưu hồ sơ'}
                </button>
              </form>
            </>
          )}
        </main>
      </div>
    </AuthGuard>
  )
}

function Field({
  label,
  value,
  placeholder,
  icon,
  type = 'text',
  inputMode,
  onChange
}: {
  label: string
  value: string
  placeholder?: string
  icon: IconName
  type?: string
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']
  onChange: (value: string) => void
}) {
  return (
    <label className="mt-4 block">
      <span className="text-[13px] font-black leading-5 text-indigo-950">{label}</span>
      <div className="mt-2 flex min-h-[52px] items-center gap-2 rounded-[18px] border border-pink-100 bg-white px-3 transition focus-within:border-pink-200 focus-within:ring-4 focus-within:ring-pink-100">
        <input
          className={`min-w-0 flex-1 bg-transparent text-sm text-indigo-950 outline-none placeholder:text-slate-400 ${
            type === 'date' ? '[&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0' : ''
          }`}
          type={type}
          value={value}
          placeholder={placeholder}
          inputMode={inputMode}
          onChange={(event) => onChange(event.target.value)}
        />
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[15px] bg-pink-50 text-pink-500">
          <Icon name={icon} className="h-[18px] w-[18px]" />
        </div>
      </div>
    </label>
  )
}

function Icon({ name, className = 'h-5 w-5' }: { name: IconName; className?: string }) {
  const common = {
    className,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2.2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true
  }

  if (name === 'heart') {
    return (
      <svg {...common}>
        <path d="M20.8 4.6c-1.8-1.7-4.6-1.5-6.2.4L12 8.1 9.4 5C7.8 3.1 5 2.9 3.2 4.6c-2 1.9-2 5.1 0 7l8.8 8.1 8.8-8.1c2-1.9 2-5.1 0-7Z" />
      </svg>
    )
  }
  if (name === 'calendar') {
    return (
      <svg {...common}>
        <path d="M8 2v4M16 2v4M4 9h16M5 5h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" />
      </svg>
    )
  }
  if (name === 'users') {
    return (
      <svg {...common}>
        <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
        <circle cx="9.5" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" />
      </svg>
    )
  }
  if (name === 'user') {
    return (
      <svg {...common}>
        <path d="M20 21a8 8 0 0 0-16 0" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    )
  }
  if (name === 'phone') {
    return (
      <svg {...common}>
        <path d="M22 16.9v3a2 2 0 0 1-2.2 2A19.8 19.8 0 0 1 3.1 5.2 2 2 0 0 1 5.1 3h3a2 2 0 0 1 2 1.7c.1.9.3 1.7.6 2.5a2 2 0 0 1-.5 2.1L9 10.5a16 16 0 0 0 4.5 4.5l1.2-1.2a2 2 0 0 1 2.1-.5c.8.3 1.6.5 2.5.6a2 2 0 0 1 1.7 2Z" />
      </svg>
    )
  }
  return (
    <svg {...common}>
      <path d="M20 12v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-8M2 8h20v4H2zM12 21V8" />
      <path d="M12 8H7.5A2.5 2.5 0 1 1 10 5.5C10 8 12 8 12 8ZM12 8h4.5A2.5 2.5 0 1 0 14 5.5C14 8 12 8 12 8Z" />
    </svg>
  )
}

function HeartCalendarIllustration() {
  return (
    <div className="pointer-events-none relative h-16 w-20" aria-hidden="true">
      <div className="absolute right-5 top-2 h-10 w-10 rotate-45 rounded-lg bg-gradient-to-br from-pink-300 to-pink-500 opacity-80 shadow-lg" />
      <div className="absolute right-10 top-1 h-7 w-7 rounded-full bg-pink-300 opacity-80" />
      <div className="absolute right-3 top-1 h-7 w-7 rounded-full bg-pink-400 opacity-80" />
      <div className="absolute bottom-0 right-0 w-14 rotate-3 rounded-xl border border-pink-100 bg-white p-1.5 shadow-lg">
        <div className="mb-1.5 h-2 rounded-t-lg bg-pink-300" />
        <div className="grid grid-cols-3 gap-1">
          {Array.from({ length: 9 }).map((_, index) => (
            <div key={index} className="h-1.5 rounded bg-pink-100" />
          ))}
        </div>
      </div>
      <div className="absolute bottom-1 right-1 text-sm text-pink-500">♥</div>
    </div>
  )
}
