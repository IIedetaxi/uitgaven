/** Generiek geel pakje; rood + doorgestreept als het gebruikt is. */
export function PackIcon({ used, className = "w-11 h-[62px]" }: { used: boolean; className?: string }) {
  if (used) {
    return (
      <svg viewBox="0 0 28 40" className={className} aria-hidden="true">
        <rect x="1" y="1" width="26" height="38" rx="4" fill="#5A2A22" stroke="#E5533D" strokeWidth="1.6" />
        <path d="M1 12h26" stroke="#8F3A2C" strokeWidth="1.2" />
        <path d="M6 34L22 6" stroke="#E5533D" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 28 40" className={className} aria-hidden="true">
      <rect x="1" y="1" width="26" height="38" rx="4" fill="#F2C230" />
      <rect x="1" y="1" width="26" height="11" rx="4" fill="#E6B422" />
      <path d="M1 12h26" stroke="#B88A12" strokeWidth="1.2" />
      <rect x="7" y="19" width="14" height="9" rx="2" fill="none" stroke="#8A6608" strokeWidth="1.4" />
      <path d="M10 23.5h8" stroke="#8A6608" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
