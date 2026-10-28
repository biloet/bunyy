/** Faceted mint gem used as the brand mark. */
export default function Logo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <polygon points="32,3 61,24 50,59 14,59 3,24" fill="#2f9e6b" />
      <polygon points="32,3 61,24 32,32" fill="#7ef0b6" />
      <polygon points="32,3 3,24 32,32" fill="#5fe3a0" />
      <polygon points="3,24 14,59 32,32" fill="#3cc283" />
      <polygon points="61,24 50,59 32,32" fill="#46cf8e" />
      <polygon points="14,59 50,59 32,32" fill="#2a8c5f" />
      <path d="M32 18 L35.5 28.5 L46 32 L35.5 35.5 L32 46 L28.5 35.5 L18 32 L28.5 28.5 Z" fill="#0a141c" />
    </svg>
  );
}
