"use client"

import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  MediaType,
  optimizeImageFileForUpload,
  uploadMediaToStorage
} from '../lib/mediaUtils'
import { supabase } from '../lib/supabaseClient'
import Button from './ui/Button'

export interface MediaValue {
  url: string
  type: MediaType
}

interface Props {
  value: MediaValue | null
  onChange: (media: MediaValue | null) => void
  label?: string
}

type Tab = 'image' | 'video' | 'audio'

function useAudioRecorder() {
  const [recording, setRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [duration, setDuration] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const startRecording = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const recorder = new MediaRecorder(stream)
    chunksRef.current = []
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data)
    }
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
      setAudioBlob(blob)
      setAudioUrl(URL.createObjectURL(blob))
      stream.getTracks().forEach((track) => track.stop())
    }
    recorder.start(250)
    mediaRecorderRef.current = recorder
    setRecording(true)
    setDuration(0)
    timerRef.current = setInterval(() => setDuration((value) => value + 1), 1000)
  }, [])

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop()
    setRecording(false)
    if (timerRef.current) clearInterval(timerRef.current)
  }, [])

  const reset = useCallback(() => {
    if (recording) stopRecording()
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    setAudioBlob(null)
    setAudioUrl(null)
    setDuration(0)
  }, [audioUrl, recording, stopRecording])

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (audioUrl) URL.revokeObjectURL(audioUrl)
  }, [audioUrl])

  return { recording, audioBlob, audioUrl, duration, startRecording, stopRecording, reset }
}

export default function MediaUpload({ value, onChange, label = 'Đính kèm media' }: Props) {
  const [tab, setTab] = useState<Tab>('image')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const audio = useAudioRecorder()

  async function getCurrentUserId(): Promise<string> {
    const { data } = await supabase.auth.getUser()
    return data.user?.id || 'local-user'
  }

  async function handleImageFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setError(null)
    setUploading(true)
    try {
      const url = await optimizeImageFileForUpload(file)
      onChange({ url, type: 'image' })
    } catch {
      setError('Không thể xử lý ảnh này.')
    } finally {
      setUploading(false)
      event.target.value = ''
    }
  }

  async function handleVideoFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('video/')) {
      setError('Chỉ chấp nhận file video.')
      return
    }

    setError(null)
    setUploading(true)
    try {
      const userId = await getCurrentUserId()
      const { url, type } = await uploadMediaToStorage(file, userId)
      onChange({ url, type })
    } catch (err) {
      setError((err as Error).message || 'Không thể tải video lên.')
    } finally {
      setUploading(false)
      event.target.value = ''
    }
  }

  async function handleUploadAudio() {
    if (!audio.audioBlob) return
    setError(null)
    setUploading(true)
    try {
      const userId = await getCurrentUserId()
      const file = new File([audio.audioBlob], `recording-${Date.now()}.webm`, { type: 'audio/webm' })
      const { url, type } = await uploadMediaToStorage(file, userId)
      onChange({ url, type })
      audio.reset()
    } catch (err) {
      setError((err as Error).message || 'Không thể lưu âm thanh.')
    } finally {
      setUploading(false)
    }
  }

  function handleRemove() {
    onChange(null)
    audio.reset()
    setError(null)
  }

  const tabClass = (value: Tab) =>
    `flex-1 rounded-xl py-2 text-xs font-semibold transition ${
      tab === value ? 'bg-rose-500 text-white shadow-sm' : 'bg-white text-rose-700 hover:bg-rose-50'
    }`

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-rose-900">{label}</p>

      {value ? (
        <div className="relative overflow-hidden rounded-2xl border border-rose-100 bg-white shadow-sm">
          {value.type === 'image' ? <img src={value.url} alt="Preview" className="max-h-64 w-full object-cover" /> : null}
          {value.type === 'video' ? <video src={value.url} controls className="max-h-64 w-full rounded-2xl bg-black" /> : null}
          {value.type === 'audio' ? (
            <div className="p-4">
              <p className="mb-2 text-xs text-rose-600">Âm thanh đã ghi</p>
              <audio src={value.url} controls className="w-full" />
            </div>
          ) : null}
          <button
            type="button"
            onClick={handleRemove}
            className="absolute right-2 top-2 rounded-full bg-black/50 px-2 py-1 text-[11px] font-medium text-white hover:bg-black/70"
          >
            Xóa
          </button>
        </div>
      ) : (
        <>
          <div className="flex gap-1.5 rounded-2xl bg-rose-50 p-1">
            <button type="button" className={tabClass('image')} onClick={() => setTab('image')}>Ảnh</button>
            <button type="button" className={tabClass('video')} onClick={() => setTab('video')}>Video</button>
            <button type="button" className={tabClass('audio')} onClick={() => setTab('audio')}>Ghi âm</button>
          </div>

          {tab === 'image' ? (
            <div className="rounded-2xl border border-dashed border-rose-200 bg-rose-50/40 p-4">
              <p className="mb-2 text-xs text-rose-600">Chọn ảnh từ máy.</p>
              <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageFile} />
              <Button type="button" variant="secondary" className="w-full" onClick={() => imageInputRef.current?.click()} disabled={uploading}>
                {uploading ? 'Đang xử lý...' : 'Chọn ảnh'}
              </Button>
            </div>
          ) : null}

          {tab === 'video' ? (
            <div className="rounded-2xl border border-dashed border-rose-200 bg-rose-50/40 p-4">
              <p className="mb-2 text-xs text-rose-600">Chọn video từ máy, tối đa 100 MB.</p>
              <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={handleVideoFile} />
              <Button type="button" variant="secondary" className="w-full" onClick={() => videoInputRef.current?.click()} disabled={uploading}>
                {uploading ? 'Đang tải lên...' : 'Chọn video'}
              </Button>
            </div>
          ) : null}

          {tab === 'audio' ? (
            <div className="space-y-3 rounded-2xl border border-dashed border-rose-200 bg-rose-50/40 p-4">
              {!audio.audioUrl ? (
                <>
                  <p className="text-xs text-rose-600">Ghi âm trực tiếp từ trình duyệt.</p>
                  {audio.recording ? (
                    <div className="flex items-center gap-3">
                      <span className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
                      <span className="text-xs font-medium text-red-600">Đang ghi... {audio.duration}s</span>
                      <Button type="button" size="sm" onClick={audio.stopRecording}>Dừng ghi</Button>
                    </div>
                  ) : (
                    <Button type="button" variant="secondary" className="w-full" onClick={audio.startRecording}>
                      Bắt đầu ghi âm
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <p className="text-xs text-rose-600">Nghe lại trước khi lưu:</p>
                  <audio src={audio.audioUrl} controls className="w-full" />
                  <div className="flex gap-2">
                    <Button type="button" className="flex-1" onClick={handleUploadAudio} disabled={uploading}>
                      {uploading ? 'Đang lưu...' : 'Lưu âm thanh này'}
                    </Button>
                    <Button type="button" variant="secondary" onClick={audio.reset} disabled={uploading}>
                      Ghi lại
                    </Button>
                  </div>
                </>
              )}
            </div>
          ) : null}
        </>
      )}

      {uploading ? <p className="animate-pulse text-xs text-rose-500">Đang xử lý...</p> : null}
      {error ? <p className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p> : null}
    </div>
  )
}
