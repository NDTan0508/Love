'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useNotifications, markRead, markAllRead, clearAll, formatNotifTime, type AppNotification } from '../lib/notificationStore'
import { useAuth } from '../lib/useAuth'

export default function NotificationBell() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { notifs, hasUnread, unreadCount } = useNotifications()
  const [open, setOpen] = useState(false)
  const popupRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleNotifClick = (notif: AppNotification) => {
    markRead(notif.id)
    if (notif.url) {
      setOpen(false)
      router.push(notif.url)
    }
  }

  if (authLoading || !user) return null

  return (
    <div className="fixed bottom-24 right-4 z-50 md:bottom-6 md:right-[calc(50%-232px)]">
      <button
        ref={buttonRef}
        onClick={() => setOpen((value) => !value)}
        className="relative flex h-12 w-12 items-center justify-center rounded-full bg-white p-2 shadow-[0_10px_30px_rgba(244,63,94,0.30)] ring-1 ring-pink-100 focus:outline-none focus:ring-4 focus:ring-pink-200"
        title="Thông báo"
        aria-label="Thông báo"
      >
        <img src="/icons/nav-bell.svg" alt="" className="h-full w-full" />
        {hasUnread ? (
          <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-white bg-red-500 px-1 text-[9px] font-bold leading-none text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          ref={popupRef}
          className="absolute bottom-14 right-0 flex max-h-[70vh] w-[min(370px,calc(100vw-32px))] flex-col overflow-hidden rounded-3xl border border-pink-100 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.18)]"
        >
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-pink-100 bg-pink-50 px-4 py-3">
            <span className="text-sm font-bold text-rose-700">
              Thông báo {unreadCount > 0 ? `(${unreadCount})` : ''}
            </span>
            <div className="flex gap-2">
              <button
                onClick={markAllRead}
                className="rounded-full border border-pink-200 bg-white px-3 py-1 text-[11px] font-semibold text-pink-700"
              >
                Đọc hết
              </button>
              <button
                onClick={clearAll}
                className="rounded-full border border-red-100 bg-white px-3 py-1 text-[11px] font-semibold text-red-600"
              >
                Xóa
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {notifs.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-slate-400">
                Chưa có thông báo nào
              </div>
            ) : (
              notifs.map((notif) => (
                <button
                  key={notif.id}
                  type="button"
                  onClick={() => handleNotifClick(notif)}
                  className={`flex w-full items-start gap-3 border-b border-pink-50 px-4 py-3 text-left transition hover:bg-pink-50 ${
                    notif.read ? 'opacity-55' : 'bg-white'
                  }`}
                >
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${notif.read ? 'bg-transparent' : 'bg-rose-500'}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block break-words text-sm leading-5 text-slate-700">{notif.message}</span>
                    <span className="mt-1 block text-[11px] text-slate-400">{formatNotifTime(notif.timestamp)}</span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
