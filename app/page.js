'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { supabase } from '@/lib/supabase'

/* ═══════════════════════════════════════════════════
   CONSTANTS & HELPERS
   ═══════════════════════════════════════════════════ */

const STATUSES = ['Not Started', 'In Progress', 'Completed']

const STATUS_STYLE = {
  'Not Started': 'bg-zinc-700/60 text-zinc-300 ring-zinc-600/80',
  'In Progress': 'bg-amber-900/40 text-amber-300 ring-amber-700/60',
  Completed: 'bg-emerald-900/40 text-emerald-300 ring-emerald-700/60',
}

function cycleStatus(current) {
  const i = STATUSES.indexOf(current)
  return STATUSES[(i + 1) % STATUSES.length]
}

function isOverdue(lesson) {
  if (!lesson.due_date) return false
  if (lesson.script_status === 'Completed' && lesson.video_status === 'Completed') return false
  return new Date(lesson.due_date) < new Date(new Date().toDateString())
}

function fmt(d) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/* shared Tailwind class strings */
const inputCls =
  'w-full bg-[#0e0b1a] border border-purple-900/40 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition'
const labelCls = 'block text-sm font-medium text-zinc-400 mb-1'
const btnPrimary =
  'bg-purple-600 hover:bg-purple-500 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors cursor-pointer'
const btnGhost =
  'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg px-4 py-2 text-sm font-medium transition-colors cursor-pointer'
const btnDanger =
  'bg-red-900/40 hover:bg-red-800/60 text-red-300 ring-1 ring-red-700/40 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer'
const btnSmPurple =
  'bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 border border-purple-700/40 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer'

/* ═══════════════════════════════════════════════════
   ICONS (inline SVGs to avoid extra deps)
   ═══════════════════════════════════════════════════ */

function ChevronIcon({ open }) {
  return (
    <svg
      className={`w-4 h-4 transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  )
}

function PlusIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m-7-7h14" />
    </svg>
  )
}

function TrashIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  )
}

function UploadIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
    </svg>
  )
}

function DeleteButton({ onClick, title }) {
  return (
    <span
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className="text-zinc-600 hover:text-red-400 transition-colors cursor-pointer ml-1"
      title={title}
    >
      <TrashIcon />
    </span>
  )
}

/* ═══════════════════════════════════════════════════
   SMALL REUSABLE COMPONENTS
   ═══════════════════════════════════════════════════ */

function StatusBadge({ status, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`${STATUS_STYLE[status] || STATUS_STYLE['Not Started']} ring-1 px-2.5 py-0.5 rounded-full text-xs font-medium cursor-pointer hover:brightness-125 transition-all whitespace-nowrap`}
      title="Click to cycle status"
    >
      {status}
    </button>
  )
}

function SaveIndicator({ status }) {
  if (status === 'saving') return <span className="text-xs text-zinc-500 animate-pulse">Saving…</span>
  if (status === 'saved') return <span className="text-xs text-emerald-400">✓ Saved</span>
  return null
}

function SectionHeading({ icon, title, children }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-base">{icon}</span>
      <h3 className="text-sm font-semibold text-purple-300">{title}</h3>
      <div className="ml-auto flex items-center gap-2">{children}</div>
    </div>
  )
}

function Modal({ open, onClose, title, children }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#13102a] border border-purple-800/40 rounded-2xl p-6 w-full max-w-lg shadow-2xl shadow-purple-950/40 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-purple-100">{title}</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════
   CONFIRM DELETE DIALOG
   ═══════════════════════════════════════════════════ */

function ConfirmDialog({ open, name, onConfirm, onCancel, deleting }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-[#13102a] border border-red-900/40 rounded-2xl p-6 w-full max-w-sm shadow-2xl shadow-red-950/30">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-900/30 flex items-center justify-center text-red-400">
            <TrashIcon size={20} />
          </div>
          <h2 className="text-lg font-semibold text-zinc-100">Confirm Delete</h2>
        </div>
        <p className="text-sm text-zinc-400 mb-6">
          Are you sure you want to delete <strong className="text-zinc-200">{name}</strong>?
          This action cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} disabled={deleting} className={btnGhost}>
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="bg-red-600 hover:bg-red-500 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors cursor-pointer disabled:opacity-50"
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════
   DASHBOARD
   ═══════════════════════════════════════════════════ */

function Dashboard({ lessons }) {
  const stats = useMemo(() => {
    const total = lessons.length
    const scriptsDone = lessons.filter((l) => l.script_status === 'Completed').length
    const videosDone = lessons.filter((l) => l.video_status === 'Completed').length
    const inProgress = lessons.filter(
      (l) => l.script_status === 'In Progress' || l.video_status === 'In Progress',
    ).length
    const hasQuestions = lessons.filter((l) => l.has_question).length
    const overdue = lessons.filter(isOverdue).length
    return { total, scriptsDone, videosDone, inProgress, hasQuestions, overdue }
  }, [lessons])

  const cards = [
    { label: 'Total Lessons', value: stats.total, icon: '📋', border: 'border-purple-700/40' },
    { label: 'Scripts Done', value: stats.scriptsDone, icon: '📝', border: 'border-emerald-700/40' },
    { label: 'Videos Done', value: stats.videosDone, icon: '🎬', border: 'border-blue-700/40' },
    { label: 'In Progress', value: stats.inProgress, icon: '⏳', border: 'border-amber-700/40' },
    { label: 'Has Questions', value: stats.hasQuestions, icon: '❓', border: 'border-rose-700/40' },
    { label: 'Overdue', value: stats.overdue, icon: '🚨', border: 'border-red-700/40' },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
      {cards.map((c) => (
        <div
          key={c.label}
          className={`bg-[#13102a] ${c.border} border rounded-xl p-4 hover:brightness-110 transition`}
        >
          <div className="text-2xl mb-1">{c.icon}</div>
          <div className="text-2xl font-bold text-white">{c.value}</div>
          <div className="text-xs text-zinc-400 mt-1">{c.label}</div>
        </div>
      ))}
    </div>
  )
}

/* ═══════════════════════════════════════════════════
   FORM: ADD COMPANY
   ═══════════════════════════════════════════════════ */

function AddCompanyForm({ onDone }) {
  const [name, setName] = useState('')
  const [evergreen, setEvergreen] = useState(false)
  const [saving, setSaving] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    const { error } = await supabase.from('companies').insert({ name: name.trim(), is_evergreen: evergreen })
    setSaving(false)
    if (error) return console.error(error)
    onDone()
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className={labelCls}>Company Name</label>
        <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Corp" />
      </div>
      <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
        <input
          type="checkbox"
          checked={evergreen}
          onChange={(e) => setEvergreen(e.target.checked)}
          className="accent-purple-500 w-4 h-4"
        />
        Evergreen (universal training, not tied to a specific company)
      </label>
      <div className="flex justify-end gap-2 pt-2">
        <button type="submit" disabled={saving} className={btnPrimary}>
          {saving ? 'Saving…' : 'Add Company'}
        </button>
      </div>
    </form>
  )
}

/* ═══════════════════════════════════════════════════
   FORM: ADD DEPARTMENT
   ═══════════════════════════════════════════════════ */

function AddDepartmentForm({ companies, preselect, onDone }) {
  const [name, setName] = useState('')
  const [companyId, setCompanyId] = useState(preselect || '')
  const [saving, setSaving] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!name.trim() || !companyId) return
    setSaving(true)
    const { error } = await supabase.from('departments').insert({ name: name.trim(), company_id: companyId })
    setSaving(false)
    if (error) return console.error(error)
    onDone()
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className={labelCls}>Company</label>
        <select className={inputCls} value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
          <option value="">Select company…</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} {c.is_evergreen ? '🌿' : ''}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelCls}>Department Name</label>
        <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Engineering" />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="submit" disabled={saving} className={btnPrimary}>
          {saving ? 'Saving…' : 'Add Department'}
        </button>
      </div>
    </form>
  )
}

/* ═══════════════════════════════════════════════════
   FORM: ADD COURSE
   ═══════════════════════════════════════════════════ */

function AddCourseForm({ companies, departments, preselect, onDone }) {
  const [name, setName] = useState('')
  const [deptId, setDeptId] = useState(preselect || '')
  const [saving, setSaving] = useState(false)

  const grouped = useMemo(() => {
    return companies.map((c) => ({
      company: c,
      depts: departments.filter((d) => d.company_id === c.id),
    }))
  }, [companies, departments])

  const submit = async (e) => {
    e.preventDefault()
    if (!name.trim() || !deptId) return
    setSaving(true)
    const { error } = await supabase.from('courses').insert({ name: name.trim(), department_id: deptId })
    setSaving(false)
    if (error) return console.error(error)
    onDone()
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className={labelCls}>Department</label>
        <select className={inputCls} value={deptId} onChange={(e) => setDeptId(e.target.value)}>
          <option value="">Select department…</option>
          {grouped.map((g) =>
            g.depts.map((d) => (
              <option key={d.id} value={d.id}>
                {g.company.name} › {d.name}
              </option>
            )),
          )}
        </select>
      </div>
      <div>
        <label className={labelCls}>Course Name</label>
        <input
          className={inputCls}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Onboarding 101"
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="submit" disabled={saving} className={btnPrimary}>
          {saving ? 'Saving…' : 'Add Course'}
        </button>
      </div>
    </form>
  )
}

/* ═══════════════════════════════════════════════════
   FORM: ADD LESSON
   ═══════════════════════════════════════════════════ */

function AddLessonForm({ companies, departments, courses, teamMembers, preselect, onDone }) {
  const [title, setTitle] = useState('')
  const [courseId, setCourseId] = useState(preselect || '')
  const [assignedTo, setAssignedTo] = useState('')
  const [dateAssigned, setDateAssigned] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [hasQuestion, setHasQuestion] = useState(false)
  const [questionNote, setQuestionNote] = useState('')
  const [saving, setSaving] = useState(false)

  const grouped = useMemo(() => {
    return companies.flatMap((co) =>
      departments
        .filter((d) => d.company_id === co.id)
        .flatMap((d) =>
          courses
            .filter((c) => c.department_id === d.id)
            .map((c) => ({ label: `${co.name} › ${d.name} › ${c.name}`, id: c.id })),
        ),
    )
  }, [companies, departments, courses])

  const submit = async (e) => {
    e.preventDefault()
    if (!title.trim() || !courseId) return
    setSaving(true)
    const { error } = await supabase.from('lessons').insert({
      title: title.trim(),
      course_id: courseId,
      assigned_to: assignedTo || null,
      date_assigned: dateAssigned || null,
      due_date: dueDate || null,
      date_completed: null,
      script_status: 'Not Started',
      video_status: 'Not Started',
      has_question: hasQuestion,
      question_note: questionNote || null,
    })
    setSaving(false)
    if (error) return console.error(error)
    onDone()
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className={labelCls}>Course</label>
        <select className={inputCls} value={courseId} onChange={(e) => setCourseId(e.target.value)}>
          <option value="">Select course…</option>
          {grouped.map((g) => (
            <option key={g.id} value={g.id}>
              {g.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelCls}>Lesson Title</label>
        <input
          className={inputCls}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Introduction to Safety"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Assigned To</label>
          <select className={inputCls} value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
            <option value="">Unassigned</option>
            {teamMembers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Date Assigned</label>
          <input
            type="date"
            className={inputCls}
            value={dateAssigned}
            onChange={(e) => setDateAssigned(e.target.value)}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Due Date</label>
          <input type="date" className={inputCls} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
        <div className="flex items-end pb-2">
          <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
            <input
              type="checkbox"
              checked={hasQuestion}
              onChange={(e) => setHasQuestion(e.target.checked)}
              className="accent-purple-500 w-4 h-4"
            />
            Has Question
          </label>
        </div>
      </div>
      {hasQuestion && (
        <div>
          <label className={labelCls}>Question / Note</label>
          <textarea
            className={inputCls + ' resize-none'}
            rows={2}
            value={questionNote}
            onChange={(e) => setQuestionNote(e.target.value)}
            placeholder="Describe the question…"
          />
        </div>
      )}
      <div className="flex justify-end gap-2 pt-2">
        <button type="submit" disabled={saving} className={btnPrimary}>
          {saving ? 'Saving…' : 'Add Lesson'}
        </button>
      </div>
    </form>
  )
}

/* ═══════════════════════════════════════════════════
   FORM: ADD TEAM MEMBER
   ═══════════════════════════════════════════════════ */

function AddTeamMemberForm({ onDone }) {
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    const { error } = await supabase.from('team_members').insert({ name: name.trim() })
    setSaving(false)
    if (error) return console.error(error)
    onDone()
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className={labelCls}>Full Name</label>
        <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="submit" disabled={saving} className={btnPrimary}>
          {saving ? 'Saving…' : 'Add Team Member'}
        </button>
      </div>
    </form>
  )
}

/* ═══════════════════════════════════════════════════
   SCRIPT EDITOR  —  debounced auto-save
   ═══════════════════════════════════════════════════ */

function ScriptEditor({ lessonId, initialContent, onSaved }) {
  const [content, setContent] = useState(initialContent || '')
  const [saveStatus, setSaveStatus] = useState(null) // null | 'saving' | 'saved'
  const timerRef = useRef(null)

  /* clean up on unmount */
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const handleChange = (value) => {
    setContent(value)
    setSaveStatus(null)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      setSaveStatus('saving')
      const { error } = await supabase
        .from('lessons')
        .update({ script_content: value })
        .eq('id', lessonId)
      if (error) {
        console.error('Script save failed:', error)
        setSaveStatus(null)
        return
      }
      setSaveStatus('saved')
      if (onSaved) onSaved(lessonId, 'script_content', value)
      setTimeout(() => setSaveStatus((s) => (s === 'saved' ? null : s)), 2500)
    }, 1000)
  }

  return (
    <div>
      <SectionHeading icon="📝" title="Script">
        <SaveIndicator status={saveStatus} />
      </SectionHeading>
      <textarea
        className={inputCls + ' resize-y min-h-[120px] font-mono text-[13px] leading-relaxed'}
        rows={8}
        value={content}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Paste or write the lesson script here…"
      />
      <p className="text-[11px] text-zinc-600 mt-1.5">Auto-saves 1 second after you stop typing</p>
    </div>
  )
}

/* ═══════════════════════════════════════════════════
   VIDEO UPLOAD  —  Supabase Storage
   ═══════════════════════════════════════════════════ */

function VideoUpload({ lessonId, videoUrl, onSaved }) {
  const [url, setUrl] = useState(videoUrl || null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const fileRef = useRef(null)
  const intervalRef = useRef(null)

  /* sync prop when parent updates */
  useEffect(() => {
    setUrl(videoUrl || null)
  }, [videoUrl])

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  const handleUpload = async (file) => {
    if (!file) return
    setUploading(true)
    setProgress(0)

    /* simulate progress while real upload runs */
    intervalRef.current = setInterval(() => {
      setProgress((p) => {
        if (p >= 90) {
          clearInterval(intervalRef.current)
          return p
        }
        return p + Math.random() * 12
      })
    }, 250)

    const ext = file.name.split('.').pop()
    const filePath = `${lessonId}/${Date.now()}.${ext}`

    const { error } = await supabase.storage
      .from('videos')
      .upload(filePath, file, { upsert: true })

    clearInterval(intervalRef.current)

    if (error) {
      console.error('Video upload failed:', error)
      setUploading(false)
      setProgress(0)
      return
    }

    setProgress(100)

    const { data: urlData } = supabase.storage.from('videos').getPublicUrl(filePath)
    const publicUrl = urlData.publicUrl

    await supabase.from('lessons').update({ video_url: publicUrl }).eq('id', lessonId)

    setUrl(publicUrl)
    setUploading(false)
    if (onSaved) onSaved(lessonId, 'video_url', publicUrl)

    /* reset file input */
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleDelete = async () => {
    if (!url) return
    /* extract storage path from public URL */
    const marker = '/storage/v1/object/public/videos/'
    const idx = url.indexOf(marker)
    if (idx !== -1) {
      const path = decodeURIComponent(url.slice(idx + marker.length))
      await supabase.storage.from('videos').remove([path])
    }
    await supabase.from('lessons').update({ video_url: null }).eq('id', lessonId)
    setUrl(null)
    if (onSaved) onSaved(lessonId, 'video_url', null)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div>
      <SectionHeading icon="🎬" title="Video" />

      {url ? (
        <div className="space-y-3">
          <video
            src={url}
            controls
            className="w-full max-w-2xl rounded-lg border border-purple-900/30 bg-black"
          />
          <div className="flex gap-2">
            <button
              onClick={() => fileRef.current?.click()}
              className={btnSmPurple}
            >
              Replace Video
            </button>
            <button onClick={handleDelete} className={btnDanger}>
              Delete Video
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 bg-[#13102a] border border-dashed border-purple-700/40 rounded-xl px-6 py-8 w-full max-w-2xl hover:border-purple-500/60 hover:bg-purple-900/10 transition-colors cursor-pointer text-sm text-zinc-400 justify-center disabled:opacity-50"
          >
            <UploadIcon size={20} />
            {uploading ? 'Uploading…' : 'Click to upload a video file'}
          </button>

          {uploading && (
            <div className="max-w-2xl">
              <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.round(progress)}%` }}
                />
              </div>
              <p className="text-xs text-zinc-500 mt-1">{Math.round(progress)}% uploaded</p>
            </div>
          )}
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="video/*"
        hidden
        onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
      />
    </div>
  )
}

/* ═══════════════════════════════════════════════════
   QUIZ BUILDER  —  JSON in quiz_content
   ═══════════════════════════════════════════════════ */

const EMPTY_QUESTION = { question: '', options: ['', '', '', ''], correct: 0 }

function QuizBuilder({ lessonId, initialQuiz, onSaved }) {
  const [questions, setQuestions] = useState(() => {
    try {
      const parsed = typeof initialQuiz === 'string' ? JSON.parse(initialQuiz) : initialQuiz
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  })
  const [saveStatus, setSaveStatus] = useState(null)
  const timerRef = useRef(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  /* debounced save */
  const save = (qs) => {
    setSaveStatus(null)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      setSaveStatus('saving')
      const json = JSON.stringify(qs)
      const { error } = await supabase
        .from('lessons')
        .update({ quiz_content: json })
        .eq('id', lessonId)
      if (error) {
        console.error('Quiz save failed:', error)
        setSaveStatus(null)
        return
      }
      setSaveStatus('saved')
      if (onSaved) onSaved(lessonId, 'quiz_content', json)
      setTimeout(() => setSaveStatus((s) => (s === 'saved' ? null : s)), 2500)
    }, 1000)
  }

  const addQuestion = () => {
    const updated = [...questions, { ...EMPTY_QUESTION, options: ['', '', '', ''] }]
    setQuestions(updated)
    save(updated)
  }

  const removeQuestion = (index) => {
    const updated = questions.filter((_, i) => i !== index)
    setQuestions(updated)
    save(updated)
  }

  const updateQuestion = (index, field, value) => {
    const updated = questions.map((q, i) => {
      if (i !== index) return q
      if (field === 'question') return { ...q, question: value }
      if (field === 'correct') return { ...q, correct: value }
      if (field.startsWith('option_')) {
        const optIdx = parseInt(field.split('_')[1])
        const opts = [...q.options]
        opts[optIdx] = value
        return { ...q, options: opts }
      }
      return q
    })
    setQuestions(updated)
    save(updated)
  }

  return (
    <div>
      <SectionHeading icon="❓" title="Quiz Builder">
        <SaveIndicator status={saveStatus} />
        <button onClick={addQuestion} className={btnSmPurple + ' flex items-center gap-1'}>
          <PlusIcon size={12} /> Add Question
        </button>
      </SectionHeading>

      {questions.length === 0 && (
        <p className="text-xs text-zinc-600 italic py-2">No quiz questions yet — click "Add Question" to start</p>
      )}

      <div className="space-y-4">
        {questions.map((q, qi) => (
          <div key={qi} className="bg-[#0e0b1a] border border-purple-900/30 rounded-xl p-4">
            <div className="flex items-start justify-between gap-3 mb-3">
              <span className="text-xs font-bold text-purple-400 bg-purple-900/30 rounded-md px-2 py-0.5 flex-shrink-0 mt-1">
                Q{qi + 1}
              </span>
              <input
                className={inputCls + ' flex-1'}
                value={q.question}
                onChange={(e) => updateQuestion(qi, 'question', e.target.value)}
                placeholder="Enter your question…"
              />
              <button
                onClick={() => removeQuestion(qi)}
                className="text-zinc-600 hover:text-red-400 transition-colors cursor-pointer flex-shrink-0 mt-1"
                title="Remove question"
              >
                <TrashIcon size={16} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 ml-9">
              {q.options.map((opt, oi) => (
                <div key={oi} className="flex items-center gap-2">
                  <button
                    onClick={() => updateQuestion(qi, 'correct', oi)}
                    className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold cursor-pointer transition-all ring-1 ${
                      q.correct === oi
                        ? 'bg-emerald-600 text-white ring-emerald-500'
                        : 'bg-zinc-800 text-zinc-500 ring-zinc-700 hover:ring-purple-600'
                    }`}
                    title={q.correct === oi ? 'Correct answer' : 'Mark as correct'}
                  >
                    {String.fromCharCode(65 + oi)}
                  </button>
                  <input
                    className={inputCls + ' flex-1 text-xs'}
                    value={opt}
                    onChange={(e) => updateQuestion(qi, `option_${oi}`, e.target.value)}
                    placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                  />
                </div>
              ))}
            </div>
            <p className="text-[11px] text-zinc-600 mt-2 ml-9">
              Click a letter circle to mark the correct answer.
              {q.correct !== undefined && (
                <span className="text-emerald-500/70 ml-1">
                  Correct: {String.fromCharCode(65 + q.correct)}
                </span>
              )}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════
   LESSON DETAIL PANEL  —  shown when lesson is expanded
   ═══════════════════════════════════════════════════ */

function LessonDetail({ lesson, onSaved }) {
  return (
    <div className="bg-[#0b091a] border-t border-purple-900/30 px-6 py-5 space-y-8">
      <ScriptEditor
        lessonId={lesson.id}
        initialContent={lesson.script_content || ''}
        onSaved={onSaved}
      />
      <VideoUpload
        lessonId={lesson.id}
        videoUrl={lesson.video_url}
        onSaved={onSaved}
      />
      <QuizBuilder
        lessonId={lesson.id}
        initialQuiz={lesson.quiz_content}
        onSaved={onSaved}
      />
    </div>
  )
}

/* ═══════════════════════════════════════════════════
   LESSON ROW  —  expandable with detail panel
   ═══════════════════════════════════════════════════ */

function LessonRow({ lesson, teamMembers, onCycleStatus, onToggleQuestion, onDelete, isExpanded, onToggleExpand, onSaved }) {
  const member = teamMembers.find((t) => t.id === lesson.assigned_to)
  const overdue = isOverdue(lesson)

  return (
    <>
      <tr className={`border-b border-purple-900/20 hover:bg-purple-900/10 transition-colors ${overdue ? 'bg-red-950/20' : ''} ${isExpanded ? 'bg-purple-900/15 border-b-0' : ''}`}>
        <td className="py-2.5 px-3 text-sm text-zinc-100 font-medium">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggleExpand(lesson.id)}
              className="flex-shrink-0 text-zinc-500 hover:text-purple-400 transition-colors cursor-pointer"
              title={isExpanded ? 'Collapse' : 'Expand to edit script, video & quiz'}
            >
              <ChevronIcon open={isExpanded} />
            </button>
            <span
              className="cursor-pointer hover:text-purple-300 transition-colors"
              onClick={() => onToggleExpand(lesson.id)}
            >
              {lesson.title}
            </span>
            {overdue && (
              <span className="text-[10px] bg-red-900/60 text-red-300 ring-1 ring-red-700/60 rounded-full px-1.5 py-0.5 font-medium">
                OVERDUE
              </span>
            )}
            {lesson.video_url && (
              <span className="text-[10px] bg-blue-900/40 text-blue-300 ring-1 ring-blue-700/50 rounded-full px-1.5 py-0.5 font-medium" title="Has video">
                🎬
              </span>
            )}
            {lesson.quiz_content && (() => {
              try {
                const q = typeof lesson.quiz_content === 'string' ? JSON.parse(lesson.quiz_content) : lesson.quiz_content
                return Array.isArray(q) && q.length > 0
              } catch { return false }
            })() && (
              <span className="text-[10px] bg-purple-900/40 text-purple-300 ring-1 ring-purple-700/50 rounded-full px-1.5 py-0.5 font-medium" title="Has quiz">
                Q
              </span>
            )}
          </div>
        </td>
        <td className="py-2.5 px-3 text-sm text-zinc-400">{member?.name || '—'}</td>
        <td className="py-2.5 px-3 text-sm text-zinc-500 whitespace-nowrap">{fmt(lesson.date_assigned)}</td>
        <td className="py-2.5 px-3 text-sm text-zinc-500 whitespace-nowrap">{fmt(lesson.due_date)}</td>
        <td className="py-2.5 px-3 text-sm text-zinc-500 whitespace-nowrap">{fmt(lesson.date_completed)}</td>
        <td className="py-2.5 px-3">
          <StatusBadge status={lesson.script_status} onClick={() => onCycleStatus(lesson.id, 'script_status', lesson.script_status)} />
        </td>
        <td className="py-2.5 px-3">
          <StatusBadge status={lesson.video_status} onClick={() => onCycleStatus(lesson.id, 'video_status', lesson.video_status)} />
        </td>
        <td className="py-2.5 px-3 text-center">
          <button
            onClick={() => onToggleQuestion(lesson.id, !lesson.has_question)}
            className={`w-6 h-6 rounded-md text-xs font-bold cursor-pointer transition-colors ${
              lesson.has_question
                ? 'bg-rose-900/50 text-rose-300 ring-1 ring-rose-700/50'
                : 'bg-zinc-800 text-zinc-600 ring-1 ring-zinc-700/50'
            }`}
            title={lesson.has_question ? (lesson.question_note || 'Has question') : 'No question'}
          >
            ?
          </button>
        </td>
        <td className="py-2.5 px-3 text-sm text-zinc-500 max-w-[180px] truncate" title={lesson.question_note || ''}>
          {lesson.question_note || '—'}
        </td>
        <td className="py-2.5 px-3 text-center">
          <button
            onClick={() => onDelete(lesson.id, lesson.title)}
            className="text-zinc-600 hover:text-red-400 transition-colors cursor-pointer"
            title="Delete lesson"
          >
            <TrashIcon />
          </button>
        </td>
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={10} className="p-0">
            <LessonDetail lesson={lesson} onSaved={onSaved} />
          </td>
        </tr>
      )}
    </>
  )
}

/* ═══════════════════════════════════════════════════
   LESSON TABLE HEADER
   ═══════════════════════════════════════════════════ */

function LessonTableHead() {
  const th = 'py-2 px-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-left whitespace-nowrap'
  return (
    <thead>
      <tr className="border-b border-purple-900/30">
        <th className={th}>Title</th>
        <th className={th}>Assigned To</th>
        <th className={th}>Assigned</th>
        <th className={th}>Due</th>
        <th className={th}>Completed</th>
        <th className={th}>Script</th>
        <th className={th}>Video</th>
        <th className={th + ' text-center'}>Q?</th>
        <th className={th}>Note</th>
        <th className={th + ' w-10'}></th>
      </tr>
    </thead>
  )
}

/* ═══════════════════════════════════════════════════
   MAIN PAGE COMPONENT
   ═══════════════════════════════════════════════════ */

export default function Home() {
  /* ─── state ─── */
  const [companies, setCompanies] = useState([])
  const [departments, setDepartments] = useState([])
  const [courses, setCourses] = useState([])
  const [lessons, setLessons] = useState([])
  const [teamMembers, setTeamMembers] = useState([])
  const [loading, setLoading] = useState(true)

  // modal: null | { type: 'company'|'department'|'course'|'lesson'|'team', parentId?: string }
  const [modal, setModal] = useState(null)

  // confirm delete: null | { type, id, name }
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  // expand / collapse  –  { companies: {}, departments: {}, courses: {}, lessons: {} }
  const [exp, setExp] = useState({ companies: {}, departments: {}, courses: {}, lessons: {} })

  /* ─── data fetching ─── */
  const fetchAll = async () => {
    setLoading(true)
    const [co, dep, crs, les, tm] = await Promise.all([
      supabase.from('companies').select('*').order('name'),
      supabase.from('departments').select('*').order('name'),
      supabase.from('courses').select('*').order('name'),
      supabase.from('lessons').select('*').order('title'),
      supabase.from('team_members').select('*').order('name'),
    ])
    setCompanies(co.data || [])
    setDepartments(dep.data || [])
    setCourses(crs.data || [])
    setLessons(les.data || [])
    setTeamMembers(tm.data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchAll()
  }, [])

  /* ─── expand / collapse helpers ─── */
  const toggle = (level, id) =>
    setExp((prev) => ({
      ...prev,
      [level]: { ...prev[level], [id]: !prev[level][id] },
    }))

  const expandAll = () => {
    const c = {}; const d = {}; const cr = {}
    companies.forEach((x) => (c[x.id] = true))
    departments.forEach((x) => (d[x.id] = true))
    courses.forEach((x) => (cr[x.id] = true))
    setExp({ companies: c, departments: d, courses: cr, lessons: {} })
  }

  const collapseAll = () => setExp({ companies: {}, departments: {}, courses: {}, lessons: {} })

  /* ─── update lesson field locally (for child component saves) ─── */
  const updateLessonLocally = (lessonId, field, value) => {
    setLessons((prev) => prev.map((l) => (l.id === lessonId ? { ...l, [field]: value } : l)))
  }

  /* ─── lesson mutations (optimistic) ─── */
  const cycleStatusHandler = async (lessonId, field, current) => {
    const next = cycleStatus(current)
    const updates = { [field]: next }

    const lesson = lessons.find((l) => l.id === lessonId)
    if (lesson) {
      const otherField = field === 'script_status' ? 'video_status' : 'script_status'
      if (next === 'Completed' && lesson[otherField] === 'Completed') {
        updates.date_completed = new Date().toISOString().split('T')[0]
      } else if (next !== 'Completed' && lesson.date_completed) {
        updates.date_completed = null
      }
    }

    setLessons((prev) => prev.map((l) => (l.id === lessonId ? { ...l, ...updates } : l)))

    const { error } = await supabase.from('lessons').update(updates).eq('id', lessonId)
    if (error) {
      console.error('Status update failed:', error)
      fetchAll()
    }
  }

  const toggleQuestion = async (lessonId, value) => {
    setLessons((prev) => prev.map((l) => (l.id === lessonId ? { ...l, has_question: value } : l)))
    const { error } = await supabase.from('lessons').update({ has_question: value }).eq('id', lessonId)
    if (error) {
      console.error('Toggle question failed:', error)
      fetchAll()
    }
  }

  /* ─── delete handlers ─── */
  const requestDelete = (type, id, name) => setConfirmDelete({ type, id, name })

  const handleDelete = async () => {
    if (!confirmDelete) return
    setDeleting(true)
    const { type, id } = confirmDelete

    try {
      if (type === 'company') {
        const deptIds = departments.filter((d) => d.company_id === id).map((d) => d.id)
        const courseIds = courses.filter((c) => deptIds.includes(c.department_id)).map((c) => c.id)
        if (courseIds.length) await supabase.from('lessons').delete().in('course_id', courseIds)
        if (deptIds.length) await supabase.from('courses').delete().in('department_id', deptIds)
        await supabase.from('departments').delete().eq('company_id', id)
        await supabase.from('companies').delete().eq('id', id)
      } else if (type === 'department') {
        const courseIds = courses.filter((c) => c.department_id === id).map((c) => c.id)
        if (courseIds.length) await supabase.from('lessons').delete().in('course_id', courseIds)
        await supabase.from('courses').delete().eq('department_id', id)
        await supabase.from('departments').delete().eq('id', id)
      } else if (type === 'course') {
        await supabase.from('lessons').delete().eq('course_id', id)
        await supabase.from('courses').delete().eq('id', id)
      } else if (type === 'lesson') {
        await supabase.from('lessons').delete().eq('id', id)
      }
    } catch (err) {
      console.error('Delete failed:', err)
    }

    setDeleting(false)
    setConfirmDelete(null)
    fetchAll()
  }

  /* ─── modal done callback ─── */
  const modalDone = () => {
    setModal(null)
    fetchAll()
  }

  const modalTitles = {
    company: 'Add Company',
    department: 'Add Department',
    course: 'Add Course',
    lesson: 'Add Lesson',
    team: 'Add Team Member',
  }

  /* ─── helpers for hierarchy ─── */
  const deptsFor = (companyId) => departments.filter((d) => d.company_id === companyId)
  const coursesFor = (deptId) => courses.filter((c) => c.department_id === deptId)
  const lessonsFor = (courseId) => lessons.filter((l) => l.course_id === courseId)

  /* ─── render ─── */
  return (
    <div className="min-h-screen bg-[#09071a] text-zinc-100">
      {/* ── HEADER ── */}
      <header className="sticky top-0 z-40 bg-[#09071a]/80 backdrop-blur-md border-b border-purple-900/30">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-9 h-9 rounded-lg bg-purple-600 flex items-center justify-center text-lg font-bold">
              M
            </div>
            <div>
              <h1 className="text-lg font-bold text-white leading-tight">Mentra Video Catalog</h1>
              <p className="text-xs text-zinc-500">Production Tracker</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              { type: 'company', label: 'Company' },
              { type: 'department', label: 'Department' },
              { type: 'course', label: 'Course' },
              { type: 'lesson', label: 'Lesson' },
              { type: 'team', label: 'Team Member' },
            ].map((b) => (
              <button
                key={b.type}
                onClick={() => setModal({ type: b.type })}
                className="flex items-center gap-1.5 bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 border border-purple-700/40 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer"
              >
                <PlusIcon size={12} />
                {b.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ── BODY ── */}
      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-zinc-500">Loading catalog…</p>
            </div>
          </div>
        ) : (
          <>
            <Dashboard lessons={lessons} />

            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Catalog</h2>
              <div className="flex gap-2">
                <button onClick={expandAll} className="text-xs text-purple-400 hover:text-purple-300 transition-colors cursor-pointer">
                  Expand All
                </button>
                <span className="text-zinc-700">|</span>
                <button onClick={collapseAll} className="text-xs text-purple-400 hover:text-purple-300 transition-colors cursor-pointer">
                  Collapse All
                </button>
              </div>
            </div>

            {companies.length === 0 && (
              <div className="text-center py-20 text-zinc-600">
                <p className="text-lg mb-2">No companies yet</p>
                <p className="text-sm">Click <strong className="text-purple-400">+ Company</strong> above to get started.</p>
              </div>
            )}

            {/* ── COMPANY LEVEL ── */}
            <div className="space-y-3">
              {companies.map((company) => {
                const companyDepts = deptsFor(company.id)
                const companyLessons = companyDepts.flatMap((d) =>
                  coursesFor(d.id).flatMap((c) => lessonsFor(c.id)),
                )
                const companyOpen = !!exp.companies[company.id]

                return (
                  <div key={company.id} className="border border-purple-900/30 rounded-xl overflow-hidden bg-[#0e0c1e]">
                    <button
                      onClick={() => toggle('companies', company.id)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-purple-900/10 transition-colors cursor-pointer"
                    >
                      <ChevronIcon open={companyOpen} />
                      <span className="font-semibold text-white">{company.name}</span>
                      {company.is_evergreen && (
                        <span className="bg-emerald-900/40 text-emerald-400 ring-1 ring-emerald-700/50 text-[10px] font-semibold rounded-full px-2 py-0.5">
                          🌿 EVERGREEN
                        </span>
                      )}
                      <span className="ml-auto text-xs text-zinc-600">
                        {companyDepts.length} dept{companyDepts.length !== 1 && 's'} · {companyLessons.length} lesson{companyLessons.length !== 1 && 's'}
                      </span>
                      <span
                        onClick={(e) => {
                          e.stopPropagation()
                          setModal({ type: 'department', parentId: company.id })
                        }}
                        className="text-purple-500/60 hover:text-purple-400 transition-colors ml-2"
                        title="Add department to this company"
                      >
                        <PlusIcon size={14} />
                      </span>
                      <DeleteButton onClick={() => requestDelete('company', company.id, company.name)} title="Delete company" />
                    </button>

                    {companyOpen && (
                      <div className="border-t border-purple-900/20">
                        {companyDepts.length === 0 && (
                          <p className="px-8 py-4 text-xs text-zinc-600 italic">No departments yet — click + to add one</p>
                        )}

                        {companyDepts.map((dept) => {
                          const deptCourses = coursesFor(dept.id)
                          const deptLessons = deptCourses.flatMap((c) => lessonsFor(c.id))
                          const deptOpen = !!exp.departments[dept.id]

                          return (
                            <div key={dept.id} className="border-b border-purple-900/10 last:border-b-0">
                              <button
                                onClick={() => toggle('departments', dept.id)}
                                className="w-full flex items-center gap-3 px-8 py-2.5 hover:bg-purple-900/10 transition-colors cursor-pointer"
                              >
                                <ChevronIcon open={deptOpen} />
                                <span className="font-medium text-purple-200 text-sm">{dept.name}</span>
                                <span className="ml-auto text-xs text-zinc-600">
                                  {deptCourses.length} course{deptCourses.length !== 1 && 's'} · {deptLessons.length} lesson{deptLessons.length !== 1 && 's'}
                                </span>
                                <span
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setModal({ type: 'course', parentId: dept.id })
                                  }}
                                  className="text-purple-500/60 hover:text-purple-400 transition-colors ml-2"
                                  title="Add course to this department"
                                >
                                  <PlusIcon size={14} />
                                </span>
                                <DeleteButton onClick={() => requestDelete('department', dept.id, dept.name)} title="Delete department" />
                              </button>

                              {deptOpen && (
                                <div>
                                  {deptCourses.length === 0 && (
                                    <p className="px-14 py-3 text-xs text-zinc-600 italic">No courses yet</p>
                                  )}

                                  {deptCourses.map((course) => {
                                    const cLessons = lessonsFor(course.id)
                                    const courseOpen = !!exp.courses[course.id]

                                    return (
                                      <div key={course.id} className="border-t border-purple-900/10">
                                        <button
                                          onClick={() => toggle('courses', course.id)}
                                          className="w-full flex items-center gap-3 px-14 py-2 hover:bg-purple-900/10 transition-colors cursor-pointer"
                                        >
                                          <ChevronIcon open={courseOpen} />
                                          <span className="font-medium text-purple-300/80 text-sm">{course.name}</span>
                                          <span className="ml-auto text-xs text-zinc-600">
                                            {cLessons.length} lesson{cLessons.length !== 1 && 's'}
                                          </span>
                                          <span
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              setModal({ type: 'lesson', parentId: course.id })
                                            }}
                                            className="text-purple-500/60 hover:text-purple-400 transition-colors ml-2"
                                            title="Add lesson to this course"
                                          >
                                            <PlusIcon size={14} />
                                          </span>
                                          <DeleteButton onClick={() => requestDelete('course', course.id, course.name)} title="Delete course" />
                                        </button>

                                        {courseOpen && (
                                          <div className="px-14 pb-3">
                                            {cLessons.length === 0 ? (
                                              <p className="pl-7 py-2 text-xs text-zinc-600 italic">No lessons yet</p>
                                            ) : (
                                              <div className="overflow-x-auto rounded-lg border border-purple-900/20 bg-[#0a0818]">
                                                <table className="w-full min-w-[860px]">
                                                  <LessonTableHead />
                                                  <tbody>
                                                    {cLessons.map((lesson) => (
                                                      <LessonRow
                                                        key={lesson.id}
                                                        lesson={lesson}
                                                        teamMembers={teamMembers}
                                                        onCycleStatus={cycleStatusHandler}
                                                        onToggleQuestion={toggleQuestion}
                                                        onDelete={(id, title) => requestDelete('lesson', id, title)}
                                                        isExpanded={!!exp.lessons[lesson.id]}
                                                        onToggleExpand={(id) => toggle('lessons', id)}
                                                        onSaved={updateLessonLocally}
                                                      />
                                                    ))}
                                                  </tbody>
                                                </table>
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </main>

      {/* ── MODALS ── */}
      <Modal open={!!modal} onClose={() => setModal(null)} title={modal ? modalTitles[modal.type] : ''}>
        {modal?.type === 'company' && <AddCompanyForm onDone={modalDone} />}
        {modal?.type === 'department' && (
          <AddDepartmentForm companies={companies} preselect={modal.parentId} onDone={modalDone} />
        )}
        {modal?.type === 'course' && (
          <AddCourseForm companies={companies} departments={departments} preselect={modal.parentId} onDone={modalDone} />
        )}
        {modal?.type === 'lesson' && (
          <AddLessonForm
            companies={companies}
            departments={departments}
            courses={courses}
            teamMembers={teamMembers}
            preselect={modal.parentId}
            onDone={modalDone}
          />
        )}
        {modal?.type === 'team' && <AddTeamMemberForm onDone={modalDone} />}
      </Modal>

      <ConfirmDialog
        open={!!confirmDelete}
        name={confirmDelete?.name || ''}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
        deleting={deleting}
      />
    </div>
  )
}
