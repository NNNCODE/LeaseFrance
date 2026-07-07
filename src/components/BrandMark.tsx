// Baillio brand mark: ascending bars + swoosh + dot.
// Mirrors the website brand asset; colors read well on light and dark surfaces.
interface BrandMarkProps {
  className?: string
  idPrefix?: string
}

export default function BrandMark({ className = 'w-8 h-8', idPrefix = 'bm' }: BrandMarkProps) {
  return (
    <svg className={className} viewBox="7.5 9.5 47 49.5" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id={`${idPrefix}-bars`} x1="0" y1="0" x2="0.9" y2="1">
          <stop offset="0" stopColor="#38b6e8" />
          <stop offset="1" stopColor="#5b4ce6" />
        </linearGradient>
        <linearGradient id={`${idPrefix}-swoosh`} x1="0" y1="1" x2="1" y2="0.55">
          <stop offset="0" stopColor="#5937db" />
          <stop offset="1" stopColor="#7c3aed" />
        </linearGradient>
        <clipPath id={`${idPrefix}-cut`}>
          <path d="M -10 -10 H 74 V 34.76 L 48.59 34.76 C 34.30 39.37 19.10 50.43 6.19 55.96 L -10 55.96 Z" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${idPrefix}-cut)`}>
        <path d="M 10.34 32.00 L 18.18 29.24 V 60 H 10.34 Z" fill={`url(#${idPrefix}-bars)`} />
        <path d="M 21.40 24.17 L 29.24 21.40 V 60 H 21.40 Z" fill={`url(#${idPrefix}-bars)`} />
        <path d="M 32.46 14.49 L 40.29 11.72 V 60 H 32.46 Z" fill={`url(#${idPrefix}-bars)`} />
      </g>
      <path
        d="M 8.96 54.58 C 20.02 49.05 33.84 40.29 48.59 36.61 L 48.59 44.90 C 32.00 49.51 20.02 53.66 9.88 57.80 Z"
        fill={`url(#${idPrefix}-swoosh)`}
      />
      <circle cx="49.05" cy="25.55" r="4.15" fill="#6d28d9" />
    </svg>
  )
}
