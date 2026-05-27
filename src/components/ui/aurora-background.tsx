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
    "var(--aurora-color1, rgba(168,85,247,0.25))",
    "var(--aurora-color2, rgba(79,70,229,0.25))",
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
          {/* Top-left purple bloom */}
          <motion.div
            className="absolute -top-1/4 -left-1/4 w-2/3 h-2/3 bg-purple-700 rounded-full filter blur-[120px] opacity-30"
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
          {/* Bottom-right fuchsia bloom */}
          <motion.div
            className="absolute -bottom-1/4 -right-1/4 w-2/3 h-2/3 bg-fuchsia-700 rounded-full filter blur-[120px] opacity-25"
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
          {/* Center indigo accent */}
          <motion.div
            className="absolute top-1/4 left-1/3 w-1/2 h-1/2 bg-indigo-700 rounded-full filter blur-[100px] opacity-20"
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
          {/* Violet streak top-right */}
          <motion.div
            className="absolute -top-1/6 right-0 w-1/3 h-1/2 bg-violet-600 rounded-full filter blur-[90px] opacity-15"
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
