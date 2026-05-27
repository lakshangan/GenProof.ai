"use client"
import React from "react"
import { motion } from "framer-motion"

export interface AuroraBackgroundProps {
  /** Extra wrapper classes */
  className?: string
  /** Content to render on top of the background */
  children?: React.ReactNode
  /** Number of "star" points */
  starCount?: number
  /** Two CSS-variable backed colors for the radial overlays */
  gradientColors?: [string, string]
  /** Pulse animation duration in seconds */
  pulseDuration?: number
  /** ARIA label for the animated background */
  ariaLabel?: string
}

const AuroraBackground: React.FC<AuroraBackgroundProps> = ({
  className = "",
  children,
  starCount = 60,
  gradientColors = [
    "var(--aurora-color1, rgba(14,165,160,0.28))",
    "var(--aurora-color2, rgba(6,82,90,0.32))",
  ],
  pulseDuration = 10,
  ariaLabel = "Animated aurora background",
}) => {
  const [colorA, colorB] = gradientColors
  const [isMounted, setIsMounted] = React.useState(false)

  React.useEffect(() => {
    setIsMounted(true)
  }, [])

  return (
    <div
      role="img"
      aria-label={ariaLabel}
      className={`overflow-hidden ${className}`}
    >
      {/* Background layers */}
      <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
        {/* Pulsing radial gradients */}
        <div
          className="absolute inset-0 opacity-60"
          style={{
            backgroundImage: `
              radial-gradient(ellipse 80% 60% at 20% 20%, ${colorA} 0%, transparent 70%),
              radial-gradient(ellipse 60% 80% at 80% 80%, ${colorB} 0%, transparent 70%)
            `,
            animation: `aurora-pulse ${pulseDuration}s ease-in-out infinite`,
          }}
        />

        {/* Blurred color blobs */}
        <motion.div
          className="absolute inset-0 mix-blend-screen"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 2, ease: "easeInOut" }}
        >
          {/* Top-left teal bloom */}
          <motion.div
            className="absolute -top-1/4 -left-1/4 w-2/3 h-2/3 rounded-full filter blur-[130px] opacity-25"
            style={{ background: "#0ea5a0" }}
            animate={{
              x: [-60, 60, -60],
              y: [-30, 30, -30],
              scale: [1, 1.15, 1],
            }}
            transition={{
              duration: 28,
              repeat: Infinity,
              repeatType: "mirror",
              ease: "easeInOut",
            }}
          />
          {/* Bottom-right dark cyan bloom */}
          <motion.div
            className="absolute -bottom-1/4 -right-1/4 w-2/3 h-2/3 rounded-full filter blur-[130px] opacity-20"
            style={{ background: "#065f60" }}
            animate={{
              x: [60, -60, 60],
              y: [30, -30, 30],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 36,
              repeat: Infinity,
              repeatType: "mirror",
              ease: "easeInOut",
            }}
          />
          {/* Center deep teal accent */}
          <motion.div
            className="absolute top-1/4 left-1/3 w-1/2 h-1/2 rounded-full filter blur-[110px] opacity-15"
            style={{ background: "#0d9488" }}
            animate={{
              x: [30, -30, 30],
              y: [-40, 40, -40],
              rotate: [0, 180, 0],
            }}
            transition={{
              duration: 45,
              repeat: Infinity,
              repeatType: "mirror",
              ease: "easeInOut",
            }}
          />
          {/* Soft aqua streak top-right */}
          <motion.div
            className="absolute -top-1/6 right-0 w-1/3 h-1/2 rounded-full filter blur-[95px] opacity-10"
            style={{ background: "#22d3ee" }}
            animate={{
              x: [-20, 20, -20],
              y: [10, -10, 10],
            }}
            transition={{
              duration: 22,
              repeat: Infinity,
              repeatType: "mirror",
              ease: "easeInOut",
            }}
          />
        </motion.div>

        {/* Twinkling stars — client-only to prevent hydration mismatch */}
        {isMounted && Array.from({ length: starCount }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-0.5 h-0.5 bg-white rounded-full"
            initial={{
              x: `${Math.random() * 100}vw`,
              y: `${Math.random() * 100}vh`,
              opacity: 0,
            }}
            animate={{
              opacity: [0, Math.random() * 0.7 + 0.1, 0],
            }}
            transition={{
              duration: Math.random() * 3 + 2,
              repeat: Infinity,
              delay: Math.random() * 6,
            }}
          />
        ))}
      </div>

      {/* Foreground content */}
      {children && (
        <div className="relative z-10">{children}</div>
      )}
    </div>
  )
}

export default AuroraBackground
