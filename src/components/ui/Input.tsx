import React from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export default function Input({
  label,
  error,
  className = '',
  ...props
}: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-semibold text-indigo-950">{label}</label>}
      <input
        className={`rounded-2xl border bg-white/90 p-3 text-indigo-950 shadow-sm placeholder:text-slate-400 ${error ? 'border-red-400' : 'border-pink-100'} focus:outline-none focus:ring-4 focus:ring-pink-100 ${className}`}
        {...props}
      />
      {error && <span className="text-sm text-red-500">{error}</span>}
    </div>
  )
}
