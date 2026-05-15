'use client'

import { useEffect, useState } from 'react'

const IOS_INSTALL_GUIDE_DISMISSED_KEY = 'love-mission-ios-install-guide-dismissed'

function getIsStandalone() {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone)
  )
}

function getIsIOSSafari() {
  if (typeof window === 'undefined') return false

  const userAgent = window.navigator.userAgent
  const platform = window.navigator.platform
  const isIOS =
    /iPad|iPhone|iPod/.test(userAgent) ||
    (platform === 'MacIntel' && window.navigator.maxTouchPoints > 1)
  const isSafari = /Safari/.test(userAgent) && !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(userAgent)

  return isIOS && isSafari
}

export default function IOSInstallGuide() {
  const [shouldShow, setShouldShow] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const dismissed = window.localStorage.getItem(IOS_INSTALL_GUIDE_DISMISSED_KEY) === '1'
    setShouldShow(getIsIOSSafari() && !getIsStandalone() && !dismissed)
  }, [])

  if (!shouldShow) return null

  const dismiss = () => {
    window.localStorage.setItem(IOS_INSTALL_GUIDE_DISMISSED_KEY, '1')
    setShouldShow(false)
  }

  return (
    <section className="rounded-[22px] border border-pink-100 bg-white/95 p-4 text-indigo-950 shadow-[0_16px_36px_rgba(236,72,153,0.16)] backdrop-blur">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pink-100 text-lg">
          ♥
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">Cài Love Mission</p>
          <p className="mt-1 text-sm leading-5 text-slate-600">
            Trên iPhone: bấm nút Share → Add to Home Screen để cài app.
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Đóng hướng dẫn cài app"
          className="rounded-full px-2 py-1 text-sm font-bold text-slate-400 transition hover:bg-pink-50 hover:text-pink-600 focus:outline-none focus:ring-2 focus:ring-pink-200"
        >
          ×
        </button>
      </div>
    </section>
  )
}
