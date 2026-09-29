export default function StatCard({ icon, label, value, unit, highlight = false, className = '' }) {
  return (
    <div
      className={`
        relative rounded-2xl border p-5 shadow-sm transition-all
        ${highlight
          ? 'bg-brand-500 border-brand-500 text-white shadow-brand-200 dark:shadow-brand-900/40'
          : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white'
        }
        ${className}
      `}
    >
      <div className="text-2xl mb-2">{icon}</div>
      <div className={`text-3xl font-bold leading-none mb-1 ${highlight ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
        {value}
      </div>
      <div className={`text-xs font-medium uppercase tracking-wide ${highlight ? 'text-brand-100' : 'text-gray-500 dark:text-gray-400'}`}>
        {unit}
      </div>
      <div className={`text-xs mt-1 ${highlight ? 'text-brand-100' : 'text-gray-400 dark:text-gray-500'}`}>
        {label}
      </div>
    </div>
  )
}
