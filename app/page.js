'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

/* ═══════════════════════════════════════════════════
   CONSTANTS & HELPERS
   ═══════════════════════════════════════════════════ */

const STATUSES = ['Not Started', 'In Progress', 'Completed']

const STATUS_STYLE = {
  'Not Started': 'bg-zinc-700/60 text-zinc-200 ring-zinc-600/80',
  'In Progress': 'bg-amber-900/50 text-amber-200 ring-amber-600/70',
  Completed: 'bg-emerald-900/50 text-emerald-200 ring-emerald-600/70',
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

function UsersIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" strokeLinecap="round" strokeLinejoin="round" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </svg>
  )
}

function BellIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
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
   INLINE EDIT  —  pencil icon to rename
   ═══════════════════════════════════════════════════ */

function PencilIcon({ size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

function CheckIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
}

function XIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 6L6 18M6 6l12 12" />
    </svg>
  )
}

function InlineEdit({ value, onSave, className = '' }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef(null)

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  const commit = () => {
    const trimmed = draft.trim()
    if (trimmed && trimmed !== value) {
      onSave(trimmed)
    }
    setEditing(false)
  }

  const cancel = () => {
    setDraft(value)
    setEditing(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); commit() }
    if (e.key === 'Escape') { e.preventDefault(); cancel() }
  }

  if (editing) {
    return (
      <span className="inline-flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          className={`bg-[#0e0b1a] border border-purple-500/50 rounded px-2 py-0.5 text-sm text-zinc-100 outline-none focus:ring-2 focus:ring-purple-500/40 ${className}`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          onClick={commit}
          className="text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
          title="Save"
        >
          <CheckIcon />
        </button>
        <button
          onClick={cancel}
          className="text-zinc-500 hover:text-red-400 transition-colors cursor-pointer"
          title="Cancel"
        >
          <XIcon />
        </button>
      </span>
    )
  }

  return (
    <span className="group/edit inline-flex items-center gap-1.5">
      <span className={className}>{value}</span>
      <span
        role="button"
        tabIndex={0}
        onClick={(e) => {
          e.stopPropagation()
          setDraft(value)
          setEditing(true)
        }}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); setDraft(value); setEditing(true) } }}
        className="text-zinc-700 opacity-0 group-hover/edit:opacity-100 hover:!text-purple-400 transition-all cursor-pointer"
        title="Edit name"
      >
        <PencilIcon />
      </span>
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
      className={`${STATUS_STYLE[status] || STATUS_STYLE['Not Started']} ring-1 px-3 py-1 rounded-full text-[0.8rem] font-semibold cursor-pointer hover:brightness-125 transition-all whitespace-nowrap`}
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
   NOTIFICATION DROPDOWN
   ═══════════════════════════════════════════════════ */

function NotificationDropdown({ notifications, onMarkRead, onClose }) {
  const dropdownRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 top-full mt-2 w-80 bg-[#13102a] border border-purple-800/40 rounded-xl shadow-2xl shadow-purple-950/50 z-50 overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-purple-900/30">
        <h3 className="text-sm font-semibold text-purple-200">Notifications</h3>
        {notifications.some((n) => !n.is_read) && (
          <button
            onClick={() => notifications.filter((n) => !n.is_read).forEach((n) => onMarkRead(n.id))}
            className="text-[11px] text-purple-400 hover:text-purple-300 transition-colors cursor-pointer"
          >
            Mark all read
          </button>
        )}
      </div>
      <div className="max-h-80 overflow-y-auto">
        {notifications.length === 0 ? (
          <p className="text-xs text-zinc-600 text-center py-8">No notifications yet</p>
        ) : (
          notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => !n.is_read && onMarkRead(n.id)}
              className={`w-full text-left px-4 py-3 border-b border-purple-900/10 last:border-b-0 transition-colors cursor-pointer ${
                n.is_read
                  ? 'bg-transparent hover:bg-purple-900/5'
                  : 'bg-purple-900/10 hover:bg-purple-900/20'
              }`}
            >
              <div className="flex items-start gap-2.5">
                {!n.is_read && (
                  <span className="w-2 h-2 rounded-full bg-purple-500 flex-shrink-0 mt-1.5" />
                )}
                <div className={!n.is_read ? '' : 'ml-[18px]'}>
                  <p className={`text-xs leading-relaxed ${n.is_read ? 'text-zinc-500' : 'text-zinc-300'}`}>
                    {n.message}
                  </p>
                  <p className="text-[10px] text-zinc-600 mt-1">
                    {new Date(n.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
          </p>
        </div>
              </div>
            </button>
          ))
        )}
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
   CELEBRATION ANIMATION
   ═══════════════════════════════════════════════════ */

const CELEBRATION_MESSAGES = [
  'Awesome! 🎉',
  'Rocking it! 🎸',
  "You're the best! ⭐",
  'Nailed it! 💪',
  'Superstar! 🌟',
  'Way to go! 🚀',
  'Incredible! 🔥',
  'Legend! 👑',
]

const MILESTONE_MESSAGES = {
  5: "Whoa! 5 projects done??? That's amazing! 🤯",
  10: "10 DONE?! You're an absolute machine! 🏆",
  15: "15!! Is there anything you CAN'T do?! 👑",
  20: 'You deserve a raise! 💰',
  25: "25! You're literally a legend! 🐐",
}

const MILESTONE_EMOJIS = ['🤯', '🏆', '👑', '💰', '🐐']

function getMilestoneMessage(count) {
  if (MILESTONE_MESSAGES[count]) return MILESTONE_MESSAGES[count]
  /* for 30, 35, 40… pick a random milestone message */
  const keys = Object.keys(MILESTONE_MESSAGES)
  return MILESTONE_MESSAGES[keys[Math.floor(Math.random() * keys.length)]].replace(/\d+/, String(count))
}

const CONFETTI_COLORS = ['#a78bfa', '#c084fc', '#e879f9', '#f472b6', '#34d399', '#fbbf24', '#60a5fa', '#f87171']
const CONFETTI_COLORS_MEGA = ['#a78bfa', '#c084fc', '#e879f9', '#f472b6', '#34d399', '#fbbf24', '#60a5fa', '#f87171', '#fde68a', '#a3e635', '#22d3ee', '#fb923c']

function CelebrationPopup({ visible, onDone, milestone }) {
  const isMilestone = !!milestone
  const [message] = useState(() =>
    isMilestone
      ? getMilestoneMessage(milestone)
      : CELEBRATION_MESSAGES[Math.floor(Math.random() * CELEBRATION_MESSAGES.length)],
  )
  const [emoji] = useState(() =>
    isMilestone
      ? MILESTONE_EMOJIS[Math.floor(Math.random() * MILESTONE_EMOJIS.length)]
      : '🎉',
  )

  const particleCount = isMilestone ? 90 : 40
  const colors = isMilestone ? CONFETTI_COLORS_MEGA : CONFETTI_COLORS
  const duration = isMilestone ? 4800 : 2800
  const fadeOutDelay = isMilestone ? 3.8 : 2.2

  const [confetti] = useState(() =>
    Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * (isMilestone ? 1.0 : 0.6),
      duration: (isMilestone ? 1.8 : 1.2) + Math.random() * (isMilestone ? 1.8 : 1.2),
      size: (isMilestone ? 5 : 4) + Math.random() * (isMilestone ? 9 : 6),
      color: colors[Math.floor(Math.random() * colors.length)],
      drift: (Math.random() - 0.5) * (isMilestone ? 120 : 60),
      rotation: Math.random() * 360,
    })),
  )

  useEffect(() => {
    if (!visible) return
    const t = setTimeout(() => onDone(), duration)
    return () => clearTimeout(t)
  }, [visible, onDone, duration])

  if (!visible) return null

  return (
    <div
      className="fixed inset-0 z-[9999] pointer-events-none flex items-end justify-center pb-12"
      style={isMilestone ? { animation: 'cel-screen-shake 0.5s 0.2s ease-in-out 2' } : undefined}
    >
      {/* Inline keyframes */}
      <style>{`
        @keyframes cel-bounce-in {
          0% { opacity: 0; transform: translateY(120px) scale(0.3); }
          60% { opacity: 1; transform: translateY(-15px) scale(1.05); }
          80% { transform: translateY(5px) scale(0.97); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes cel-bounce-in-mega {
          0% { opacity: 0; transform: translateY(200px) scale(0.2); }
          50% { opacity: 1; transform: translateY(-30px) scale(1.15); }
          70% { transform: translateY(10px) scale(0.95); }
          85% { transform: translateY(-8px) scale(1.05); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes cel-fade-out {
          0% { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(60px) scale(0.7); }
        }
        @keyframes cel-wiggle {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-12deg); }
          75% { transform: rotate(12deg); }
        }
        @keyframes cel-wiggle-mega {
          0%, 100% { transform: rotate(0deg) scale(1); }
          15% { transform: rotate(-18deg) scale(1.1); }
          30% { transform: rotate(18deg) scale(0.95); }
          45% { transform: rotate(-14deg) scale(1.08); }
          60% { transform: rotate(14deg) scale(0.97); }
          75% { transform: rotate(-8deg) scale(1.03); }
          90% { transform: rotate(8deg) scale(1); }
        }
        @keyframes cel-confetti {
          0% { opacity: 1; transform: translateY(0) translateX(0) rotate(0deg); }
          100% { opacity: 0; transform: translateY(85vh) translateX(var(--cel-drift)) rotate(720deg); }
        }
        @keyframes cel-screen-shake {
          0%, 100% { transform: translate(0, 0); }
          10% { transform: translate(-4px, -2px); }
          20% { transform: translate(4px, 2px); }
          30% { transform: translate(-3px, 3px); }
          40% { transform: translate(3px, -3px); }
          50% { transform: translate(-2px, 2px); }
          60% { transform: translate(2px, -1px); }
          70% { transform: translate(-1px, 1px); }
          80% { transform: translate(1px, -1px); }
          90% { transform: translate(-1px, 0px); }
        }
        @keyframes cel-glow-pulse {
          0%, 100% { box-shadow: 0 0 20px rgba(168, 85, 247, 0.4), 0 0 40px rgba(168, 85, 247, 0.1); }
          50% { box-shadow: 0 0 40px rgba(168, 85, 247, 0.7), 0 0 80px rgba(168, 85, 247, 0.3), 0 0 120px rgba(168, 85, 247, 0.1); }
        }
      `}</style>

      {/* Confetti */}
      {confetti.map((c) => (
        <div
          key={c.id}
          className="absolute"
          style={{
            left: `${c.x}%`,
            top: '-10px',
            width: c.size,
            height: c.size * 1.4,
            backgroundColor: c.color,
            borderRadius: c.size < 7 ? '50%' : '2px',
            opacity: 0,
            '--cel-drift': `${c.drift}px`,
            animation: `cel-confetti ${c.duration}s ${c.delay}s ease-out forwards`,
          }}
        />
      ))}

      {/* Bouncing character + speech bubble */}
      <div
        className="flex flex-col items-center"
        style={{
          animation: `${isMilestone ? 'cel-bounce-in-mega 0.7s' : 'cel-bounce-in 0.5s'} cubic-bezier(0.34, 1.56, 0.64, 1) forwards, cel-fade-out 0.6s ${fadeOutDelay}s ease-in forwards`,
        }}
      >
        {/* Speech bubble */}
        <div
          className={`border rounded-2xl relative ${
            isMilestone
              ? 'bg-gradient-to-br from-[#2a1860] to-[#1e1640] border-purple-400/70 px-7 py-5 mb-3 shadow-2xl'
              : 'bg-[#1e1640] border-purple-500/50 px-5 py-3 mb-2 shadow-lg shadow-purple-900/50'
          }`}
          style={isMilestone ? { animation: 'cel-glow-pulse 1s ease-in-out infinite' } : undefined}
        >
          <p className={`font-bold text-white ${isMilestone ? 'text-2xl max-w-xs text-center leading-snug' : 'text-lg whitespace-nowrap'}`}>
            {message}
          </p>
          {isMilestone && (
            <p className="text-center text-sm text-purple-300 mt-1.5 font-semibold">🎯 Milestone reached!</p>
          )}
          {/* Bubble arrow */}
          <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 rotate-45 border-r border-b ${
            isMilestone ? 'bg-[#1e1640] border-purple-400/70' : 'bg-[#1e1640] border-purple-500/50'
          }`} />
        </div>
        {/* Character */}
        <div
          className={`select-none ${isMilestone ? 'text-8xl' : 'text-5xl'}`}
          style={{ animation: `${isMilestone ? 'cel-wiggle-mega 0.8s 0.3s ease-in-out 4' : 'cel-wiggle 0.4s 0.3s ease-in-out 3'}` }}
        >
          {emoji}
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
    const approved = lessons.filter((l) => l.approved).length
    return { total, scriptsDone, videosDone, inProgress, hasQuestions, overdue, approved }
  }, [lessons])

  const cards = [
    { label: 'Total Lessons', value: stats.total, icon: '📋', border: 'border-purple-700/40' },
    { label: 'Scripts Done', value: stats.scriptsDone, icon: '📝', border: 'border-emerald-700/40' },
    { label: 'Videos Done', value: stats.videosDone, icon: '🎬', border: 'border-blue-700/40' },
    { label: 'In Progress', value: stats.inProgress, icon: '⏳', border: 'border-amber-700/40' },
    { label: 'Approved', value: stats.approved, icon: '✅', border: 'border-green-700/40' },
    { label: 'Has Questions', value: stats.hasQuestions, icon: '❓', border: 'border-rose-700/40' },
    { label: 'Overdue', value: stats.overdue, icon: '🚨', border: 'border-red-700/40' },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-8">
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

function AddLessonForm({ companies, departments, courses, teamMembers, preselect, onDone, onAssigned }) {
  const [title, setTitle] = useState('')
  const [courseId, setCourseId] = useState(preselect || '')
  const [assignedTo, setAssignedTo] = useState('')
  const [dateAssigned, setDateAssigned] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [scriptStatus, setScriptStatus] = useState('Not Started')
  const [videoStatus, setVideoStatus] = useState('Not Started')
  const [dateCompleted, setDateCompleted] = useState('')
  /* derived flags for conditional UI */
  const eitherCompleted = scriptStatus === 'Completed' || videoStatus === 'Completed'
  const bothCompleted = scriptStatus === 'Completed' && videoStatus === 'Completed'

  /* auto-set Date Completed to today when both statuses become Completed */
  const handleScriptStatus = (val) => {
    setScriptStatus(val)
    if (val === 'Completed' && videoStatus === 'Completed' && !dateCompleted) {
      setDateCompleted(new Date().toISOString().split('T')[0])
    }
  }
  const handleVideoStatus = (val) => {
    setVideoStatus(val)
    if (val === 'Completed' && scriptStatus === 'Completed' && !dateCompleted) {
      setDateCompleted(new Date().toISOString().split('T')[0])
    }
  }
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
      date_completed: dateCompleted || null,
      script_status: scriptStatus,
      video_status: videoStatus,
      has_question: false,
      question_note: null,
    })
    setSaving(false)
    if (error) return console.error(error)
    /* notify if assigned */
    if (assignedTo && onAssigned) {
      onAssigned(assignedTo, title.trim(), courseId)
    }
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
      {/* ── Status dropdowns (always visible) ── */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Script Status</label>
          <select className={inputCls} value={scriptStatus} onChange={(e) => handleScriptStatus(e.target.value)}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Video Status</label>
          <select className={inputCls} value={videoStatus} onChange={(e) => handleVideoStatus(e.target.value)}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Conditional fields based on status ── */}
      {!eitherCompleted && (
        <>
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
          <div>
            <label className={labelCls}>Due Date</label>
            <input type="date" className={inputCls} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        </>
      )}

      {bothCompleted && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Completed By</label>
            <select className={inputCls} value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
              <option value="">Select team member…</option>
              {teamMembers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Date Completed</label>
            <input type="date" className={inputCls} value={dateCompleted} onChange={(e) => setDateCompleted(e.target.value)} />
          </div>
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
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    const { error } = await supabase.from('team_members').insert({
      name: name.trim(),
      email: email.trim() || null,
    })
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
      <div>
        <label className={labelCls}>Email</label>
        <input
          type="email"
          className={inputCls}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="jane@company.com"
        />
        <p className="text-[11px] text-zinc-600 mt-1">Used for assignment notifications</p>
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
   MANAGE TEAM MODAL CONTENT
   ═══════════════════════════════════════════════════ */

function ManageTeamList({ teamMembers, onDelete }) {
  return (
    <div className="space-y-1">
      {teamMembers.length === 0 ? (
        <p className="text-sm text-zinc-600 text-center py-6">No team members yet.</p>
      ) : (
        teamMembers.map((t) => (
          <div
            key={t.id}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-purple-900/10 transition-colors group"
          >
            <div className="w-8 h-8 rounded-full bg-purple-900/40 flex items-center justify-center text-xs font-bold text-purple-300 flex-shrink-0">
              {t.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-zinc-200 font-medium truncate">{t.name}</p>
              {t.email && (
                <p className="text-xs text-zinc-500 truncate">{t.email}</p>
              )}
            </div>
            <button
              onClick={() => onDelete(t.id, t.name)}
              className="text-zinc-700 hover:text-red-400 transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
              title={`Delete ${t.name}`}
            >
              <TrashIcon size={14} />
            </button>
          </div>
        ))
      )}
    </div>
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
   FILES / ATTACHMENTS  —  JSON in lesson_files
   Upload to Supabase Storage "lesson-files" bucket
   ═══════════════════════════════════════════════════ */

function FileIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function isImageFile(filename) {
  if (!filename) return false
  return /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i.test(filename)
}

function FilesManager({ lessonId, initialFiles, onSaved }) {
  const [files, setFiles] = useState(() => {
    try {
      if (!initialFiles) return []
      const parsed = typeof initialFiles === 'string' ? JSON.parse(initialFiles) : initialFiles
      return Array.isArray(parsed) ? parsed : []
    } catch { return [] }
  })
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [editingNote, setEditingNote] = useState(null) // file index being edited
  const [noteValue, setNoteValue] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef(null)
  const intervalRef = useRef(null)
  const saveTimerRef = useRef(null)

  /* sync files state when initialFiles prop changes (e.g. after refresh) */
  useEffect(() => {
    try {
      if (!initialFiles) { setFiles([]); return }
      const parsed = typeof initialFiles === 'string' ? JSON.parse(initialFiles) : initialFiles
      setFiles(Array.isArray(parsed) ? parsed : [])
    } catch { setFiles([]) }
  }, [initialFiles])

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [])

  /* persist files JSON to Supabase */
  const saveFiles = useCallback(async (updated) => {
    const { error } = await supabase
      .from('lessons')
      .update({ lesson_files: updated })
      .eq('id', lessonId)
    if (error) console.error('Failed to save lesson files:', error)
    if (onSaved) onSaved(lessonId, 'lesson_files', updated)
  }, [lessonId, onSaved])

  /* upload one or more files */
  const handleUpload = async (fileList) => {
    if (!fileList || fileList.length === 0) return
    setUploading(true)
    setUploadProgress(0)

    const filesToUpload = Array.from(fileList)
    const totalFiles = filesToUpload.length
    let completed = 0

    intervalRef.current = setInterval(() => {
      setUploadProgress((p) => {
        const target = ((completed / totalFiles) * 100) + ((1 / totalFiles) * 80)
        if (p >= target) { clearInterval(intervalRef.current); return p }
        return p + Math.random() * 8
      })
    }, 200)

    const newFiles = []

    for (const file of filesToUpload) {
      const ext = file.name.split('.').pop()
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const filePath = `${lessonId}/${Date.now()}_${safeName}`

      const { error } = await supabase.storage
        .from('lesson-files')
        .upload(filePath, file, { upsert: true })

      if (error) {
        console.error('File upload failed:', file.name, error)
        completed++
        continue
      }

      const { data: urlData } = supabase.storage.from('lesson-files').getPublicUrl(filePath)

      newFiles.push({
        filename: file.name,
        url: urlData.publicUrl,
        storagePath: filePath,
        size: file.size,
        type: file.type,
        note: '',
        uploadedAt: new Date().toISOString(),
      })
      completed++
      setUploadProgress((completed / totalFiles) * 100)
    }

    clearInterval(intervalRef.current)
    setUploadProgress(100)

    const updated = [...files, ...newFiles]
    setFiles(updated)
    await saveFiles(updated)

    setUploading(false)
    setUploadProgress(0)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleDelete = async (index) => {
    const file = files[index]
    if (!file) return

    /* remove from storage */
    if (file.storagePath) {
      await supabase.storage.from('lesson-files').remove([file.storagePath])
    } else if (file.url) {
      const marker = '/storage/v1/object/public/lesson-files/'
      const idx = file.url.indexOf(marker)
      if (idx !== -1) {
        const path = decodeURIComponent(file.url.slice(idx + marker.length))
        await supabase.storage.from('lesson-files').remove([path])
      }
    }

    const updated = files.filter((_, i) => i !== index)
    setFiles(updated)
    await saveFiles(updated)
  }

  const saveNote = async (index) => {
    const updated = files.map((f, i) => (i === index ? { ...f, note: noteValue } : f))
    setFiles(updated)
    setEditingNote(null)
    await saveFiles(updated)
  }

  /* drag & drop handlers */
  const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); setDragOver(true) }
  const handleDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); setDragOver(false) }
  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUpload(e.dataTransfer.files)
    }
  }

  return (
    <div>
      <SectionHeading icon="📎" title="Files & Attachments">
        <span className="text-xs text-zinc-500">{files.length} file{files.length !== 1 ? 's' : ''}</span>
      </SectionHeading>

      {/* Upload zone */}
      <div
        className={`border border-dashed rounded-xl px-6 py-6 w-full max-w-3xl transition-colors cursor-pointer flex flex-col items-center justify-center gap-2 ${
          dragOver
            ? 'border-purple-400 bg-purple-900/20'
            : 'border-purple-700/40 bg-[#13102a] hover:border-purple-500/60 hover:bg-purple-900/10'
        } ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
      >
        <UploadIcon size={24} />
        <p className="text-sm text-zinc-400">
          {uploading ? 'Uploading…' : dragOver ? 'Drop files here' : 'Click or drag & drop files here'}
        </p>
        <p className="text-[11px] text-zinc-600">Images, PDFs, Word docs, screenshots, etc. — Multiple files allowed</p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        hidden
        onChange={(e) => e.target.files && handleUpload(e.target.files)}
      />

      {/* Upload progress */}
      {uploading && (
        <div className="max-w-3xl mt-3">
          <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
            <div
              className="bg-purple-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.round(uploadProgress)}%` }}
            />
          </div>
          <p className="text-xs text-zinc-500 mt-1">{Math.round(uploadProgress)}% uploaded</p>
        </div>
      )}

      {/* File list */}
      {files.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4 max-w-3xl">
          {files.map((file, idx) => (
            <div key={idx} className="bg-[#13102a] border border-purple-900/30 rounded-xl overflow-hidden group">
              {/* Thumbnail / icon */}
              <div className="h-28 bg-[#0b091a] flex items-center justify-center overflow-hidden">
                {isImageFile(file.filename) ? (
                  <img
                    src={file.url}
                    alt={file.filename}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-1.5 text-zinc-500">
                    <FileIcon size={32} />
                    <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-600">
                      {file.filename?.split('.').pop() || 'file'}
                    </span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-3 space-y-2">
                <p className="text-xs text-zinc-200 truncate font-medium" title={file.filename}>
                  {file.filename}
                </p>
                <p className="text-[10px] text-zinc-500">
                  {formatFileSize(file.size)}
                  {file.uploadedAt && ` · ${new Date(file.uploadedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                </p>

                {/* Note */}
                {editingNote === idx ? (
                  <div className="flex gap-1">
                    <input
                      className="flex-1 bg-[#0e0b1a] border border-purple-900/40 rounded px-2 py-1 text-[11px] text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                      value={noteValue}
                      onChange={(e) => setNoteValue(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') saveNote(idx); if (e.key === 'Escape') setEditingNote(null) }}
                      placeholder="Add a note…"
                      autoFocus
                    />
                    <button onClick={() => saveNote(idx)} className="text-emerald-400 hover:text-emerald-300 text-[11px] cursor-pointer">✓</button>
                    <button onClick={() => setEditingNote(null)} className="text-zinc-500 hover:text-zinc-300 text-[11px] cursor-pointer">✕</button>
                  </div>
                ) : (
                  <p
                    className="text-[11px] text-zinc-500 truncate cursor-pointer hover:text-purple-300 transition-colors"
                    onClick={() => { setEditingNote(idx); setNoteValue(file.note || '') }}
                    title={file.note || 'Click to add note'}
                  >
                    {file.note || '+ Add note'}
                  </p>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1">
                  <a
                    href={file.url}
            target="_blank"
            rel="noopener noreferrer"
                    download={file.filename}
                    className="text-[11px] text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <DownloadIcon size={11} /> Download
                  </a>
                  <button
                    onClick={() => handleDelete(idx)}
                    className="text-[11px] text-zinc-600 hover:text-red-400 transition-colors cursor-pointer ml-auto flex items-center gap-1"
                  >
                    <TrashIcon size={11} /> Delete
                  </button>
        </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════
   COURSE FILES MANAGER  —  JSON in course_files
   Shared attachments at the course level
   ═══════════════════════════════════════════════════ */

function CourseFilesManager({ courseId, initialFiles, onSaved }) {
  const [files, setFiles] = useState(() => {
    try {
      if (!initialFiles) return []
      const parsed = typeof initialFiles === 'string' ? JSON.parse(initialFiles) : initialFiles
      return Array.isArray(parsed) ? parsed : []
    } catch { return [] }
  })
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [editingNote, setEditingNote] = useState(null)
  const [noteValue, setNoteValue] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef(null)
  const intervalRef = useRef(null)

  /* sync files state when initialFiles prop changes (e.g. after refresh) */
  useEffect(() => {
    try {
      if (!initialFiles) { setFiles([]); return }
      const parsed = typeof initialFiles === 'string' ? JSON.parse(initialFiles) : initialFiles
      setFiles(Array.isArray(parsed) ? parsed : [])
    } catch { setFiles([]) }
  }, [initialFiles])

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [])

  /* persist files JSON to Supabase */
  const saveFiles = useCallback(async (updated) => {
    const { error } = await supabase
      .from('courses')
      .update({ course_files: updated })
      .eq('id', courseId)
    if (error) console.error('Failed to save course files:', error)
    if (onSaved) onSaved(courseId, 'course_files', updated)
  }, [courseId, onSaved])

  /* upload one or more files */
  const handleUpload = async (fileList) => {
    if (!fileList || fileList.length === 0) return
    setUploading(true)
    setUploadProgress(0)

    const filesToUpload = Array.from(fileList)
    const totalFiles = filesToUpload.length
    let completed = 0

    intervalRef.current = setInterval(() => {
      setUploadProgress((p) => {
        const target = ((completed / totalFiles) * 100) + ((1 / totalFiles) * 80)
        if (p >= target) { clearInterval(intervalRef.current); return p }
        return p + Math.random() * 8
      })
    }, 200)

    const newFiles = []

    for (const file of filesToUpload) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const filePath = `course_${courseId}/${Date.now()}_${safeName}`

      const { error } = await supabase.storage
        .from('lesson-files')
        .upload(filePath, file, { upsert: true })

      if (error) {
        console.error('Course file upload failed:', file.name, error)
        completed++
        continue
      }

      const { data: urlData } = supabase.storage.from('lesson-files').getPublicUrl(filePath)

      newFiles.push({
        filename: file.name,
        url: urlData.publicUrl,
        storagePath: filePath,
        size: file.size,
        type: file.type,
        note: '',
        uploadedAt: new Date().toISOString(),
      })
      completed++
      setUploadProgress((completed / totalFiles) * 100)
    }

    clearInterval(intervalRef.current)
    setUploadProgress(100)

    const updated = [...files, ...newFiles]
    setFiles(updated)
    await saveFiles(updated)

    setUploading(false)
    setUploadProgress(0)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleDelete = async (index) => {
    const file = files[index]
    if (!file) return

    if (file.storagePath) {
      await supabase.storage.from('lesson-files').remove([file.storagePath])
    } else if (file.url) {
      const marker = '/storage/v1/object/public/lesson-files/'
      const idx = file.url.indexOf(marker)
      if (idx !== -1) {
        const path = decodeURIComponent(file.url.slice(idx + marker.length))
        await supabase.storage.from('lesson-files').remove([path])
      }
    }

    const updated = files.filter((_, i) => i !== index)
    setFiles(updated)
    await saveFiles(updated)
  }

  const saveNote = async (index) => {
    const updated = files.map((f, i) => (i === index ? { ...f, note: noteValue } : f))
    setFiles(updated)
    setEditingNote(null)
    await saveFiles(updated)
  }

  /* drag & drop handlers */
  const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); setDragOver(true) }
  const handleDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); setDragOver(false) }
  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUpload(e.dataTransfer.files)
    }
  }

  return (
    <div className="mt-3 mb-2">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm">📁</span>
        <span className="text-xs font-semibold text-purple-300 uppercase tracking-wider">Shared Course Files</span>
        <span className="text-[10px] text-zinc-500">{files.length} file{files.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Upload zone */}
      <div
        className={`border border-dashed rounded-xl px-4 py-4 w-full transition-colors cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
          dragOver
            ? 'border-purple-400 bg-purple-900/20'
            : 'border-purple-700/40 bg-[#13102a] hover:border-purple-500/60 hover:bg-purple-900/10'
        } ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
      >
        <UploadIcon size={20} />
        <p className="text-xs text-zinc-400">
          {uploading ? 'Uploading…' : dragOver ? 'Drop files here' : 'Click or drag & drop course files'}
        </p>
        <p className="text-[10px] text-zinc-600">Shared resources for all lessons in this course</p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        hidden
        onChange={(e) => e.target.files && handleUpload(e.target.files)}
      />

      {/* Upload progress */}
      {uploading && (
        <div className="mt-2">
          <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-purple-500 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${Math.round(uploadProgress)}%` }}
            />
          </div>
          <p className="text-[10px] text-zinc-500 mt-0.5">{Math.round(uploadProgress)}% uploaded</p>
        </div>
      )}

      {/* File list */}
      {files.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-3">
          {files.map((file, idx) => (
            <div key={idx} className="bg-[#13102a] border border-purple-900/30 rounded-lg overflow-hidden group">
              {/* Thumbnail / icon */}
              <div className="h-24 bg-[#0b091a] flex items-center justify-center overflow-hidden">
                {isImageFile(file.filename) ? (
                  <img src={file.url} alt={file.filename} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-zinc-500">
                    <FileIcon size={28} />
                    <span className="text-[9px] uppercase font-bold tracking-wider text-zinc-600">
                      {file.filename?.split('.').pop() || 'file'}
                    </span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-2.5 space-y-1.5">
                <p className="text-[11px] text-zinc-200 truncate font-medium" title={file.filename}>
                  {file.filename}
                </p>
                <p className="text-[10px] text-zinc-500">
                  {formatFileSize(file.size)}
                  {file.uploadedAt && ` · ${new Date(file.uploadedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                </p>

                {/* Note */}
                {editingNote === idx ? (
                  <div className="flex gap-1">
                    <input
                      className="flex-1 bg-[#0e0b1a] border border-purple-900/40 rounded px-2 py-0.5 text-[10px] text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                      value={noteValue}
                      onChange={(e) => setNoteValue(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') saveNote(idx); if (e.key === 'Escape') setEditingNote(null) }}
                      placeholder="Add a note…"
                      autoFocus
                    />
                    <button onClick={() => saveNote(idx)} className="text-emerald-400 hover:text-emerald-300 text-[10px] cursor-pointer">✓</button>
                    <button onClick={() => setEditingNote(null)} className="text-zinc-500 hover:text-zinc-300 text-[10px] cursor-pointer">✕</button>
                  </div>
                ) : (
                  <p
                    className="text-[10px] text-zinc-500 truncate cursor-pointer hover:text-purple-300 transition-colors"
                    onClick={() => { setEditingNote(idx); setNoteValue(file.note || '') }}
                    title={file.note || 'Click to add note'}
                  >
                    {file.note || '+ Add note'}
                  </p>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-0.5">
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={file.filename}
                    className="text-[10px] text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <DownloadIcon size={10} /> Download
                  </a>
                  <button
                    onClick={() => handleDelete(idx)}
                    className="text-[10px] text-zinc-600 hover:text-red-400 transition-colors cursor-pointer ml-auto flex items-center gap-1"
                  >
                    <TrashIcon size={10} /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════
   QUIZ BUILDER  —  JSON in quiz_content
   Supports: MC, TF, YN, SA question types
   Tabs: Create, Paste, Download
   ═══════════════════════════════════════════════════ */

const Q_TYPES = [
  { value: 'MC', label: 'Multiple Choice' },
  { value: 'TF', label: 'True / False' },
  { value: 'YN', label: 'Yes / No' },
  { value: 'SA', label: 'Short Answer' },
]

const Q_TYPE_LABEL = Object.fromEntries(Q_TYPES.map((t) => [t.value, t.label]))

function newQuestion(type) {
  if (type === 'MC') return { type: 'MC', question: '', options: ['', ''], correct: 0 }
  if (type === 'TF') return { type: 'TF', question: '', options: ['True', 'False'], correct: 0 }
  if (type === 'YN') return { type: 'YN', question: '', options: ['Yes', 'No'], correct: 0 }
  if (type === 'SA') return { type: 'SA', question: '', answer: '' }
  return { type: 'MC', question: '', options: ['', ''], correct: 0 }
}

/* normalise legacy questions (old format had no type field) */
function normaliseQuestion(q) {
  if (q.type) return q
  if (q.answer !== undefined) return { ...q, type: 'SA' }
  return { ...q, type: 'MC' }
}

function DownloadIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
    </svg>
  )
}

function ClipboardIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ArrowUpIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
    </svg>
  )
}

function ArrowDownIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  )
}

/* ── Single Question Card ── */
function QuizQuestionCard({ q, qi, total, onUpdate, onRemove, onMoveUp, onMoveDown, onChangeType }) {
  const type = q.type || 'MC'

  const typeBadgeColor = {
    MC: 'bg-purple-900/30 text-purple-400',
    TF: 'bg-blue-900/30 text-blue-400',
    YN: 'bg-amber-900/30 text-amber-400',
    SA: 'bg-emerald-900/30 text-emerald-400',
  }

  return (
    <div className="bg-[#0e0b1a] border border-purple-900/30 rounded-xl p-4">
      {/* header row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
          <span className="text-xs font-bold text-purple-400 bg-purple-900/30 rounded-md px-2 py-0.5">
            Q{qi + 1}
          </span>
          <select
            className={`text-[10px] font-semibold rounded-md px-1.5 py-0.5 cursor-pointer border-none outline-none ${typeBadgeColor[type] || typeBadgeColor.MC}`}
            value={type}
            onChange={(e) => onChangeType(qi, e.target.value)}
            title="Change question type"
          >
            {Q_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          {/* reorder arrows */}
          <div className="flex items-center gap-0.5 ml-1">
            <button
              onClick={() => onMoveUp(qi)}
              disabled={qi === 0}
              className="text-zinc-600 hover:text-purple-400 disabled:opacity-20 disabled:cursor-default transition-colors cursor-pointer"
              title="Move up"
            >
              <ArrowUpIcon size={14} />
            </button>
            <button
              onClick={() => onMoveDown(qi)}
              disabled={qi === total - 1}
              className="text-zinc-600 hover:text-purple-400 disabled:opacity-20 disabled:cursor-default transition-colors cursor-pointer"
              title="Move down"
            >
              <ArrowDownIcon size={14} />
            </button>
          </div>
        </div>
        <input
          className={inputCls + ' flex-1'}
          value={q.question}
          onChange={(e) => onUpdate(qi, 'question', e.target.value)}
          placeholder="Enter your question…"
        />
        <button
          onClick={() => onRemove(qi)}
          className="text-zinc-600 hover:text-red-400 transition-colors cursor-pointer flex-shrink-0 mt-1"
          title="Remove question"
        >
          <TrashIcon size={16} />
        </button>
      </div>

      {/* ── MC options ── */}
      {type === 'MC' && (
        <div className="ml-9 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(q.options || []).map((opt, oi) => (
              <div key={oi} className="flex items-center gap-2">
                <button
                  onClick={() => onUpdate(qi, 'correct', oi)}
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
                  onChange={(e) => onUpdate(qi, `option_${oi}`, e.target.value)}
                  placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                />
                {(q.options || []).length > 2 && (
                  <button
                    onClick={() => onUpdate(qi, 'remove_option', oi)}
                    className="text-zinc-700 hover:text-red-400 transition-colors cursor-pointer"
                    title="Remove option"
                  >
                    <TrashIcon size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3">
            {(q.options || []).length < 6 && (
              <button
                onClick={() => onUpdate(qi, 'add_option', null)}
                className="text-xs text-purple-400 hover:text-purple-300 transition-colors cursor-pointer flex items-center gap-1"
              >
                <PlusIcon size={12} /> Add Option
              </button>
            )}
            <p className="text-[11px] text-zinc-600">
              Click a letter to mark correct.
              {q.correct !== undefined && (
                <span className="text-emerald-500/70 ml-1">
                  Correct: {String.fromCharCode(65 + (q.correct || 0))}
                </span>
              )}
            </p>
          </div>
        </div>
      )}

      {/* ── TF options ── */}
      {type === 'TF' && (
        <div className="ml-9 flex items-center gap-4">
          {['True', 'False'].map((label, oi) => (
            <button
              key={label}
              onClick={() => onUpdate(qi, 'correct', oi)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-all ring-1 ${
                q.correct === oi
                  ? 'bg-emerald-600/20 text-emerald-300 ring-emerald-600'
                  : 'bg-zinc-800/60 text-zinc-400 ring-zinc-700 hover:ring-purple-600'
              }`}
            >
              <span className={`w-3.5 h-3.5 rounded-full ring-2 flex-shrink-0 ${
                q.correct === oi ? 'bg-emerald-500 ring-emerald-400' : 'bg-transparent ring-zinc-600'
              }`} />
              {label}
            </button>
          ))}
        </div>
      )}

      {/* ── YN options ── */}
      {type === 'YN' && (
        <div className="ml-9 flex items-center gap-4">
          {['Yes', 'No'].map((label, oi) => (
            <button
              key={label}
              onClick={() => onUpdate(qi, 'correct', oi)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-all ring-1 ${
                q.correct === oi
                  ? 'bg-emerald-600/20 text-emerald-300 ring-emerald-600'
                  : 'bg-zinc-800/60 text-zinc-400 ring-zinc-700 hover:ring-purple-600'
              }`}
            >
              <span className={`w-3.5 h-3.5 rounded-full ring-2 flex-shrink-0 ${
                q.correct === oi ? 'bg-emerald-500 ring-emerald-400' : 'bg-transparent ring-zinc-600'
              }`} />
              {label}
            </button>
          ))}
        </div>
      )}

      {/* ── SA answer ── */}
      {type === 'SA' && (
        <div className="ml-9">
          <label className="block text-[11px] text-zinc-500 mb-1">Expected / Sample Answer</label>
          <input
            className={inputCls + ' text-xs'}
            value={q.answer || ''}
            onChange={(e) => onUpdate(qi, 'answer', e.target.value)}
            placeholder="Type the expected answer…"
          />
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   PASTE PARSER  —  handles all common quiz text formats
   ══════════════════════════════════════════════════════════════ */

/*
  Helper: extract inline options from a single-line string.
  Detects " A. " " B. " etc markers in sequential A→B→C→D→E→F order.
  Returns { questionText, options[] }
  No lookbehind used — works in all browsers including older Safari.
*/
function splitOptionsFromText(text) {
  const flat = text.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim()

  /* Find option markers: a space (or start) then A. or A: or A) then space
     We manually scan to avoid lookbehind which breaks older Safari. */
  const markers = []
  const letters = 'ABCDEF'
  let nextExpected = 0 // index into letters: 0=A, 1=B, …

  for (let i = 0; i < flat.length; i++) {
    if (nextExpected >= letters.length) break
    const ch = flat[i].toUpperCase()
    if (ch !== letters[nextExpected]) continue

    /* Check boundary: must be at start or preceded by whitespace */
    if (i > 0 && flat[i - 1] !== ' ') continue

    /* Check delimiter: next char must be . : or ) */
    if (i + 1 >= flat.length) continue
    const delim = flat[i + 1]
    if (delim !== '.' && delim !== ':' && delim !== ')') continue

    /* Check that there's a space (or end) after the delimiter */
    if (i + 2 < flat.length && flat[i + 2] !== ' ') continue

    const contentStart = i + 2 < flat.length ? i + 3 : i + 2
    markers.push({ pos: i, contentStart })
    nextExpected++
  }

  if (markers.length < 2) return { questionText: flat, options: [] }

  const questionText = flat.slice(0, markers[0].pos).trim()
  const options = markers.map((mk, idx) => {
    const start = mk.contentStart
    const end = idx + 1 < markers.length ? markers[idx + 1].pos : flat.length
    return flat.slice(start, end).trim()
  })

  return { questionText, options }
}

/*
  Main parser — auto-detects and handles:
  1. Numbered questions (1. 2. 3.) with optional Answer Key at the bottom
  2. Structured format (Type:/Q:/Correct:)
  3. Free-form questions separated by blank lines
  Options can be on the same line or separate lines.
*/
function parsePastedQuiz(text) {
  if (!text || !text.trim()) return []

  /* Normalise line endings: \r\n → \n, stray \r → \n */
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  /* ── Step 1: Extract Answer Key if present ─────────────────── */
  const answerKeys = {}

  /*  Match "Answer Key" (case-insensitive) that appears on its own line,
      optionally followed by a colon, with answer lines below it.
      We search for the LAST occurrence in case "answer" appears in a question. */
  const akRegex = /^[ \t]*answer\s*key[:\s]*$/im
  const akLineMatch = akRegex.exec(text)
  let bodyText = text

  if (akLineMatch) {
    /* Everything after the "Answer Key" header line */
    const afterHeader = text.slice(akLineMatch.index + akLineMatch[0].length)
    const keyLines = afterHeader.split('\n').map(l => l.trim()).filter(Boolean)
    for (const kl of keyLines) {
      const km = kl.match(/^(\d+)[.)]\s*([A-Fa-f])\b/i)
      if (km) {
        answerKeys[parseInt(km[1])] = km[2].toUpperCase().charCodeAt(0) - 65
      }
    }
    /* Body is everything BEFORE the answer key line */
    bodyText = text.slice(0, akLineMatch.index).trim()
  }

  /* ── Step 2: Detect if this is structured Type:/Q: format ── */
  if (/^(Type:|Q:)\s/im.test(bodyText)) {
    const result = parseStructuredFormat(bodyText)
    if (result.length > 0) return result
  }

  /* ── Step 3: Split into raw question blocks ── */
  const rawBlocks = splitIntoQuestionBlocks(bodyText)

  /* ── Step 4: Parse each block ── */
  const questions = []
  for (let i = 0; i < rawBlocks.length; i++) {
    const block = rawBlocks[i]
    const parsed = parseOneQuestion(block.text)
    if (!parsed) continue

    /* Override correct answer from Answer Key if available */
    let correctIdx = parsed.correct
    if (block.num != null && answerKeys[block.num] !== undefined) {
      correctIdx = Math.min(answerKeys[block.num], Math.max(parsed.options.length - 1, 0))
    }

    questions.push({
      type: parsed.type,
      question: parsed.question,
      options: parsed.options,
      correct: correctIdx,
      ...(parsed.answer !== undefined ? { answer: parsed.answer } : {}),
    })
  }

  return questions
}

/* Split body text into question blocks, each with optional question number */
function splitIntoQuestionBlocks(text) {
  const blocks = []

  /* Find numbered question starts: "1." or "1)" at start of a line,
     followed by non-digit (to avoid matching option markers like A.) */
  const numberedRegex = /(?:^|\n)[ \t]*(\d+)[.)]\s+/gm
  const numberedStarts = []
  let nm
  while ((nm = numberedRegex.exec(text)) !== null) {
    numberedStarts.push({
      num: parseInt(nm[1]),
      fullMatchEnd: nm.index + nm[0].length,
      matchStart: nm.index,
    })
  }

  if (numberedStarts.length >= 1) {
    for (let i = 0; i < numberedStarts.length; i++) {
      const start = numberedStarts[i].fullMatchEnd
      const end = i + 1 < numberedStarts.length ? numberedStarts[i + 1].matchStart : text.length
      const raw = text.slice(start, end).trim()
      if (raw) blocks.push({ num: numberedStarts[i].num, text: raw })
    }
    if (blocks.length > 0) return blocks
  }

  /* Fallback: split on blank lines */
  const blankSplit = text.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean)
  return blankSplit.map((b, i) => ({ num: i + 1, text: b }))
}

/* Parse a single question block into { question, options, correct, type } */
function parseOneQuestion(text) {
  /* Strip leading number prefix if still present: "1." or "1)" */
  let clean = text.replace(/^\d+[.)]\s*/, '').trim()
  if (!clean) return null

  /* Check for "Correct: X" at the end */
  let inlineCorrect = -1
  const correctMatch = clean.match(/\n?\s*Correct:\s*([A-Fa-f])\s*$/i)
  if (correctMatch) {
    inlineCorrect = correctMatch[1].toUpperCase().charCodeAt(0) - 65
    clean = clean.slice(0, correctMatch.index).trim()
  }

  /* Check for Type: prefix */
  let type = 'MC'
  const typeMatch = clean.match(/^Type:\s*(MC|TF|YN|SA)\s*\n?/i)
  if (typeMatch) {
    type = typeMatch[1].toUpperCase()
    clean = clean.slice(typeMatch[0].length).trim()
  }

  /* Strip Q: prefix */
  const qPrefix = clean.match(/^Q:\s*/i)
  if (qPrefix) {
    clean = clean.slice(qPrefix[0].length).trim()
  }

  /* Handle TF / YN / SA types */
  if (type === 'TF') {
    return { type: 'TF', question: clean, options: ['True', 'False'], correct: inlineCorrect >= 0 ? inlineCorrect : 0 }
  }
  if (type === 'YN') {
    return { type: 'YN', question: clean, options: ['Yes', 'No'], correct: inlineCorrect >= 0 ? inlineCorrect : 0 }
  }
  if (type === 'SA') {
    const ansLine = clean.match(/\n?\s*Answer:\s*(.+)/i)
    const answer = ansLine ? ansLine[1].trim() : ''
    const q = ansLine ? clean.slice(0, ansLine.index).trim() : clean
    return { type: 'SA', question: q, options: [], correct: 0, answer }
  }

  /* ── MC: split question text from options ── */

  /* Try 1: options on separate lines (A. ... \n B. ...) */
  const lines = clean.split('\n').map((l) => l.trim()).filter(Boolean)
  const firstOptLineIdx = lines.findIndex((l) => /^[A-Fa-f][.:)]\s/.test(l))

  if (firstOptLineIdx > 0) {
    const questionText = lines.slice(0, firstOptLineIdx).join(' ').trim()
    const options = []
    for (let li = firstOptLineIdx; li < lines.length; li++) {
      const om = lines[li].match(/^[A-Fa-f][.:)]\s*(.+)/)
      if (om) options.push(om[1].trim())
    }
    if (options.length >= 2) {
      return { type: 'MC', question: questionText, options, correct: inlineCorrect >= 0 ? Math.min(inlineCorrect, options.length - 1) : 0 }
    }
  }

  /* Try 2: options inline on the same line (question text A. opt1 B. opt2 …) */
  const { questionText, options } = splitOptionsFromText(clean)

  if (options.length >= 2) {
    return { type: 'MC', question: questionText, options, correct: inlineCorrect >= 0 ? Math.min(inlineCorrect, options.length - 1) : 0 }
  }

  /* No options found — still add as question with empty options */
  if (questionText) {
    return { type: 'MC', question: questionText, options: ['', ''], correct: 0 }
  }

  return null
}

/* Structured format parser (Type:/Q:/Correct: blocks separated by blank lines) */
function parseStructuredFormat(text) {
  const blocks = text.split(/\n\s*\n/).filter(Boolean)
  const questions = []

  for (const block of blocks) {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean)
    let type = 'MC'
    let question = ''
    const options = []
    let correct = 0
    let answer = ''

    for (const line of lines) {
      const typeM = line.match(/^Type:\s*(MC|TF|YN|SA)/i)
      if (typeM) { type = typeM[1].toUpperCase(); continue }

      const qM = line.match(/^Q:\s*(.+)/i)
      if (qM) { question = qM[1]; continue }

      const optM = line.match(/^([A-Fa-f])[.:)]\s*(.+)/)
      if (optM) { options.push(optM[2].trim()); continue }

      const corM = line.match(/^Correct:\s*(True|False|Yes|No|[A-Fa-f](?!\w)|.+)/i)
      if (corM) {
        const val = corM[1].trim()
        if (/^true$/i.test(val)) correct = 0
        else if (/^false$/i.test(val)) correct = 1
        else if (/^yes$/i.test(val)) correct = 0
        else if (/^no$/i.test(val)) correct = 1
        else if (/^[A-Fa-f]$/i.test(val)) correct = val.toUpperCase().charCodeAt(0) - 65
        else answer = val
        continue
      }

      const ansM = line.match(/^Answer:\s*(.+)/i)
      if (ansM) { answer = ansM[1]; continue }
    }

    if (!question) continue

    if (type === 'SA') questions.push({ type: 'SA', question, answer })
    else if (type === 'TF') questions.push({ type: 'TF', question, options: ['True', 'False'], correct })
    else if (type === 'YN') questions.push({ type: 'YN', question, options: ['Yes', 'No'], correct })
    else questions.push({ type: 'MC', question, options: options.length >= 2 ? options : ['', ''], correct: Math.min(correct, Math.max(options.length - 1, 0)) })
  }
  return questions
}

/* ── Export questions to text ── */
function exportQuizText(questions) {
  return questions.map((q, i) => {
    const lines = [`Type: ${q.type || 'MC'}`, `Q: ${q.question}`]
    if (q.type === 'SA') {
      lines.push(`Answer: ${q.answer || ''}`)
    } else if (q.type === 'TF') {
      lines.push(`Correct: ${q.correct === 0 ? 'True' : 'False'}`)
    } else if (q.type === 'YN') {
      lines.push(`Correct: ${q.correct === 0 ? 'Yes' : 'No'}`)
    } else {
      (q.options || []).forEach((opt, oi) => {
        lines.push(`${String.fromCharCode(65 + oi)}: ${opt}`)
      })
      lines.push(`Correct: ${String.fromCharCode(65 + (q.correct || 0))}`)
    }
    return lines.join('\n')
  }).join('\n\n')
}

/* ── Main QuizBuilder ── */
function QuizBuilder({ lessonId, initialQuiz, onSaved }) {
  const [questions, setQuestions] = useState(() => {
    try {
      const parsed = typeof initialQuiz === 'string' ? JSON.parse(initialQuiz) : initialQuiz
      return Array.isArray(parsed) ? parsed.map(normaliseQuestion) : []
    } catch {
      return []
    }
  })
  const [saveStatus, setSaveStatus] = useState(null)
  const timerRef = useRef(null)
  const [activeTab, setActiveTab] = useState('create') // create | paste | download
  const [addType, setAddType] = useState('MC')
  const [pasteText, setPasteText] = useState('')
  const [pasteError, setPasteError] = useState('')
  const [pasteSuccess, setPasteSuccess] = useState('')

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
    const updated = [...questions, newQuestion(addType)]
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
      if (field === 'answer') return { ...q, answer: value }
      if (field === 'add_option') {
        const opts = [...(q.options || [])]
        if (opts.length < 6) opts.push('')
        return { ...q, options: opts }
      }
      if (field === 'remove_option') {
        const opts = (q.options || []).filter((_, oi) => oi !== value)
        const newCorrect = q.correct >= opts.length ? opts.length - 1 : q.correct
        return { ...q, options: opts, correct: Math.max(0, newCorrect) }
      }
      if (field.startsWith('option_')) {
        const optIdx = parseInt(field.split('_')[1])
        const opts = [...(q.options || [])]
        opts[optIdx] = value
        return { ...q, options: opts }
      }
      return q
    })
    setQuestions(updated)
    save(updated)
  }

  const moveQuestion = (index, direction) => {
    const target = index + direction
    if (target < 0 || target >= questions.length) return
    const updated = [...questions]
    const temp = updated[index]
    updated[index] = updated[target]
    updated[target] = temp
    setQuestions(updated)
    save(updated)
  }

  const changeQuestionType = (index, newType) => {
    const updated = questions.map((q, i) => {
      if (i !== index) return q
      const base = { type: newType, question: q.question }
      if (newType === 'MC') return { ...base, options: q.options && q.options.length >= 2 && q.type === 'MC' ? q.options : ['', ''], correct: 0 }
      if (newType === 'TF') return { ...base, options: ['True', 'False'], correct: 0 }
      if (newType === 'YN') return { ...base, options: ['Yes', 'No'], correct: 0 }
      if (newType === 'SA') return { ...base, answer: q.answer || '' }
      return base
    })
    setQuestions(updated)
    save(updated)
  }

  const handlePasteImport = () => {
    setPasteError('')
    setPasteSuccess('')
    const parsed = parsePastedQuiz(pasteText)
    if (parsed.length === 0) {
      setPasteError(pasteText.slice(0, 500) + (pasteText.length > 500 ? '\n…(truncated)' : ''))
      return
    }
    const updated = [...questions, ...parsed]
    setQuestions(updated)
    save(updated)
    setPasteText('')
    setPasteSuccess(`Successfully imported ${parsed.length} question${parsed.length !== 1 ? 's' : ''}!`)
    setTimeout(() => setPasteSuccess(''), 5000)
  }

  const handleDownload = () => {
    const text = exportQuizText(questions)
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `quiz-${lessonId}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const tabCls = (tab) =>
    `px-3 py-1.5 text-xs font-medium rounded-lg cursor-pointer transition-colors ${
      activeTab === tab
        ? 'bg-purple-600/30 text-purple-300 ring-1 ring-purple-600/50'
        : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60'
    }`

  return (
    <div>
      <SectionHeading icon="❓" title="Quiz Builder">
        <SaveIndicator status={saveStatus} />
        <span className="text-xs text-zinc-600">{questions.length} question{questions.length !== 1 && 's'}</span>
      </SectionHeading>

      {/* ── Tabs ── */}
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => setActiveTab('create')} className={tabCls('create')}>Create</button>
        <button onClick={() => setActiveTab('paste')} className={tabCls('paste')}>
          <span className="inline-flex items-center gap-1"><ClipboardIcon size={12} /> Paste</span>
        </button>
        <button onClick={() => setActiveTab('download')} className={tabCls('download')}>
          <span className="inline-flex items-center gap-1"><DownloadIcon size={12} /> Download</span>
        </button>
      </div>

      {/* ══════ CREATE TAB ══════ */}
      {activeTab === 'create' && (
        <div>
          {/* add question bar */}
          <div className="flex items-center gap-2 mb-4">
            <select
              className={inputCls + ' w-auto text-xs'}
              value={addType}
              onChange={(e) => setAddType(e.target.value)}
            >
              {Q_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <button onClick={addQuestion} className={btnSmPurple + ' flex items-center gap-1'}>
              <PlusIcon size={12} /> Add Question
            </button>
          </div>

          {questions.length === 0 && (
            <p className="text-xs text-zinc-600 italic py-2">No quiz questions yet — select a type and click "Add Question" to start</p>
          )}

          <div className="space-y-4">
            {questions.map((q, qi) => (
              <QuizQuestionCard
                key={qi}
                q={q}
                qi={qi}
                total={questions.length}
                onUpdate={updateQuestion}
                onRemove={removeQuestion}
                onMoveUp={(i) => moveQuestion(i, -1)}
                onMoveDown={(i) => moveQuestion(i, 1)}
                onChangeType={changeQuestionType}
              />
            ))}
          </div>
        </div>
      )}

      {/* ══════ PASTE TAB ══════ */}
      {activeTab === 'paste' && (
        <div className="space-y-3">
          <p className="text-xs text-zinc-500 leading-relaxed">
            Paste questions below. The parser auto-detects the format — options can be on the same line or separate lines.
          </p>

          {/* Format examples */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Same-line options */}
            <div>
              <p className="text-[10px] font-semibold text-purple-400 uppercase tracking-wider mb-1.5">Options on Same Line</p>
              <div className="bg-[#0e0b1a] border border-purple-900/30 rounded-lg p-3 text-[11px] font-mono text-zinc-500 leading-relaxed whitespace-pre-wrap">{'1. What is the purpose of verification? A. To speed up the call B. To protect info C. To collect details D. To reduce follow-ups\n\n2. When should you ask security questions? A. After answering B. Only if unsure C. Before details D. When missing\n\nAnswer Key\n1. B\n2. C'}</div>
            </div>

            {/* Separate-line options */}
            <div>
              <p className="text-[10px] font-semibold text-purple-400 uppercase tracking-wider mb-1.5">Options on Separate Lines</p>
              <div className="bg-[#0e0b1a] border border-purple-900/30 rounded-lg p-3 text-[11px] font-mono text-zinc-500 leading-relaxed whitespace-pre-wrap">{'1. What is the purpose of verification?\nA. To speed up the call\nB. To protect info\nC. To collect details\nD. To reduce follow-ups\n\nAnswer Key\n1. B'}</div>
            </div>
          </div>

          <p className="text-[10px] text-zinc-600 leading-relaxed">
            Also supports: <span className="text-zinc-500">Type: MC/TF/YN/SA</span> format, <span className="text-zinc-500">Correct: B</span> inline, options with <span className="text-zinc-500">A:</span> or <span className="text-zinc-500">A)</span> delimiters, <span className="text-zinc-500">A</span> through <span className="text-zinc-500">F</span> options, questions without numbers separated by blank lines.
          </p>

          <textarea
            className={inputCls + ' resize-y min-h-[120px] font-mono text-[13px] leading-relaxed'}
            rows={8}
            value={pasteText}
            onChange={(e) => { setPasteText(e.target.value); setPasteError(''); setPasteSuccess('') }}
            placeholder="Paste quiz text here…"
          />
          {pasteError && (
            <div className="bg-red-950/40 border border-red-900/40 rounded-lg p-3">
              <p className="text-xs text-red-400 font-medium mb-1">Could not parse any questions from the pasted text.</p>
              <p className="text-[11px] text-red-400/70 mb-2">Check that your text has question text followed by options (A. B. C. D.) and try again.</p>
              <pre className="text-[10px] text-red-300/50 font-mono whitespace-pre-wrap max-h-32 overflow-y-auto">{pasteError}</pre>
            </div>
          )}
          {pasteSuccess && (
            <div className="bg-emerald-950/40 border border-emerald-900/40 rounded-lg px-3 py-2">
              <p className="text-xs text-emerald-400 font-medium">✓ {pasteSuccess}</p>
            </div>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePasteImport}
              disabled={!pasteText.trim()}
              className={btnPrimary + ' disabled:opacity-40'}
            >
              Import Questions
            </button>
            <span className="text-[11px] text-zinc-600">Questions will be appended to the existing quiz</span>
          </div>
        </div>
      )}

      {/* ══════ DOWNLOAD TAB ══════ */}
      {activeTab === 'download' && (
        <div className="space-y-3">
          <p className="text-xs text-zinc-500">Export your quiz questions as a formatted text file.</p>

          {questions.length === 0 ? (
            <p className="text-xs text-zinc-600 italic py-4">No questions to export yet.</p>
          ) : (
            <>
              <div className="bg-[#0e0b1a] border border-purple-900/30 rounded-lg p-4 max-h-60 overflow-y-auto">
                <pre className="text-[12px] font-mono text-zinc-400 whitespace-pre-wrap leading-relaxed">
                  {exportQuizText(questions)}
                </pre>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={handleDownload} className={btnPrimary + ' flex items-center gap-2'}>
                  <DownloadIcon size={14} /> Download .txt
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(exportQuizText(questions))
                  }}
                  className={btnGhost + ' flex items-center gap-2'}
                >
                  <ClipboardIcon size={14} /> Copy to Clipboard
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════
   LESSON DETAIL PANEL  —  shown when lesson is expanded
   ═══════════════════════════════════════════════════ */

function LessonDetail({ lesson, onSaved }) {
  const [detailTab, setDetailTab] = useState('script')
  const tabs = [
    { key: 'script', label: '📝 Script' },
    { key: 'video', label: '🎬 Video' },
    { key: 'quiz', label: '❓ Quiz' },
    { key: 'files', label: '📎 Files' },
  ]
  const dtCls = (key) =>
    `px-4 py-2 text-xs font-medium rounded-t-lg transition-colors cursor-pointer ${
      detailTab === key
        ? 'bg-[#0b091a] text-purple-300 border border-purple-800/50 border-b-0'
        : 'text-zinc-500 hover:text-zinc-300 hover:bg-purple-900/10'
    }`

  return (
    <div className="bg-[#0b091a] border-t border-purple-900/30">
      {/* Tab bar */}
      <div className="flex gap-0.5 px-4 pt-3 border-b border-purple-900/30">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setDetailTab(t.key)} className={dtCls(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="px-6 py-5">
        {detailTab === 'script' && (
          <ScriptEditor
            lessonId={lesson.id}
            initialContent={lesson.script_content || ''}
            onSaved={onSaved}
          />
        )}
        {detailTab === 'video' && (
          <VideoUpload
            lessonId={lesson.id}
            videoUrl={lesson.video_url}
            onSaved={onSaved}
          />
        )}
        {detailTab === 'quiz' && (
          <QuizBuilder
            lessonId={lesson.id}
            initialQuiz={lesson.quiz_content}
            onSaved={onSaved}
          />
        )}
        {detailTab === 'files' && (
          <FilesManager
            lessonId={lesson.id}
            initialFiles={lesson.lesson_files}
            onSaved={onSaved}
          />
        )}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════
   LESSON ROW  —  expandable with detail panel
   ═══════════════════════════════════════════════════ */

function LessonRow({ lesson, teamMembers, onCycleStatus, onDelete, isExpanded, onToggleExpand, onSaved, onReassign, onRename, onUpdateField }) {
  const member = teamMembers.find((t) => t.id === lesson.assigned_to)
  const overdue = isOverdue(lesson)
  const [editingDate, setEditingDate] = useState(null) // 'date_assigned' | 'due_date' | null
  const [showQuestionPopover, setShowQuestionPopover] = useState(false)
  const [questionNoteValue, setQuestionNoteValue] = useState(lesson.question_note || '')
  const questionRef = useRef(null)
  const noteInputRef = useRef(null)

  /* toggle has_question + open note popover */
  const handleQuestionClick = (e) => {
    e.stopPropagation()
    if (lesson.has_question) {
      /* if already active, clicking opens the note popover */
      setShowQuestionPopover((prev) => !prev)
    } else {
      /* activate and open note popover */
      onUpdateField(lesson.id, 'has_question', true)
      setShowQuestionPopover(true)
    }
  }

  /* save question note */
  const saveQuestionNote = () => {
    onUpdateField(lesson.id, 'question_note', questionNoteValue.trim() || null)
    setShowQuestionPopover(false)
  }

  /* remove question */
  const clearQuestion = () => {
    onUpdateField(lesson.id, 'has_question', false)
    onUpdateField(lesson.id, 'question_note', null)
    setQuestionNoteValue('')
    setShowQuestionPopover(false)
  }

  /* close popover on outside click */
  useEffect(() => {
    if (!showQuestionPopover) return
    const handler = (e) => {
      if (questionRef.current && !questionRef.current.contains(e.target)) {
        setShowQuestionPopover(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showQuestionPopover])

  /* focus note input when popover opens */
  useEffect(() => {
    if (showQuestionPopover && noteInputRef.current) {
      setTimeout(() => noteInputRef.current?.focus(), 50)
    }
  }, [showQuestionPopover])

  return (
    <>
      <tr className={`border-b border-purple-900/20 hover:bg-purple-900/10 transition-colors ${overdue ? 'bg-red-950/20' : ''} ${isExpanded ? 'bg-purple-900/15 border-b-0' : ''}`}>
        <td className="py-2.5 px-3 text-[0.9rem] text-white font-semibold">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggleExpand(lesson.id)}
              className="flex-shrink-0 text-zinc-400 hover:text-purple-400 transition-colors cursor-pointer"
              title={isExpanded ? 'Collapse' : 'Expand to edit script, video & quiz'}
            >
              <ChevronIcon open={isExpanded} />
            </button>
            <InlineEdit
              value={lesson.title}
              onSave={(v) => onRename(lesson.id, v)}
              className="hover:text-purple-300 transition-colors tracking-tight"
            />
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
            {lesson.lesson_files && (() => {
              try {
                const f = typeof lesson.lesson_files === 'string' ? JSON.parse(lesson.lesson_files) : lesson.lesson_files
                return Array.isArray(f) && f.length > 0
              } catch { return false }
            })() && (
              <span className="text-[10px] bg-cyan-900/40 text-cyan-300 ring-1 ring-cyan-700/50 rounded-full px-1.5 py-0.5 font-medium" title="Has files">
                📎
              </span>
            )}
          </div>
        </td>
        <td className="py-2.5 px-3">
          <div className="flex items-center gap-1.5">
            <select
              className="bg-transparent text-sm text-zinc-300 hover:text-zinc-100 focus:text-zinc-100 border-none outline-none cursor-pointer appearance-none pr-2 flex-1 focus:ring-1 focus:ring-purple-500/40 rounded py-0.5"
              value={lesson.assigned_to || ''}
              onChange={(e) => onReassign(lesson.id, e.target.value || null, lesson.assigned_to, lesson.title, lesson.course_id)}
              title="Click to reassign"
            >
              <option value="">Unassigned</option>
              {teamMembers.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            {/* Question icon */}
            <div className="relative flex-shrink-0" ref={questionRef}>
              <button
                onClick={handleQuestionClick}
                className={`w-5 h-5 rounded-full text-[11px] font-bold cursor-pointer transition-all flex items-center justify-center ${
                  lesson.has_question
                    ? 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/50 hover:bg-amber-500/30'
                    : 'text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800'
                }`}
                title={lesson.has_question ? (lesson.question_note || 'Has question — click to edit note') : 'Click to flag a question'}
              >
                ?
              </button>
              {/* Question note popover */}
              {showQuestionPopover && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 w-64 bg-[#1a1530] border border-purple-700/50 rounded-xl shadow-xl shadow-purple-900/30 p-3 space-y-2">
                  {/* Arrow */}
                  <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#1a1530] border-l border-t border-purple-700/50 rotate-45" />
                  <label className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">Question / Note</label>
                  <textarea
                    ref={noteInputRef}
                    className="w-full bg-[#0e0b1a] border border-purple-900/40 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-purple-500/50 resize-none"
                    rows={3}
                    value={questionNoteValue}
                    onChange={(e) => setQuestionNoteValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveQuestionNote() }
                      if (e.key === 'Escape') setShowQuestionPopover(false)
                    }}
                    placeholder="Describe the question…"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={saveQuestionNote}
                      className="bg-purple-600/80 hover:bg-purple-500 text-white rounded-lg px-3 py-1 text-[11px] font-medium transition-colors cursor-pointer"
                    >
                      Save
                    </button>
                    <button
                      onClick={clearQuestion}
                      className="text-[11px] text-zinc-500 hover:text-red-400 transition-colors cursor-pointer"
                    >
                      Remove question
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </td>
        {/* Editable Date Assigned */}
        <td className="py-2.5 px-3 text-sm whitespace-nowrap">
          {editingDate === 'date_assigned' ? (
            <input
              type="date"
              className="bg-[#13102a] border border-purple-700/50 rounded px-1.5 py-0.5 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-purple-500/60 w-[130px] cursor-pointer"
              defaultValue={lesson.date_assigned || ''}
              autoFocus
              onChange={(e) => {
                onUpdateField(lesson.id, 'date_assigned', e.target.value || null)
                setEditingDate(null)
              }}
              onBlur={() => setEditingDate(null)}
              onKeyDown={(e) => { if (e.key === 'Escape') setEditingDate(null) }}
            />
          ) : (
            <span
              className="text-zinc-300 hover:text-purple-300 cursor-pointer transition-colors border-b border-dashed border-transparent hover:border-purple-500/40 pb-0.5"
              onClick={(e) => { e.stopPropagation(); setEditingDate('date_assigned') }}
              title="Click to edit"
            >
              {fmt(lesson.date_assigned)}
            </span>
          )}
        </td>
        {/* Editable Due Date */}
        <td className="py-2.5 px-3 text-sm whitespace-nowrap">
          {editingDate === 'due_date' ? (
            <input
              type="date"
              className="bg-[#13102a] border border-purple-700/50 rounded px-1.5 py-0.5 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-purple-500/60 w-[130px] cursor-pointer"
              defaultValue={lesson.due_date || ''}
              autoFocus
              onChange={(e) => {
                onUpdateField(lesson.id, 'due_date', e.target.value || null)
                setEditingDate(null)
              }}
              onBlur={() => setEditingDate(null)}
              onKeyDown={(e) => { if (e.key === 'Escape') setEditingDate(null) }}
            />
          ) : (
            <span
              className="text-zinc-300 hover:text-purple-300 cursor-pointer transition-colors border-b border-dashed border-transparent hover:border-purple-500/40 pb-0.5"
              onClick={(e) => { e.stopPropagation(); setEditingDate('due_date') }}
              title="Click to edit"
            >
              {fmt(lesson.due_date)}
            </span>
          )}
        </td>
        <td className="py-2.5 px-3 text-sm text-zinc-300 whitespace-nowrap">{fmt(lesson.date_completed)}</td>
        <td className="py-2.5 px-3">
          <StatusBadge status={lesson.script_status} onClick={() => onCycleStatus(lesson.id, 'script_status', lesson.script_status)} />
        </td>
        <td className="py-2.5 px-3">
          <StatusBadge status={lesson.video_status} onClick={() => onCycleStatus(lesson.id, 'video_status', lesson.video_status)} />
        </td>
        <td className="py-2.5 px-3 text-center">
          <button
            onClick={() => onUpdateField(lesson.id, 'approved', !lesson.approved)}
            className={`w-6 h-6 rounded-md text-xs font-bold cursor-pointer transition-all border ${
              lesson.approved
                ? 'bg-emerald-900/50 text-emerald-300 border-emerald-600/60 ring-1 ring-emerald-700/50'
                : 'bg-zinc-800/60 text-zinc-600 border-zinc-700/50 hover:border-zinc-600 hover:text-zinc-400'
            }`}
            title={lesson.approved ? 'Approved — click to unapprove' : 'Click to approve'}
          >
            {lesson.approved ? '✓' : ''}
          </button>
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
          <td colSpan={9} className="p-0">
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
        <th className={th + ' text-center'}>Approved</th>
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

  // celebration animation
  const [showCelebration, setShowCelebration] = useState(false)
  const [celebrationKey, setCelebrationKey] = useState(0)
  const [celebrationMilestone, setCelebrationMilestone] = useState(null)

  // warning toast
  const [warningMsg, setWarningMsg] = useState(null)
  const warningTimer = useRef(null)

  // notifications
  const [notifications, setNotifications] = useState([])
  const [showNotifications, setShowNotifications] = useState(false)

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications],
  )

  /* ─── data fetching ─── */
  const fetchNotifications = useCallback(async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
    setNotifications(data || [])
  }, [])

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
    fetchNotifications()
  }, [fetchNotifications])

  /* ─── mark notification as read ─── */
  const markNotificationRead = async (notifId) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notifId ? { ...n, is_read: true } : n)),
    )
    await supabase.from('notifications').update({ is_read: true }).eq('id', notifId)
  }

  /* ─── send assignment notification (email + in-app) ─── */
  const sendAssignmentNotification = async (teamMemberId, lessonTitle, courseId) => {
    const member = teamMembers.find((t) => t.id === teamMemberId)
    if (!member) return

    /* resolve course → department → company names for the email */
    const course = courses.find((c) => c.id === courseId)
    const dept = course ? departments.find((d) => d.id === course.department_id) : null
    const company = dept ? companies.find((co) => co.id === dept.company_id) : null

    const message = `You were assigned "${lessonTitle}" in ${course?.name || 'a course'}${company ? ` (${company.name})` : ''}`

    /* create in-app notification */
    const { data: notifData } = await supabase.from('notifications').insert({
      team_member_id: teamMemberId,
      message,
      is_read: false,
    }).select()

    if (notifData) {
      setNotifications((prev) => [...notifData, ...prev])
    }

    /* send email (fire-and-forget, don't block UI) */
    if (member.email) {
      fetch('/api/send-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamMemberEmail: member.email,
          teamMemberName: member.name,
          lessonTitle,
          courseName: course?.name || '',
          companyName: company?.name || '',
        }),
      }).catch((err) => console.error('Email notification failed:', err))
    }
  }

  /* ─── send video completion notification (email to manager + in-app) ─── */
  const sendCompletionNotification = async (lesson) => {
    const member = lesson.assigned_to ? teamMembers.find((t) => t.id === lesson.assigned_to) : null
    const memberName = member?.name || 'Unassigned'
    const course = courses.find((c) => c.id === lesson.course_id)
    const dept = course ? departments.find((d) => d.id === course.department_id) : null
    const company = dept ? companies.find((co) => co.id === dept.company_id) : null
    const dateCompleted = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

    const message = `Video completed: "${lesson.title}" by ${memberName}`

    /* create in-app notification */
    const { data: notifData } = await supabase.from('notifications').insert({
      team_member_id: lesson.assigned_to || null,
      message,
      is_read: false,
    }).select()

    if (notifData) {
      setNotifications((prev) => [...notifData, ...prev])
    }

    /* send email to manager (fire-and-forget) */
    fetch('/api/send-notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'completion',
        managerEmail: 'terah.bromley@almallc.com',
        teamMemberName: memberName,
        lessonTitle: lesson.title,
        courseName: course?.name || '',
        companyName: company?.name || '',
        dateCompleted,
      }),
    }).catch((err) => console.error('Completion email failed:', err))
  }

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

  /* ─── update a single lesson field in Supabase + local state ─── */
  const updateLessonField = async (lessonId, field, value) => {
    /* optimistic */
    setLessons((prev) => prev.map((l) => (l.id === lessonId ? { ...l, [field]: value } : l)))
    const { error } = await supabase.from('lessons').update({ [field]: value }).eq('id', lessonId)
    if (error) { console.error(`Update ${field} failed:`, error); fetchAll() }
  }

  /* ─── update course field locally (for course files saves) ─── */
  const updateCourseLocally = (courseId, field, value) => {
    setCourses((prev) => prev.map((c) => (c.id === courseId ? { ...c, [field]: value } : c)))
  }

  /* ─── rename handler (companies, departments, courses, lessons) ─── */
  const renameItem = async (table, id, field, newValue) => {
    /* optimistic local update */
    const setterMap = {
      companies: setCompanies,
      departments: setDepartments,
      courses: setCourses,
      lessons: setLessons,
    }
    const setter = setterMap[table]
    if (setter) {
      setter((prev) =>
        prev.map((item) => (item.id === id ? { ...item, [field]: newValue } : item)),
      )
    }

    const { error } = await supabase.from(table).update({ [field]: newValue }).eq('id', id)
    if (error) {
      console.error(`Rename ${table} failed:`, error)
      fetchAll()
    }
  }

  /* ─── lesson mutations (optimistic) ─── */
  /* helper to show a warning toast */
  const showWarning = (msg) => {
    if (warningTimer.current) clearTimeout(warningTimer.current)
    setWarningMsg(msg)
    warningTimer.current = setTimeout(() => setWarningMsg(null), 3500)
  }

  const cycleStatusHandler = async (lessonId, field, current) => {
    const next = cycleStatus(current)
    const lesson = lessons.find((l) => l.id === lessonId)

    /* block video_status → Completed if no video uploaded */
    if (field === 'video_status' && next === 'Completed' && lesson && !lesson.video_url) {
      showWarning('Please upload a video before marking as complete')
      return
    }

    const updates = { [field]: next }

    if (lesson) {
      const otherField = field === 'script_status' ? 'video_status' : 'script_status'
      if (next === 'Completed' && lesson[otherField] === 'Completed') {
        updates.date_completed = new Date().toISOString().split('T')[0]
      } else if (next !== 'Completed' && lesson.date_completed) {
        updates.date_completed = null
      }
    }

    setLessons((prev) => prev.map((l) => (l.id === lessonId ? { ...l, ...updates } : l)))

    /* trigger celebration when video status goes to Completed */
    if (field === 'video_status' && next === 'Completed') {
      /* count this team member's total completed videos (including this one) */
      let milestoneCount = null
      if (lesson && lesson.assigned_to) {
        const memberId = lesson.assigned_to
        const completedCount = lessons.filter(
          (l) => l.assigned_to === memberId && l.video_status === 'Completed' && l.id !== lessonId,
        ).length + 1 // +1 for the one we just completed
        if (completedCount > 0 && completedCount % 5 === 0) {
          milestoneCount = completedCount
        }
      }
      setCelebrationMilestone(milestoneCount)
      setCelebrationKey((k) => k + 1)
      setShowCelebration(true)
    }

    const { error } = await supabase.from('lessons').update(updates).eq('id', lessonId)
    if (error) {
      console.error('Status update failed:', error)
      fetchAll()
    }

    /* send completion notification when video status → Completed */
    if (field === 'video_status' && next === 'Completed' && lesson) {
      sendCompletionNotification(lesson)
    }
  }

  /* ─── reassign handler ─── */
  const reassignHandler = async (lessonId, newMemberId, oldMemberId, lessonTitle, courseId) => {
    /* optimistic update */
    setLessons((prev) =>
      prev.map((l) => (l.id === lessonId ? { ...l, assigned_to: newMemberId } : l)),
    )

    const { error } = await supabase
      .from('lessons')
      .update({ assigned_to: newMemberId })
      .eq('id', lessonId)

    if (error) {
      console.error('Reassign failed:', error)
      fetchAll()
      return
    }

    /* send notification if assigned to someone new */
    if (newMemberId && newMemberId !== oldMemberId) {
      sendAssignmentNotification(newMemberId, lessonTitle, courseId)
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
      } else if (type === 'team_member') {
        /* unassign any lessons referencing this team member first */
        await supabase.from('lessons').update({ assigned_to: null }).eq('assigned_to', id)
        /* remove their notifications */
        await supabase.from('notifications').delete().eq('team_member_id', id)
        await supabase.from('team_members').delete().eq('id', id)
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
    'manage-team': 'Manage Team',
  }

  /* ─── helpers for hierarchy (sorted alphabetically) ─── */
  const sortedCompanies = useMemo(
    () => [...companies].sort((a, b) => a.name.localeCompare(b.name)),
    [companies],
  )
  const deptsFor = (companyId) =>
    departments
      .filter((d) => d.company_id === companyId)
      .sort((a, b) => a.name.localeCompare(b.name))
  const coursesFor = (deptId) =>
    courses
      .filter((c) => c.department_id === deptId)
      .sort((a, b) => a.name.localeCompare(b.name))
  const lessonsFor = (courseId) =>
    lessons
      .filter((l) => l.course_id === courseId)
      .sort((a, b) => (a.title || '').localeCompare(b.title || ''))

  /* ─── render ─── */
  return (
    <div className="min-h-screen bg-[#09071a] text-zinc-100">
      {/* ── HEADER ── */}
      <header className="sticky top-0 z-40 bg-[#09071a]/80 backdrop-blur-md border-b border-purple-900/30">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-3 flex-1">
            <img src="/mentra_logo_light.png" alt="Mentra" className="h-10 w-auto" />
            <div>
              <h1 className="text-lg font-bold text-white leading-tight">Mentra Video Catalog</h1>
              <p className="text-xs text-zinc-500">Production Tracker</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
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

            {/* ── Manage Team ── */}
            <button
              onClick={() => setModal({ type: 'manage-team' })}
              className="flex items-center gap-1.5 bg-zinc-800/60 hover:bg-zinc-700/60 text-zinc-400 hover:text-purple-300 border border-zinc-700/40 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ml-1"
              title="Manage Team"
            >
              <UsersIcon size={14} />
              Manage Team
            </button>

            {/* ── Bell Icon ── */}
            <div className="relative ml-1">
              <button
                onClick={() => setShowNotifications((v) => !v)}
                className="relative flex items-center justify-center w-9 h-9 rounded-lg bg-zinc-800/60 hover:bg-zinc-700/60 text-zinc-400 hover:text-purple-300 border border-zinc-700/40 transition-colors cursor-pointer"
                title="Notifications"
              >
                <BellIcon size={18} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center bg-purple-600 text-white text-[10px] font-bold rounded-full px-1 ring-2 ring-[#09071a]">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
              {showNotifications && (
                <NotificationDropdown
                  notifications={notifications}
                  onMarkRead={markNotificationRead}
                  onClose={() => setShowNotifications(false)}
                />
              )}
            </div>
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

            {sortedCompanies.length === 0 && (
              <div className="text-center py-20 text-zinc-600">
                <p className="text-lg mb-2">No companies yet</p>
                <p className="text-sm">Click <strong className="text-purple-400">+ Company</strong> above to get started.</p>
              </div>
            )}

            {/* ── COMPANY LEVEL ── */}
            <div className="space-y-3">
              {sortedCompanies.map((company) => {
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
                      <InlineEdit
                        value={company.name}
                        onSave={(v) => renameItem('companies', company.id, 'name', v)}
                        className="font-semibold text-white"
                      />
                      {company.is_evergreen && (
                        <span className="bg-emerald-900/40 text-emerald-400 ring-1 ring-emerald-700/50 text-[10px] font-semibold rounded-full px-2 py-0.5">
                          🌿 EVERGREEN
                        </span>
                      )}
                      <span className="ml-auto text-[0.8rem] text-zinc-400">
                        <span className="font-semibold text-zinc-200">{companyDepts.length}</span> dept{companyDepts.length !== 1 && 's'} <span className="text-zinc-500">·</span> <span className="font-semibold text-zinc-200">{companyLessons.length}</span> lesson{companyLessons.length !== 1 && 's'}
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
                                <InlineEdit
                                  value={dept.name}
                                  onSave={(v) => renameItem('departments', dept.id, 'name', v)}
                                  className="font-medium text-purple-200 text-sm"
                                />
                                <span className="ml-auto text-[0.8rem] text-zinc-400">
                                  <span className="font-semibold text-zinc-200">{deptCourses.length}</span> course{deptCourses.length !== 1 && 's'} <span className="text-zinc-500">·</span> <span className="font-semibold text-zinc-200">{deptLessons.length}</span> lesson{deptLessons.length !== 1 && 's'}
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
                                          <InlineEdit
                                            value={course.name}
                                            onSave={(v) => renameItem('courses', course.id, 'name', v)}
                                            className="font-medium text-purple-300/80 text-sm"
                                          />
                                          {/* Course files badge */}
                                          {course.course_files && (() => {
                                            try {
                                              const f = typeof course.course_files === 'string' ? JSON.parse(course.course_files) : course.course_files
                                              return Array.isArray(f) && f.length > 0
                                            } catch { return false }
                                          })() && (
                                            <span className="text-[10px] bg-purple-900/40 text-purple-300 ring-1 ring-purple-700/50 rounded-full px-1.5 py-0.5 font-medium" title="Has shared files">
                                              📎
                                            </span>
                                          )}
                                          <span className="ml-auto text-[0.8rem] text-zinc-400">
                                            <span className="font-semibold text-zinc-200">{cLessons.length}</span> lesson{cLessons.length !== 1 && 's'}
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
                                            {/* Course-level shared files */}
                                            <div className="mb-3 p-3 rounded-lg border border-purple-900/20 bg-[#0c0a1a]">
                                              <CourseFilesManager
                                                courseId={course.id}
                                                initialFiles={course.course_files}
                                                onSaved={updateCourseLocally}
                                              />
                                            </div>

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
                                                        onDelete={(id, title) => requestDelete('lesson', id, title)}
                                                        isExpanded={!!exp.lessons[lesson.id]}
                                                        onToggleExpand={(id) => toggle('lessons', id)}
                                                        onSaved={updateLessonLocally}
                                                        onReassign={reassignHandler}
                                                        onRename={(id, v) => renameItem('lessons', id, 'title', v)}
                                                        onUpdateField={updateLessonField}
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
            onAssigned={sendAssignmentNotification}
          />
        )}
        {modal?.type === 'team' && <AddTeamMemberForm onDone={modalDone} />}
        {modal?.type === 'manage-team' && (
          <ManageTeamList
            teamMembers={teamMembers}
            onDelete={(id, name) => requestDelete('team_member', id, name)}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirmDelete}
        name={confirmDelete?.name || ''}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
        deleting={deleting}
      />

      <CelebrationPopup
        key={celebrationKey}
        visible={showCelebration}
        onDone={() => setShowCelebration(false)}
        milestone={celebrationMilestone}
      />

      {/* Warning toast */}
      {warningMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] animate-[slideUpFadeIn_0.3s_ease-out]">
          <div className="bg-amber-950/90 border border-amber-700/60 text-amber-200 rounded-xl px-5 py-3 shadow-lg shadow-amber-900/30 flex items-center gap-3 max-w-md">
            <span className="text-xl">⚠️</span>
            <p className="text-sm font-medium">{warningMsg}</p>
            <button
              onClick={() => setWarningMsg(null)}
              className="text-amber-500 hover:text-amber-300 ml-2 text-lg leading-none cursor-pointer"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUpFadeIn {
          0% { opacity: 0; transform: translateX(-50%) translateY(20px); }
          100% { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  )
}
