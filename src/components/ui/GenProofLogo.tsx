// GenProof.ai Logo — SVG magnifying glass + sparkle stars, matching reference
// Inherits fill via `currentColor` so parent className controls color
import React from "react"

interface GenProofLogoProps {
  /** Size in pixels (square) */
  size?: number
  /** Extra class names for the wrapping <svg> */
  className?: string
}

const GenProofLogo: React.FC<GenProofLogoProps> = ({ size = 32, className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-label="GenProof.ai logo"
  >
    {/* ── Magnifying-glass handle ── */}
    <line
      x1="60"
      y1="60"
      x2="88"
      y2="88"
      stroke="currentColor"
      strokeWidth="10"
      strokeLinecap="round"
    />

    {/* ── Lens ring — broken arc (dashed) for the forensic / investigation feel ── */}
    <circle
      cx="42"
      cy="42"
      r="28"
      stroke="currentColor"
      strokeWidth="8"
      strokeLinecap="round"
      strokeDasharray="22 9"
      strokeDashoffset="4"
      fill="none"
    />

    {/* Inner lens ring (solid, thin) */}
    <circle
      cx="42"
      cy="42"
      r="20"
      stroke="currentColor"
      strokeWidth="2"
      strokeOpacity="0.25"
      fill="none"
    />

    {/* ── Large sparkle star (top-left inside lens) ── */}
    {/* four-pointed star: two rotated rectangles */}
    <g transform="translate(33, 33)">
      <path
        d="M0 -9 L2.5 -2.5 L9 0 L2.5 2.5 L0 9 L-2.5 2.5 L-9 0 L-2.5 -2.5 Z"
        fill="currentColor"
      />
    </g>

    {/* ── Medium sparkle star (center-right inside lens) ── */}
    <g transform="translate(49, 41)">
      <path
        d="M0 -6.5 L1.8 -1.8 L6.5 0 L1.8 1.8 L0 6.5 L-1.8 1.8 L-6.5 0 L-1.8 -1.8 Z"
        fill="currentColor"
      />
    </g>

    {/* ── Small sparkle star (bottom inside lens) ── */}
    <g transform="translate(37, 53)">
      <path
        d="M0 -4.5 L1.2 -1.2 L4.5 0 L1.2 1.2 L0 4.5 L-1.2 1.2 L-4.5 0 L-1.2 -1.2 Z"
        fill="currentColor"
      />
    </g>
  </svg>
)

export default GenProofLogo
