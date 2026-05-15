'use client'

export default function OfflinePage() {
  return (
    <div className="love-page flex min-h-screen items-center justify-center bg-gradient-to-br from-pink-50 via-white to-violet-100">
      <section className="w-full rounded-[28px] border border-pink-100 bg-white/90 p-6 text-center shadow-[0_20px_50px_rgba(236,72,153,0.16)] backdrop-blur">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-pink-400 to-violet-400 text-3xl text-white shadow-[0_12px_28px_rgba(236,72,153,0.24)]">
          ♥
        </div>
        <h1 className="mt-5 text-2xl font-bold text-indigo-950">Love Mission đang chờ mạng</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Bạn đang offline, hãy kết nối mạng để đồng bộ nhiệm vụ và ký ức.
        </p>
        <button
          type="button"
          onClick={() => {
            if (typeof window !== 'undefined') {
              window.location.reload()
            }
          }}
          className="mt-6 w-full rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 px-4 py-3 text-sm font-bold text-white shadow-[0_14px_30px_rgba(236,72,153,0.24)] transition hover:from-pink-600 hover:to-rose-600 focus:outline-none focus:ring-4 focus:ring-pink-200"
        >
          Thử lại
        </button>
      </section>
    </div>
  )
}
