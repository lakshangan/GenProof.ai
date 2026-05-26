"use client";

import * as React from "react";
import { VariantProps, cva } from "class-variance-authority";
import { motion, stagger, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────
// TYPES & CONSTANTS
// ─────────────────────────────────────────────

export type TransformDirectionType = "top" | "bottom" | "left" | "right" | "z";

export const GRADIENT_SIZES = {
  sm: "w-[300px] h-[200px] sm:w-[400px] sm:h-[300px]",
  md: "w-[500px] h-[350px] sm:w-[700px] sm:h-[500px]",
  lg: "w-[800px] h-[500px] sm:w-[1000px] sm:h-[700px]",
  xl: "w-[1000px] h-[700px] sm:w-[1300px] sm:h-[900px]",
} as const;

export const GRADIENT_POSITIONS = {
  top: "top-0 left-1/2 -translate-x-1/2",
  bottom: "bottom-0 left-1/2 -translate-x-1/2",
  center: "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
  "top-left": "top-0 left-0",
  "top-right": "top-0 right-0",
  "bottom-left": "bottom-0 left-0",
  "bottom-right": "bottom-0 right-0",
} as const;

// CVA variants for the background gradient
const bgGradientVariants = cva(
  "absolute pointer-events-none rounded-full blur-[80px] sm:blur-[110px] opacity-[0.16] mix-blend-screen transition-all duration-1000 ease-in-out",
  {
    variants: {
      color: {
        indigo: "bg-gradient-to-r from-indigo-500 via-indigo-600 to-indigo-700",
        violet: "bg-gradient-to-r from-violet-500 via-violet-600 to-purple-700",
        blue: "bg-gradient-to-r from-blue-500 via-sky-600 to-indigo-700",
        emerald: "bg-gradient-to-r from-emerald-500 via-teal-600 to-indigo-800",
        gold: "bg-gradient-to-r from-amber-400 via-orange-500 to-red-600",
      },
      size: {
        sm: GRADIENT_SIZES.sm,
        md: GRADIENT_SIZES.md,
        lg: GRADIENT_SIZES.lg,
        xl: GRADIENT_SIZES.xl,
      },
    },
    defaultVariants: {
      color: "indigo",
      size: "lg",
    },
  }
);

export interface BgGradientProps
  extends Omit<HTMLMotionProps<"div">, "color">,
    VariantProps<typeof bgGradientVariants> {
  gradientPosition?: keyof typeof GRADIENT_POSITIONS;
  animateOrbit?: boolean;
}

// ─────────────────────────────────────────────
// COMPONENT: BgGradient (Internal helper)
// ─────────────────────────────────────────────

export const BgGradient: React.FC<BgGradientProps> = ({
  className,
  color,
  size,
  gradientPosition = "center",
  animateOrbit = true,
  ...props
}) => {
  const positionClass = GRADIENT_POSITIONS[gradientPosition] || GRADIENT_POSITIONS.center;

  return (
    <motion.div
      className={cn(bgGradientVariants({ color, size }), positionClass, className)}
      animate={
        animateOrbit
          ? {
              x: ["-10%", "10%", "-5%", "5%", "-10%"],
              y: ["-5%", "5%", "10%", "-10%", "-5%"],
              scale: [1, 1.05, 0.95, 1.02, 1],
            }
          : {}
      }
      transition={{
        duration: 25,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      {...props}
    />
  );
};

// ─────────────────────────────────────────────
// MAIN COMPONENT: HeroAnimated
// ─────────────────────────────────────────────

interface HeroAnimatedProps extends React.HTMLAttributes<HTMLDivElement> {
  badgeText?: string;
  badgeDotColor?: string;
  titleLines: string[];
  gradientTitleLineIndex?: number;
  description: string;
  direction?: TransformDirectionType;
  delay?: number;
}

export const HeroAnimated: React.FC<HeroAnimatedProps> = ({
  className,
  badgeText = "C2PA Cryptographic Verification",
  badgeDotColor = "bg-emerald-400",
  titleLines,
  gradientTitleLineIndex = 1,
  description,
  direction = "bottom",
  delay = 0,
  ...props
}) => {
  // Define entrance animation variants based on TransformDirectionType
  const getDirectionOffset = (dir: TransformDirectionType) => {
    switch (dir) {
      case "top":
        return { y: -25, x: 0, scale: 1 };
      case "bottom":
        return { y: 25, x: 0, scale: 1 };
      case "left":
        return { y: 0, x: -30, scale: 1 };
      case "right":
        return { y: 0, x: 30, scale: 1 };
      case "z":
        return { y: 0, x: 0, scale: 0.95 };
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.12,
        delayChildren: delay,
      },
    },
  };

  const itemVariants = {
    hidden: { 
      opacity: 0, 
      ...getDirectionOffset(direction)
    },
    visible: {
      opacity: 1,
      y: 0,
      x: 0,
      scale: 1,
      transition: {
        type: "spring" as const,
        stiffness: 100,
        damping: 18,
      },
    },
  };

  return (
    <div className={cn("relative w-full text-center flex flex-col items-center gap-6 max-w-3xl px-6", className)} {...props}>
      {/* Cinematic Ambient Background Glows inside the Hero container */}
      <BgGradient color="indigo" size="md" gradientPosition="top" />
      <BgGradient color="violet" size="sm" gradientPosition="bottom-left" className="opacity-[0.08]" />
      
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full flex flex-col items-center gap-5 z-10"
      >
        {/* Status Badge */}
        {badgeText && (
          <motion.div
            variants={itemVariants}
            className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.15em] px-4 py-1.5 rounded-full border border-white/8 bg-white/[0.03] text-white/35 shadow-[0_0_20px_rgba(255,255,255,0.01)] hover:border-white/12 transition-colors cursor-default"
          >
            <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", badgeDotColor)} />
            {badgeText}
          </motion.div>
        )}

        {/* Animated Editorial Title */}
        <h1 
          className="text-4xl sm:text-6xl font-semibold tracking-tight text-white leading-[1.08] select-none" 
          style={{ letterSpacing: "-0.03em" }}
        >
          {titleLines.map((line, idx) => {
            const isGradient = idx === gradientTitleLineIndex;
            return (
              <span key={idx} className="block overflow-hidden py-1">
                <motion.span
                  variants={itemVariants}
                  className={cn(
                    "block",
                    isGradient && "glow-text bg-gradient-to-r from-indigo-200 via-indigo-300 to-sky-300 bg-clip-text text-transparent"
                  )}
                >
                  {line}
                </motion.span>
              </span>
            );
          })}
        </h1>

        {/* Editorial Subtext */}
        <motion.p
          variants={itemVariants}
          className="text-sm sm:text-[15px] text-white/40 leading-relaxed max-w-[440px] font-normal"
        >
          {description}
        </motion.p>
      </motion.div>
    </div>
  );
};

export default HeroAnimated;
