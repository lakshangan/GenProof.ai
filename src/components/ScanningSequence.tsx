"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, CheckCircle2, ShieldAlert, FileText } from "@/components/CustomIcons";
import useStore from "@/store/useStore";

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
  const scanningPreviewUrl = useStore((state) => state.scanningPreviewUrl);

  useEffect(() => {
    if (currentStep >= SCAN_STEPS.length) return;

    const timer = setTimeout(() => {
      setCompletedSteps((prev) => [...prev, currentStep]);
      setCurrentStep((prev) => prev + 1);
    }, SCAN_STEPS[currentStep].duration);

    return () => clearTimeout(timer);
  }, [currentStep]);

  const getTargetBoxStyle = (step: number) => {
    switch (step) {
      case 0: // Reading container
        return { top: "12%", left: "12%", width: "26%", height: "20%" };
      case 1: // Looking for camera profiles
        return { top: "32%", left: "42%", width: "32%", height: "28%" };
      case 2: // Locating signature envelope
        return { top: "66%", left: "18%", width: "44%", height: "18%" };
      case 3: // Checking modifications
        return { top: "16%", left: "56%", width: "34%", height: "32%" };
      case 4: // Verifying seals
        return { top: "46%", left: "14%", width: "52%", height: "26%" };
      default:
        return { top: "25%", left: "25%", width: "50%", height: "50%" };
    }
  };

  const getTargetLabel = (step: number) => {
    switch (step) {
      case 0: return "HDR.SCAN";
      case 1: return "EXIF.DATA";
      case 2: return "C2PA.ENV";
      case 3: return "HIST.ANL";
      case 4: return "SIG.VAL";
      default: return "SCANNING";
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto text-center py-6 px-4 z-10 flex flex-col items-center select-none">
      
      {/* 1. Viewfinder Scanning Box (Displays User's Uploaded Image) */}
      <div className="relative w-full aspect-[4/3] rounded-[1.5rem] border border-card-border bg-black/45 overflow-hidden shadow-lg mb-8 flex items-center justify-center relative">
        {scanningPreviewUrl ? (
          <img 
            src={scanningPreviewUrl} 
            className="w-full h-full object-contain opacity-50 select-none transition-opacity duration-300"
            alt="Scanning Asset"
          />
        ) : (
          <div className="w-full h-full flex flex-col justify-center items-center text-foreground/30 gap-2">
            <FileText className="w-12 h-12 stroke-[1.2] opacity-40 animate-pulse" />
            <span className="text-[10px] font-semibold uppercase tracking-wider">Awaiting file stream</span>
          </div>
        )}

        {/* Viewfinder Target Reticle Bounding Box */}
        {currentStep < SCAN_STEPS.length && (
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="absolute border-1.5 border-accent bg-accent/[0.04] flex items-center justify-center pointer-events-none rounded shadow-[0_0_15px_rgba(99,102,241,0.15)]"
              style={getTargetBoxStyle(currentStep)}
            >
              {/* Corner focus highlights inside target box */}
              <div className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-accent" />
              <div className="absolute top-0 right-0 w-1.5 h-1.5 border-t border-r border-accent" />
              <div className="absolute bottom-0 left-0 w-1.5 h-1.5 border-b border-l border-accent" />
              <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-accent" />
              
              {/* Dynamic blinking target coordinate dot */}
              <div className="w-2 h-2 rounded-full bg-accent animate-ping" />
              <span className="absolute -bottom-5 text-[8px] font-mono text-accent font-bold bg-black/75 px-1.5 py-0.5 rounded border border-accent/20 uppercase tracking-widest whitespace-nowrap">
                {getTargetLabel(currentStep)}
              </span>
            </motion.div>
          </AnimatePresence>
        )}

        {/* Laser Sweep Line (Vertical scan effect) */}
        {currentStep < SCAN_STEPS.length && (
          <motion.div
            animate={{ top: ["0%", "100%", "0%"] }}
            transition={{ repeat: Infinity, duration: 2.8, ease: "easeInOut" }}
            className="absolute left-0 w-full h-[1.5px] bg-gradient-to-r from-transparent via-accent/80 to-transparent shadow-[0_0_10px_rgba(99,102,241,0.6)] pointer-events-none"
            style={{ transform: "translateY(-50%)" }}
          />
        )}

        {/* Outer Viewfinder Camera Brackets */}
        <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-foreground/20 rounded-tl-sm pointer-events-none" />
        <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-foreground/20 rounded-tr-sm pointer-events-none" />
        <div className="absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 border-foreground/20 rounded-bl-sm pointer-events-none" />
        <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-foreground/20 rounded-br-sm pointer-events-none" />
      </div>

      {/* 2. Analysis Headline */}
      <div className="mb-8">
        <span className="text-[10px] font-bold tracking-widest text-accent uppercase block mb-1">
          Forensic Metadata Scan
        </span>
        <h3 className="text-xl font-bold text-foreground">
          {currentStep < SCAN_STEPS.length ? "Finding Provenance Credentials..." : "Compilation Complete"}
        </h3>
      </div>

      {/* 3. Progressive Checkpoints Log */}
      <div className="w-full text-left space-y-3.5">
        {SCAN_STEPS.map((step, idx) => {
          const isPending = idx === currentStep;
          const isDone = completedSteps.includes(idx);

          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all duration-300 relative ${
                isDone 
                  ? "border-emerald-500/10 bg-emerald-500/[0.02] text-emerald-600 dark:text-emerald-400"
                  : isPending
                  ? "border-accent/15 bg-accent/[0.02] text-accent"
                  : "border-card-border/30 text-foreground/20"
              }`}
            >
              <div className="shrink-0 flex items-center justify-center">
                {isDone ? (
                  <motion.div initial={{ scale: 0.6 }} animate={{ scale: 1 }} transition={{ type: "spring", damping: 10 }}>
                    <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  </motion.div>
                ) : isPending ? (
                  <Loader2 className="w-4.5 h-4.5 animate-spin shrink-0 text-accent" />
                ) : (
                  <div className="w-4.5 h-4.5 rounded-full border border-card-border shrink-0" />
                )}
              </div>
              
              <div className="text-xs">
                <span className={`font-semibold ${isDone ? "text-foreground/80" : ""}`}>
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
