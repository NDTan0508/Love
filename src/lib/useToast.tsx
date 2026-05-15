"use client"
import React, { useEffect, useState, useCallback } from 'react'

export type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: string
  message: string
  type: ToastType
}

interface ToastStore {
  toasts: Toast[]
  listeners: Set<(toasts: Toast[]) => void>
}

const globalStore = globalThis as typeof globalThis & { __webLoveToastStore?: ToastStore }

function getStore(): ToastStore {
  if (!globalStore.__webLoveToastStore) {
    globalStore.__webLoveToastStore = {
      toasts: [],
      listeners: new Set()
    }
  }

  return globalStore.__webLoveToastStore
}

let toastId = 0

function notify() {
  const store = getStore()
  const snapshot = [...store.toasts]
  store.listeners.forEach((listener) => listener(snapshot))
}

function addToast(message: string, type: ToastType, timeoutMs: number = 3000) {
  const store = getStore()
  const id = `${++toastId}`
  store.toasts.push({ id, message, type })
  notify()

  window.setTimeout(() => {
    const index = store.toasts.findIndex((toast) => toast.id === id)
    if (index > -1) {
      store.toasts.splice(index, 1)
      notify()
    }
  }, timeoutMs)
}

export function useToast() {
  const [messages, setMessages] = useState<Toast[]>(() => [...getStore().toasts])

  useEffect(() => {
    const store = getStore()
    const listener = (updated: Toast[]) => setMessages(updated)
    store.listeners.add(listener)
    setMessages([...store.toasts])

    return () => {
      store.listeners.delete(listener)
    }
  }, [])

  const success = useCallback((message: string, timeoutMs: number = 3000) => {
    addToast(message, 'success', timeoutMs)
  }, [])

  const error = useCallback((message: string, timeoutMs: number = 3000) => {
    addToast(message, 'error', timeoutMs)
  }, [])

  const info = useCallback((message: string, timeoutMs: number = 3000) => {
    addToast(message, 'info', timeoutMs)
  }, [])

  return {
    success,
    error,
    info,
    toasts: messages
  }
}
