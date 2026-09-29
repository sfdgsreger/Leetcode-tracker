import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import CheckInModal from '../components/CheckInModal'
import StatCard from '../components/StatCard'

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Returns 'YYYY-MM-DD' in the user's local timezone */
function localDateString(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/** Calculates current streak from an array of ISO date strings (sorted desc) */
function calcStreak(checkinDates) {
  if (!checkinDates.length) return 0

  // Normalise to local date strings
  const dates = checkinDates
    .map((d) => localDateString(new Date(d)))
    .sort()
    .reverse() // most recent first

  const today     = localDateString()
  const yesterday = localDateString(new Date(Date.now() - 86_400_000))

  // Streak only counts if the user checked in today or yesterday
  if (dates[0] !== today && dates[0] !== yesterday) return 0

  let streak = 1
  for (let i = 1; i < dates.length; i++) {
    const expected = localDateString(
      new Date(new Date(dates[i - 1]).getTime() - 86_400_000)
    )
    if (dates[i] === expected) {
      streak++
    } else {
      break
    }
  }
  return streak
}

/** ms remaining until midnight local time */
function msUntilMidnight() {
  const now      = new Date()
  const midnight = new Date(now)
  midnight.setHours(24, 0, 0, 0)
  return midnight.getTime() - now.getTime()
}

/** Format ms as HH:MM:SS */
function formatCountdown(ms) {
  if (ms <= 0) return '00:00:00'
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':')
}

// ─────────────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { user, profile } = useAuth()

  const [checkins, setCheckins]         = useState([])   // all user check-ins
  const [todayCheckin, setTodayCheckin] = useState(null) // today's check-in row
  const [questions, setQuestions]       = useState([])   // all user questions
  const [streak, setStreak]             = useState(0)
  const [loadingData, setLoadingData]   = useState(true)
  const [error, setError]               = useState('')

  const [showModal, setShowModal]       = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  // Countdown state
  const [countdown, setCountdown] = useState(msUntilMidnight())

  // ── Data fetching ────────────────────────────────────────────────────────

  const fetchDashboardData = useCallback(async () => {
    if (!user) return
    setLoadingData(true)
    setError('')

    try {
      // Fetch all check-ins for this user
      const { data: checkinData, error: checkinErr } = await supabase
        .from('checkins')
        .select('*')
        .eq('user_id', user.id)
        .order('checkin_date', { ascending: false })

      if (checkinErr) throw checkinErr

      // Fetch all questions for this user
      const { data: questionData, error: questionErr } = await supabase
        .from('questions')
        .select('*')
        .eq('user_id', user.id)

      if (questionErr) throw questionErr

      const today = localDateString()
      const todayRow = checkinData?.find(
        (c) => localDateString(new Date(c.checkin_date)) === today
      ) ?? null

      setCheckins(checkinData ?? [])
      setTodayCheckin(todayRow)
      setQuestions(questionData ?? [])
      setStreak(calcStreak((checkinData ?? []).map((c) => c.checkin_date)))
    } catch (err) {
      setError(err.message ?? 'Failed to load data.')
    } finally {
      setLoadingData(false)
    }
  }, [user])

  useEffect(() => { fetchDashboardData() }, [fetchDashboardData])

  // ── Countdown timer ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!todayCheckin) return // no need to tick if not checked in

    const tick = () => {
      const ms = msUntilMidnight()
      setCountdown(ms)
      if (ms <= 0) {
        // Midnight crossed — refresh data so the button re-enables
        fetchDashboardData()
      }
    }

    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [todayCheckin, fetchDashboardData])

  // ── Check-in submission ──────────────────────────────────────────────────

  async function handleCheckInSubmit(questionNumbers) {
    setError('')
    const now = new Date().toISOString()

    // 1. Insert check-in row
    const { data: checkinRow, error: ciErr } = await supabase
      .from('checkins')
      .insert({ user_id: user.id, checkin_date: now })
      .select()
      .single()

    if (ciErr) {
      // Duplicate = already checked in today
      if (ciErr.code === '23505') {
        setError('You already checked in today!')
      } else {
        setError(ciErr.message)
      }
      return false
    }

    // 2. Insert each question
    if (questionNumbers.length > 0) {
      const rows = questionNumbers.map((qNum) => ({
        checkin_id:      checkinRow.id,
        user_id:         user.id,
        question_number: Number(qNum),
        submitted_at:    now,
      }))

      const { error: qErr } = await supabase.from('questions').insert(rows)
      if (qErr) {
        setError(qErr.message)
        return false
      }
    }

    // 3. Refresh local state
    await fetchDashboardData()
    setSubmitSuccess(true)
    setTimeout(() => setSubmitSuccess(false), 4000)
    return true
  }

  // ── Derived stats ────────────────────────────────────────────────────────

  const totalQuestions = questions.length
  const totalDays      = checkins.length
  const checkedInToday = Boolean(todayCheckin)

  // Recent 7 days activity for the mini heatmap
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d    = new Date(Date.now() - i * 86_400_000)
    const ds   = localDateString(d)
    const done = checkins.some((c) => localDateString(new Date(c.checkin_date)) === ds)
    return { date: ds, done, label: d.toLocaleDateString('en-US', { weekday: 'short' }) }
  }).reverse()

  // ── Render ───────────────────────────────────────────────────────────────

  if (loadingData) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-brand-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 animate-fade-in">

      {/* ── Header ── */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Hey, {profile?.display_name || 'there'} 👋
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
          })}
        </p>
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* ── Success banner ── */}
      {submitSuccess && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 text-sm flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Check-in recorded! Keep the streak alive 🔥
        </div>
      )}

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
        <StatCard
          icon="🔥"
          label="Current Streak"
          value={streak}
          unit={streak === 1 ? 'day' : 'days'}
          highlight
        />
        <StatCard
          icon="✅"
          label="Total Check-ins"
          value={totalDays}
          unit={totalDays === 1 ? 'day' : 'days'}
        />
        <StatCard
          icon="🧩"
          label="Questions Solved"
          value={totalQuestions}
          unit="total"
          className="col-span-2 sm:col-span-1"
        />
      </div>

      {/* ── Check-in Card ── */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
          Daily Check-in
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
          Log your LeetCode session to keep your streak alive.
        </p>

        {checkedInToday ? (
          /* Already checked in — show countdown */
          <div className="flex flex-col items-center py-4 gap-3">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium text-sm">You're checked in for today!</span>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400">
              Next check-in unlocks in
            </p>

            <div className="flex items-center gap-1">
              {formatCountdown(countdown).split(':').map((seg, idx) => (
                <span key={idx} className="flex items-end gap-0.5">
                  <span className="font-mono text-2xl font-bold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-2">
                    {seg}
                  </span>
                  {idx < 2 && (
                    <span className="text-xl font-bold text-gray-400 dark:text-gray-500 mb-1">:</span>
                  )}
                </span>
              ))}
            </div>

            <p className="text-xs text-gray-400 dark:text-gray-500">HH : MM : SS</p>

            {/* Today's solved questions */}
            {(() => {
              const todayQs = questions.filter(
                (q) => q.checkin_id === todayCheckin?.id
              )
              return todayQs.length > 0 ? (
                <div className="w-full mt-2 pt-4 border-t border-gray-100 dark:border-gray-800">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Today you solved {todayQs.length} question{todayQs.length > 1 ? 's' : ''}:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {todayQs.map((q) => (
                      <a
                        key={q.id}
                        href={`https://leetcode.com/problems/?difficulty=&page=1&search=${q.question_number}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 rounded-full text-xs font-semibold
                                   bg-brand-100 text-brand-700
                                   dark:bg-brand-900/30 dark:text-brand-300
                                   hover:bg-brand-200 dark:hover:bg-brand-900/50
                                   transition"
                      >
                        #{q.question_number}
                      </a>
                    ))}
                  </div>
                </div>
              ) : null
            })()}
          </div>
        ) : (
          /* Not yet checked in — show button */
          <button
            onClick={() => setShowModal(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-2
                       px-6 py-3 rounded-xl font-semibold text-white
                       bg-brand-500 hover:bg-brand-600 active:bg-brand-700
                       shadow-sm hover:shadow-md
                       focus:outline-none focus:ring-2 focus:ring-brand-400 focus:ring-offset-2
                       dark:focus:ring-offset-gray-900
                       transition-all"
          >
            <span className="text-xl">🔥</span>
            Check in for today
          </button>
        )}
      </div>

      {/* ── 7-day activity strip ── */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
          Last 7 days
        </h2>
        <div className="flex justify-between gap-2">
          {last7.map(({ date, done, label }) => (
            <div key={date} className="flex flex-col items-center gap-1.5 flex-1">
              <div
                title={date}
                className={`w-full aspect-square rounded-lg transition-colors ${
                  done
                    ? 'bg-brand-400 dark:bg-brand-500'
                    : 'bg-gray-100 dark:bg-gray-800'
                }`}
              />
              <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Check-in Modal ── */}
      {showModal && (
        <CheckInModal
          onClose={() => setShowModal(false)}
          onSubmit={handleCheckInSubmit}
        />
      )}
    </div>
  )
}
