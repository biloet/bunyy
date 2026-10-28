/** Brand mark: a hexagonal AI core with a neural node graph. */
export default function Logo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="logo-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#38e1ff" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <polygon points="32,3 57,17.5 57,46.5 32,61 7,46.5 7,17.5" fill="url(#logo-g)" />
      <polygon points="32,10 51,21 51,43 32,54 13,43 13,21" fill="#070b16" />
      <g stroke="url(#logo-g)" strokeWidth="2.2" strokeLinecap="round">
        <line x1="32" y1="32" x2="32" y2="19" />
        <line x1="32" y1="32" x2="43" y2="38.5" />
        <line x1="32" y1="32" x2="21" y2="38.5" />
        <line x1="32" y1="19" x2="43" y2="38.5" opacity="0.45" />
        <line x1="43" y1="38.5" x2="21" y2="38.5" opacity="0.45" />
        <line x1="21" y1="38.5" x2="32" y2="19" opacity="0.45" />
      </g>
      <circle cx="32" cy="32" r="4.5" fill="#38e1ff" />
      <circle cx="32" cy="19" r="3" fill="#8b5cf6" />
      <circle cx="43" cy="38.5" r="3" fill="#8b5cf6" />
      <circle cx="21" cy="38.5" r="3" fill="#8b5cf6" />
    </svg>
  );
}
