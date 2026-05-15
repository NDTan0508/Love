import React from 'react'

interface StatePanelProps {
  title: string
  description: string
  action?: React.ReactNode
}

export function LoadingState({
  title = 'Đang tải',
  description = 'Vui lòng chờ một chút'
}: Partial<StatePanelProps>) {
  return (
    <div className="rounded-[24px] border border-pink-100 bg-white/90 p-6 text-center shadow-sm">
      <div className="mx-auto mb-3 h-10 w-10 animate-pulse rounded-full bg-pink-100" />
      <p className="font-semibold text-indigo-950">{title}</p>
      <p className="mt-1 text-sm text-slate-600">{description}</p>
    </div>
  )
}

export function EmptyState({ title, description, action }: StatePanelProps) {
  return (
    <div className="rounded-[24px] border border-dashed border-pink-200 bg-white/90 p-6 text-center shadow-sm">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-pink-50 text-2xl text-pink-500">♥</div>
      <p className="font-semibold text-indigo-950">{title}</p>
      <p className="mt-1 text-sm text-slate-600">{description}</p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  )
}

export function ErrorState({ title, description, action }: StatePanelProps) {
  return (
    <div className="rounded-[24px] border border-red-100 bg-red-50 p-6 text-center shadow-sm">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-xl text-red-700">!</div>
      <p className="font-semibold text-red-900">{title}</p>
      <p className="mt-1 text-sm text-red-700">{description}</p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  )
}
