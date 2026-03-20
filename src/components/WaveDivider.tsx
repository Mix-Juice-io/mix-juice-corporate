interface WaveDividerProps {
  from?: string
  to?: string
  flip?: boolean
}

export default function WaveDivider({ from = 'var(--color-bg)', to = 'var(--color-bg-alt)', flip = false }: WaveDividerProps) {
  return (
    <div className="section-divider" style={{ transform: flip ? 'scaleY(-1)' : undefined }}>
      <svg viewBox="0 0 1440 60" preserveAspectRatio="none">
        <defs>
          <linearGradient id={`wave-${flip ? 'flip' : 'normal'}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={from} />
            <stop offset="100%" stopColor={to} />
          </linearGradient>
        </defs>
        <path
          d="M0,20 C240,60 480,0 720,30 C960,60 1200,10 1440,40 L1440,60 L0,60 Z"
          fill={to}
        />
      </svg>
    </div>
  )
}
