"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, CheckCircle2, ShieldAlert } from "@/components/CustomIcons";

interface ScanStep {
  label: string;
  successText: string;
  duration: number;
}

const SCAN_STEPS: ScanStep[] = [
  { label: "Reading the image container headers...", successText: "Parsed file headers and image dimensions", duration: 600 },
  { label: "Looking for camera profiles & software stamps...", successText: "Found creator metadata & camera signature details", duration: 650 },
  { label: "Locating cryptographic signature credentials...", successText: "Found and decoded C2PA credentials package", duration: 500 },
  { label: "Checking if the asset has been modified...", successText: "Reconstructed editing history & creation timeline", duration: 600 },
  { label: "Verifying digital authenticity seals...", successText: "Cryptographic signature seal fully validated", duration: 500 },
];

export const ScanningSequence: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  useEffect(() => {
    if (currentStep >= SCAN_STEPS.length) return;

    const timer = setTimeout(() => {
      setCompletedSteps((prev) => [...prev, currentStep]);
      setCurrentStep((prev) => prev + 1);
    }, SCAN_STEPS[currentStep].duration);

    return () => clearTimeout(timer);
  }, [currentStep]);

  return (
    <div className="w-full max-w-md mx-auto text-center py-12 px-6 z-10 flex flex-col items-center">
      {/* Radar Glow Loading Animation */}
      <div className="relative w-28 h-28 mb-10 flex justify-center items-center">
        {/* Pulsing Outer Rings */}
        <motion.div
          animate={{ scale: [1, 1.4, 1], opacity: [0.15, 0.4, 0.15] }}
          transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
          className="absolute inset-0 rounded-full border border-accent/30 bg-accent-light/5"
        />
        <motion.div
          animate={{ scale: [1, 1.7, 1], opacity: [0.05, 0.2, 0.05] }}
          transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
          className="absolute inset-0 rounded-full border border-accent/15"
        />
        
        {/* Scanning Sweeping Line */}
        <div className="absolute inset-2 rounded-full border border-white/5 overflow-hidden">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1.8, ease: "linear" }}
            className="absolute top-1/2 left-1/2 w-[200%] h-[200%] origin-top-left bg-gradient-to-tr from-accent/20 via-transparent to-transparent"
            style={{ transform: "translate(-50%, -50%)" }}
          />
        </div>

        {/* Center Spinner */}
        <div className="absolute w-12 h-12 rounded-xl bg-card-bg border border-card-border flex justify-center items-center backdrop-blur-md">
          <Loader2 className="w-6 h-6 text-accent animate-spin" />
        </div>
      </div>

      {/* Analysis Headline */}
      <h3 className="text-lg font-medium tracking-tight text-white mb-1 uppercase tracking-widest text-xs opacity-60">
        Provenance Forensic Engine
      </h3>
      <p className="text-white text-xl font-semibold mb-8">Analyzing Media Credentials...</p>

      {/* Progressive Checkpoints Log */}
      <div className="w-full text-left space-y-4">
        {SCAN_STEPS.map((step, idx) => {
          const isPending = idx === currentStep;
          const isDone = completedSteps.includes(idx);
          const isUpcoming = idx > currentStep;

          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all duration-300 ${
                isDone 
                  ? "border-success-light bg-success-light/5 text-success/90"
                  : isPending
                  ? "border-accent-light bg-accent-light/5 text-accent shadow-[0_0_15px_rgba(99,102,241,0.05)]"
                  : "border-card-border/40 text-foreground/30"
              }`}
            >
              <div className="mt-0.5">
                {isDone ? (
                  <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }}>
                    <CheckCircle2 className="w-5 h-5 text-success fill-success/10 shrink-0" />
                  </motion.div>
                ) : isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin shrink-0 text-accent" />
                ) : (
                  <div className="w-5 h-5 rounded-full border border-card-border shrink-0" />
                )}
              </div>
              
              <div className="text-sm">
                <span className={`font-medium ${isDone ? "text-white/80" : ""}`}>
                  {isDone ? step.successText : step.label}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
export default ScanningSequence;
