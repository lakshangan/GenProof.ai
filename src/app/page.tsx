"use client";

import React, { useEffect } from "react";
import { ReactLenis } from "lenis/react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, ShieldAlert, Sparkles, HelpCircle, Sun, Moon, Info, Lock } from "@/components/CustomIcons";
import useStore from "@/store/useStore";
import UploadZone from "@/components/UploadZone";
import ScanningSequence from "@/components/ScanningSequence";
import Dashboard from "@/components/Dashboard";
import C2PACompare from "@/components/C2PACompare";
import HeroAnimated from "@/components/ui/hero-animated";

import "lenis/dist/lenis.css";

export default function Home() {
  const activeView = useStore((state) => state.activeView);
  const setView = useStore((state) => state.setView);
  const isAnalyzing = useStore((state) => state.isAnalyzing);
  const setAnalyzing = useStore((state) => state.setAnalyzing);
  const setAnalysis = useStore((state) => state.setAnalysis);
  const setError = useStore((state) => state.setError);
  const theme = useStore((state) => state.theme);
  const toggleTheme = useStore((state) => state.toggleTheme);

  // Initialize theme class on mount
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === "light") {
      root.classList.add("light-theme");
    } else {
      root.classList.remove("light-theme");
    }
  }, [theme]);

  // Handle local sample test clicks
  const handleSampleClick = async (type: "verified" | "unverified") => {
    setAnalyzing(true);
    setError(null);
    setAnalysis(null);
    const startTime = Date.now();

    try {
      const filename = type === "verified" ? "sample-verified.jpg" : "sample-unverified.jpg";
      const res = await fetch(`/${filename}`);
      if (!res.ok) throw new Error("Failed to load sample asset.");
      
      const blob = await res.blob();
      const file = new File([blob], filename, { type: "image/jpeg" });
      
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/verify", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.trustReason || "Failed to verify C2PA metadata.");
      }

      const report = await response.json();

      // Maintain theatrical scanning timing
      const elapsed = Date.now() - startTime;
      const minDuration = 2800;
      if (elapsed < minDuration) {
        await new Promise((resolve) => setTimeout(resolve, minDuration - elapsed));
      }

      setAnalysis(report);
      setView("dashboard");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to analyze sample file.");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <ReactLenis root>
      <div className="min-h-screen flex flex-col justify-between relative overflow-hidden select-none bg-background text-foreground transition-colors duration-300">
        
        {/* Animated gradient background */}
        <div className="gradient-bg" aria-hidden="true">
          <div className="bloom-top" />
          <div className="bloom-bl" />
          <div className="bloom-br" />
        </div>

        {/* Technical dot grid backdrop */}
        <div className="grid-backdrop" aria-hidden="true" />

        {/* Film grain */}
        <div className="cinematic-noise" />

        {/* Top Navbar */}
        <header className="w-full max-w-6xl mx-auto px-6 py-5 z-10 flex items-center justify-between border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setView("landing")}>
            <div className="w-7 h-7 rounded-xl bg-accent flex justify-center items-center glow-logo">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-white text-sm tracking-wide">GenProof.ai</span>
          </div>

          <div className="flex items-center gap-6">
            <nav className="hidden sm:flex items-center gap-6 text-xs font-semibold uppercase tracking-wider">
              <button 
                onClick={() => setView("landing")} 
                className={`transition-colors ${activeView === "landing" ? "text-white" : "text-foreground/45 hover:text-white"}`}
              >
                Verify
              </button>
              <button 
                onClick={() => setView("compare")} 
                className={`transition-colors ${activeView === "compare" ? "text-white" : "text-foreground/45 hover:text-white"}`}
              >
                Compare
              </button>
            </nav>

            <div className="flex items-center gap-2.5">
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="w-9 h-9 border border-card-border rounded-xl flex justify-center items-center bg-white/5 hover:border-white/20 transition-all text-foreground/75 hover:text-white"
                title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
              >
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>

              <span className="hidden md:inline-flex items-center gap-2 text-[11px] font-semibold py-1 px-3 border border-success/20 bg-success/5 text-success rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-success glow-dot" />
                C2PA Active
              </span>
            </div>
          </div>
        </header>

        {/* Main Content Layout */}
        <main className="flex-1 flex flex-col justify-center items-center py-12 relative z-10">
          <AnimatePresence mode="wait">
            {activeView === "landing" && (
              <motion.div
                key="landing"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="w-full flex flex-col items-center gap-12"
              >
                {/* Hero */}
                {!isAnalyzing && (
                  <HeroAnimated
                    titleLines={["Where did this", "image come from?"]}
                    description="Upload any image. We scan every byte — EXIF, XMP, IPTC, and C2PA cryptographic signatures — to tell you exactly what created it."
                    direction="bottom"
                  />
                )}

                {/* Upload Zone */}
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15, duration: 0.5 }}
                  className="w-full"
                >
                  {isAnalyzing ? <ScanningSequence /> : <UploadZone />}
                </motion.div>

                {/* Quick Test Profiles */}
                {!isAnalyzing && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="flex flex-col items-center gap-3"
                  >
                    <span className="text-[10px] text-white/25 font-semibold uppercase tracking-widest">
                      Try a sample
                    </span>
                    <div className="flex gap-3 flex-wrap justify-center">
                      <button
                        onClick={() => handleSampleClick("verified")}
                        className="inline-flex items-center gap-2 text-xs font-medium px-4 py-2 rounded-full border border-white/10 bg-white/[0.03] text-white/60 hover:text-white hover:border-white/20 hover:bg-white/[0.06] transition-all"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        Verified C2PA Image
                      </button>
                      <button
                        onClick={() => handleSampleClick("unverified")}
                        className="inline-flex items-center gap-2 text-xs font-medium px-4 py-2 rounded-full border border-white/10 bg-white/[0.03] text-white/60 hover:text-white hover:border-white/20 hover:bg-white/[0.06] transition-all"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                        Unverified Image
                      </button>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}

            {activeView === "dashboard" && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.5 }}
                className="w-full"
              >
                <Dashboard />
              </motion.div>
            )}

            {activeView === "compare" && (
              <motion.div
                key="compare"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.5 }}
                className="w-full"
              >
                <C2PACompare />
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Footer */}
        <footer className="w-full max-w-6xl mx-auto px-6 py-8 z-10 border-t border-card-border/30 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-foreground/35 font-medium">
          <div className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-success" />
            <span>Files never leave your device. All parsing is done in memory and discarded.</span>
          </div>
          <div>
            <span>© {new Date().getFullYear()} GenProof.ai • Provenance Intelligence Agency</span>
          </div>
        </footer>
      </div>
    </ReactLenis>
  );
}
