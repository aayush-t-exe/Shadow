/** Shadow's mark: a crescent cut from an indigo disc. Same geometry as the tray icon. */
export function Logo({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-label="Shadow">
      <defs>
        <linearGradient id="shadow-logo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#a89fff" />
          <stop offset="1" stopColor="#5b4be8" />
        </linearGradient>
        <mask id="shadow-cut">
          <rect width="32" height="32" fill="#fff" />
          <circle cx="22.4" cy="11.5" r="11.5" fill="#000" />
        </mask>
      </defs>
      <circle cx="16" cy="16" r="14" fill="url(#shadow-logo)" mask="url(#shadow-cut)" />
    </svg>
  )
}
