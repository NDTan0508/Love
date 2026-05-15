'use client'

import { useEffect, useState } from 'react'

type NotificationSupport = 'checking' | 'unsupported' | 'supported'

const NOTIFICATION_PERMISSION_KEY = 'love-mission-notification-permission'

function isIOSDevice() {
  if (typeof window === 'undefined') return false
  const userAgent = window.navigator.userAgent
  return (
    /iPad|iPhone|iPod/.test(userAgent) ||
    (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1)
  )
}

function isStandalone() {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone)
  )
}

function getNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'default'
  return window.Notification.permission
}

export default function EnableNotificationsButton() {
  const [support, setSupport] = useState<NotificationSupport>('checking')
  const [permission, setPermission] = useState<NotificationPermission>('default')

  useEffect(() => {
    if (typeof window === 'undefined') return

    const supported =
      'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window
    const canShowOnThisDevice = !isIOSDevice() || isStandalone()

    setSupport(supported && canShowOnThisDevice ? 'supported' : 'unsupported')
    setPermission(getNotificationPermission())
  }, [])

  if (support !== 'supported' || permission === 'granted' || permission === 'denied') {
    return null
  }

  const requestPermission = async () => {
    const nextPermission = await window.Notification.requestPermission()
    window.localStorage.setItem(NOTIFICATION_PERMISSION_KEY, nextPermission)
    setPermission(nextPermission)

    if (nextPermission === 'granted' && 'serviceWorker' in navigator) {
      await navigator.serviceWorker.ready.catch(() => undefined)
    }
  }

  return (
    <button
      type="button"
      onClick={requestPermission}
      className="w-full rounded-2xl border border-pink-100 bg-white/95 px-4 py-3 text-sm font-bold text-indigo-950 shadow-[0_12px_28px_rgba(236,72,153,0.12)] transition hover:bg-pink-50 focus:outline-none focus:ring-4 focus:ring-pink-200"
    >
      Bật thông báo nhiệm vụ
    </button>
  )
}
