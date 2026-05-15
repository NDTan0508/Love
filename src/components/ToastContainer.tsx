"use client"
import React from 'react'
import { useToast } from '../lib/useToast'

export default function ToastContainer() {
  const { toasts } = useToast()

  return (
    <div className="fixed bottom-4 right-4 space-y-2 z-50">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`p-3 rounded text-white text-sm shadow-lg ${
            t.type === 'success'
              ? 'bg-green-500'
              : t.type === 'error'
                ? 'bg-red-500'
                : 'bg-blue-500'
          }`}
        >
          {t.message}
        </div>
      ))}
    </div>
  )
}
