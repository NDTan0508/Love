'use client'

import { useEffect } from 'react'
import EnableNotificationsButton from './EnableNotificationsButton'
import IOSInstallGuide from './IOSInstallGuide'
import InstallPWAButton from './InstallPWAButton'

export default function PWAProvider() {
  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      !('serviceWorker' in navigator) ||
      process.env.NODE_ENV !== 'production'
    ) {
      return
    }

    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => undefined)
  }, [])

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-50 mx-auto flex max-w-[430px] flex-col gap-3 px-4">
      <div className="pointer-events-auto flex flex-col gap-3">
        <IOSInstallGuide />
        <InstallPWAButton />
        <EnableNotificationsButton />
      </div>
    </div>
  )
}
