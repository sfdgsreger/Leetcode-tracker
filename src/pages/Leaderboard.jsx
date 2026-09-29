import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

// ── Helpers (duplicated from Dashboard to keep pages self-contained) ─────────

function localDateString(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function calcStreak(checkinDates) {
  if (!checkinDates.length) return 0
  const dates = checkinDates
    .map((d) => localDateString(new Date(d)))
    .sort()
    .reverse()

  const today     = localDateString()
  const yesterday = localDateString(new Date(Date.now() - 86_400_000))

  if (dates[0] !== today && dates[0] !== yesterday) return 0

  let streak = 1
  for (let i = 1; i < dates.length; i++) {
    const expected = localDateString(
      new Date(new Date(dates[i - 1]).getTime() - 86_400_000)
    )
    if (dates[i] === expected) streak++
    else break
  }
  return streak
}

// ── Rank badge ────────────────────────────────────────────────────────────────

function RankBadge({ rank }) {
  if (rank === 1) return <span className="text-xl" title="1st place">🥇</span>
  if (rank === 2) return <span className="text-xl" title="2nd place">🥈</span>
  if (rank === 3) return <span className="text-xl" title="3rd place">🥉</span>
  return (
    <span className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs font-bold flex items-center justify-center">
      {rank}
    </span>
  )
}

// ── Sort indicator ────────────────────────────────────────────────────────────

function SortIcon({ active, direction }) {
  return (
    <span className={`ml-1 inline-flex flex-col gap-[2px] ${active ? 'opacity-100' : 'opacity-30'}`}>
      <svg
        className={`w-2.5 h-2.5 transition-transform ${active && direction === 'asc' ? 'text-brand-500' : 'text-gray-400'}`}
        viewBox="0 0 10 6" fill="currentColor"
      >
        <path d="M5 0L10 6H0L5 0Z" />
      </svg>
      <svg
        className={`w-2.5 h-2.5 transition-transform ${active && direction === 'desc' ? 'text-brand-500' : 'text-gray-400'}`}
        viewBox="0 0 10 6" fill="currentColor"
      >
        <path d="M5 6L0 0H10L5 6Z" />
      </svg>
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export default function Leaderboard() {
  const { user } = useAuth()

  const [rows, setRows]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [lastRefresh, setLastRefresh] = useState(null)

  // Sort state — primary: streak desc, secondary: questions desc (defaults)
  const [sortKey, setSortKey]   = useState('streak')
  const [sortDir, setSortDir]   = useState('desc')

  // ── Fetch & compute ────────────────────────────────────────────────────────

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      // Fetch all users
      const { data: users, error: uErr } = await supabase
        .from('users')
        .select('id, display_name, email')

      if (uErr) throw uErr

      // Fetch all check-ins
      const { data: checkins, error: cErr } = await supabase
        .from('checkins')
        .select('id, user_id, checkin_date')

      if (cErr) throw cErr

      // Fetch all questions (we only need count per user)
      const { data: questions, error: qErr } = await supabase
        .from('questions')
        .select('user_id')

      if (qErr) throw qErr

      const today = localDateString()

      // Build a map: user_id → question count
      const questionCount = {}
      for (const q of questions ?? []) {
        questionCount[q.user_id] = (questionCount[q.user_id] ?? 0) + 1
      }

      // Build a map: user_id → checkin dates array
      const checkinMap = {}
      for (const c of checkins ?? []) {
        if (!checkinMap[c.user_id]) checkinMap[c.user_id] = []
        checkinMap[c.user_id].push({ date: c.checkin_date, id: c.id })
      }

      // Assemble leaderboard rows
      const leaderboardRows = (users ?? []).map((u) => {
        const userCheckins = checkinMap[u.id] ?? []
        const dates        = userCheckins.map((c) => c.date)
        const streak       = calcStreak(dates)
        const checkedToday = userCheckins.some(
          (c) => localDateString(new Date(c.date)) === today
        )
        return {
          id:            u.id,
          displayName:   u.display_name || u.email?.split('@')[0] || 'Anonymous',
          streak,
          totalQuestions: questionCount[u.id] ?? 0,
          totalDays:     userCheckins.length,
          checkedToday,
          isCurrentUser: u.id === user?.id,
        }
      })

      setRows(leaderboardRows)
      setLastRefresh(new Date())
    } catch (err) {
      setError(err.message ?? 'Failed to load leaderboard.')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { fetchLeaderboard() }, [fetchLeaderboard])

  // ── Sorting ────────────────────────────────────────────────────────────────

  function handleSort(key) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const sorted = [...rows].sort((a, b) => {
    const dir = sortDir === 'desc' ? -1 : 1
    if (sortKey === 'streak') {
      if (b.streak !== a.streak) return dir * (b.streak - a.streak)
      return dir * (b.totalQuestions - a.totalQuestions) // tiebreak
    }
    if (sortKey === 'questions') return dir * (b.totalQuestions - a.totalQuestions)
    if (sortKey === 'days')      return dir * (b.totalDays - a.totalDays)
    if (sortKey === 'name')      return dir * a.displayName.localeCompare(b.displayName)
    return 0
  })

  // ── Column header helper ───────────────────────────────────────────────────

  function Th({ label, colKey, align = 'right', className = '' }) {
    const active = sortKey === colKey
    return (
      <th
        scope="col"
        className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide cursor-pointer select-none
                    text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition
                    ${align === 'right' ? 'text-right' : 'text-left'} ${className}`}
        onClick={() => handleSort(colKey)}
        aria-sort={active ? (sortDir === 'desc' ? 'descending' : 'ascending') : 'none'}
      >
        <span className="inline-flex items-center gap-1">
          {label}
          <SortIcon active={active} direction={sortDir} />
        </span>
      </th>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Leaderboard 🏆
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Ranked by current streak, then total questions
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastRefresh && (
            <span className="text-xs text-gray-400 dark:text-gray-500">
              Updated {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={fetchLeaderboard}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
                       border border-gray-300 dark:border-gray-700
                       text-gray-700 dark:text-gray-300
                       hover:bg-gray-50 dark:hover:bg-gray-800
                       disabled:opacity-50 disabled:cursor-not-allowed
                       transition"
          >
            <svg
              className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-16 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Table */}
      {!loading && sorted.length === 0 && (
        <div className="text-center py-20 text-gray-400 dark:text-gray-500">
          <div className="text-5xl mb-3">🏜️</div>
          <p className="font-medium">No data yet</p>
          <p className="text-sm mt-1">Be the first to check in!</p>
        </div>
      )}

      {!loading && sorted.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" role="table">
              <thead className="border-b border-gray-200 dark:border-gray-800">
                <tr className="bg-gray-50 dark:bg-gray-800/50">
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 w-12">
                    #
                  </th>
                  <Th label="Name"     colKey="name"      align="left" />
                  <th scope="col" className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Today
                  </th>
                  <Th label="Streak"    colKey="streak"    />
                  <Th label="Questions" colKey="questions" />
                  <Th label="Days"      colKey="days"      className="hidden sm:table-cell" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {sorted.map((row, idx) => {
                  const rank = idx + 1
                  return (
                    <tr
                      key={row.id}
                      className={`transition-colors
                        ${row.isCurrentUser
                          ? 'bg-brand-50 dark:bg-brand-900/10 hover:bg-brand-100 dark:hover:bg-brand-900/20'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                        }`}
                    >
                      {/* Rank */}
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center">
                          <RankBadge rank={rank} />
                        </div>
                      </td>

                      {/* Name */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2.5">
                          {/* Avatar */}
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0
                              ${row.isCurrentUser
                                ? 'bg-brand-400 text-white'
                                : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                              }`}
                            aria-hidden="true"
                          >
                            {row.displayName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className={`font-medium ${row.isCurrentUser ? 'text-brand-600 dark:text-brand-400' : 'text-gray-900 dark:text-white'}`}>
                              {row.displayName}
                              {row.isCurrentUser && (
                                <span className="ml-1.5 text-xs font-normal text-brand-400 dark:text-brand-500">(you)</span>
                              )}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Checked in today */}
                      <td className="px-4 py-4 text-center">
                        {row.checkedToday ? (
                          <span
                            title="Checked in today"
                            className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30"
                          >
                            <svg className="w-3.5 h-3.5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                          </span>
                        ) : (
                          <span
                            title="Not checked in today"
                            className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800"
                          >
                            <svg className="w-3.5 h-3.5 text-gray-400 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </span>
                        )}
                      </td>

                      {/* Streak */}
                      <td className="px-4 py-4 text-right">
                        <span className={`font-bold text-base ${row.streak > 0 ? 'text-brand-500 dark:text-brand-400' : 'text-gray-400 dark:text-gray-600'}`}>
                          {row.streak > 0 ? `${row.streak}` : '—'}
                        </span>
                        {row.streak > 0 && (
                          <span className="ml-0.5 text-xs text-gray-400 dark:text-gray-500"> 🔥</span>
                        )}
                      </td>

                      {/* Total questions */}
                      <td className="px-4 py-4 text-right">
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {row.totalQuestions}
                        </span>
                      </td>

                      {/* Total days */}
                      <td className="px-4 py-4 text-right hidden sm:table-cell">
                        <span className="text-gray-500 dark:text-gray-400">
                          {row.totalDays}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Footer legend */}
          <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/30 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400 dark:text-gray-500">
            <span>Click any column header to sort</span>
            <span>·</span>
            <span>Streak = consecutive daily check-ins</span>
          </div>
        </div>
      )}
    </div>
  )
}
