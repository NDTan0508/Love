'use client'
import { RealtimeProvider } from './RealtimeProvider'

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <RealtimeProvider>
      {children}
    </RealtimeProvider>
  )
}
