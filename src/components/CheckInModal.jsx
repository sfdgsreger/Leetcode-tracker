import { useState, useEffect, useRef } from 'react'

const MAX_QUESTIONS = 20

export default function CheckInModal({ onClose, onSubmit }) {
  // Step 1: ask how many; Step 2: collect question numbers
  const [step, setStep]               = useState(1)
  const [count, setCount]             = useState('')
  const [questionNums, setQuestionNums] = useState([])
  const [error, setError]             = useState('')
  const [submitting, setSubmitting]   = useState(false)

  const firstInputRef = useRef(null)

  // Focus the first question number input when step 2 renders
  useEffect(() => {
    if (step === 2) {
      setTimeout(() => firstInputRef.current?.focus(), 50)
    }
  }, [step])

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // ── Step 1 ────────────────────────────────────────────────────────────────

  function handleCountSubmit(e) {
    e.preventDefault()
    setError('')
    const num = parseInt(count, 10)
    if (isNaN(num) || num < 1) {
      setError('Please enter a number ≥ 1.')
      return
    }
    if (num > MAX_QUESTIONS) {
      setError(`Maximum ${MAX_QUESTIONS} questions per day.`)
      return
    }
    setQuestionNums(Array(num).fill(''))
    setStep(2)
  }

  // ── Step 2 ────────────────────────────────────────────────────────────────

  function handleQuestionChange(idx, val) {
    // Allow only numeric input
    if (val !== '' && !/^\d+$/.test(val)) return
    setQuestionNums((prev) => {
      const next = [...prev]
      next[idx] = val
      return next
    })
  }

  async function handleFinalSubmit(e) {
    e.preventDefault()
    setError('')

    // Validate: all fields filled, values 1–9999
    const nums = questionNums.map((v) => v.trim())
    if (nums.some((v) => v === '')) {
      setError('Please fill in all question numbers.')
      return
    }
    if (nums.some((v) => Number(v) < 1 || Number(v) > 9999)) {
      setError('Question numbers must be between 1 and 9999.')
      return
    }

    setSubmitting(true)
    const ok = await onSubmit(nums.map(Number))
    setSubmitting(false)

    if (ok) onClose()
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center
                 bg-black/50 backdrop-blur-sm animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-label="Daily check-in"
    >
      <div
        className="w-full sm:max-w-md bg-white dark:bg-gray-900
                   rounded-t-2xl sm:rounded-2xl shadow-2xl
                   border border-gray-200 dark:border-gray-800
                   p-6 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {step === 1 ? "Today's check-in 🔥" : 'Enter question numbers'}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {step === 1
                ? 'How many problems did you solve today?'
                : `Enter the ${questionNums.length} LeetCode question number${questionNums.length > 1 ? 's' : ''} you solved.`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition p-1 rounded-lg"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 px-3 py-2.5 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* ── Step 1: count ── */}
        {step === 1 && (
          <form onSubmit={handleCountSubmit} className="space-y-4">
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={1}
                max={MAX_QUESTIONS}
                value={count}
                onChange={(e) => setCount(e.target.value)}
                placeholder="e.g. 3"
                autoFocus
                className="flex-1 px-4 py-3 text-lg rounded-xl border border-gray-300 dark:border-gray-700
                           bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                           placeholder-gray-400 dark:placeholder-gray-500
                           focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent
                           transition"
              />
            </div>

            {/* Quick-pick buttons */}
            <div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">Quick pick:</p>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setCount(String(n))}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold transition
                      ${String(n) === count
                        ? 'bg-brand-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-brand-100 dark:hover:bg-brand-900/30 hover:text-brand-600 dark:hover:text-brand-400'
                      }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl font-semibold text-white
                         bg-brand-500 hover:bg-brand-600 active:bg-brand-700
                         focus:outline-none focus:ring-2 focus:ring-brand-400 focus:ring-offset-2
                         dark:focus:ring-offset-gray-900
                         transition"
            >
              Next →
            </button>
          </form>
        )}

        {/* ── Step 2: question numbers ── */}
        {step === 2 && (
          <form onSubmit={handleFinalSubmit} className="space-y-4">
            <div
              className="grid gap-3"
              style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))' }}
            >
              {questionNums.map((val, idx) => (
                <div key={idx}>
                  <label
                    htmlFor={`q-${idx}`}
                    className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1"
                  >
                    Problem {idx + 1}
                  </label>
                  <input
                    id={`q-${idx}`}
                    ref={idx === 0 ? firstInputRef : null}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={4}
                    value={val}
                    onChange={(e) => handleQuestionChange(idx, e.target.value)}
                    placeholder="e.g. 42"
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700
                               bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                               placeholder-gray-400 dark:placeholder-gray-500
                               focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent
                               transition text-sm"
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => { setStep(1); setError('') }}
                className="flex-1 py-2.5 rounded-xl font-medium text-sm
                           border border-gray-300 dark:border-gray-700
                           text-gray-700 dark:text-gray-300
                           hover:bg-gray-50 dark:hover:bg-gray-800
                           focus:outline-none focus:ring-2 focus:ring-gray-300
                           transition"
              >
                ← Back
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-2.5 rounded-xl font-semibold text-white text-sm
                           bg-brand-500 hover:bg-brand-600 active:bg-brand-700
                           disabled:opacity-60 disabled:cursor-not-allowed
                           focus:outline-none focus:ring-2 focus:ring-brand-400 focus:ring-offset-2
                           dark:focus:ring-offset-gray-900
                           transition flex items-center justify-center gap-2"
              >
                {submitting && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                {submitting ? 'Saving…' : 'Submit 🔥'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
