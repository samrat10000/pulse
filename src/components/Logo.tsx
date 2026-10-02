/** Pulse mark: a heartbeat line on a blue rounded square. */
export function Logo({ size = 28 }: { size?: number }) {
  return (
    <span
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.3), background: '#3D7BF7', display: 'inline-grid', placeItems: 'center', flex: 'none', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.25)' }}
    >
      <svg viewBox="0 0 32 32" aria-hidden="true" style={{ width: '74%', height: '74%' }}>
        <path d="M3 18h6l3-8 5 14 4-10 2 4h6" fill="none" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

/** logo + wordmark, as in the sidebar and login */
export function Brand({ size = 30, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <div className="brand" style={style}>
      <Logo size={size} />
      <span>Pulse</span>
    </div>
  );
}
