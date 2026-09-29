import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'

/**
 * Shell layout: sticky Navbar + scrollable page content.
 * Used by all authenticated (and public) routes that need the nav.
 */
export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950 transition-colors">
      <Navbar />
      <main className="flex-1 w-full">
        <Outlet />
      </main>
      <footer className="py-4 text-center text-xs text-gray-400 dark:text-gray-600 border-t border-gray-100 dark:border-gray-900">
        LeetCode Streak Tracker &mdash; keep the flame alive 🔥
      </footer>
    </div>
  )
}
