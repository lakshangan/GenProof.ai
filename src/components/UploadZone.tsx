"use client";

import React, { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, AlertCircle, ShieldCheck } from "@/components/icons";
import useStore from "@/store/useStore";
import { analyzeFile } from "@/utils/analyze";

export const UploadZone: React.FC = () => {
  const [isDragActive, setIsDragActive] = useState(false);

  const setAnalysis = useStore((state) => state.setAnalysis);
  const setAnalyzing = useStore((state) => state.setAnalyzing);
  const setError = useStore((state) => state.setError);
  const isAnalyzing = useStore((state) => state.isAnalyzing);
  const error = useStore((state) => state.error);
  const setView = useStore((state) => state.setView);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave" || e.type === "drop") {
      setIsDragActive(false);
    }
  }, []);

  const processFile = async (file: File) => {
    if (!file) return;

    const validExtensions = ["jpg", "jpeg", "png", "webp", "heic", "heif"];
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    if (!validExtensions.includes(ext) && !file.type.startsWith("image/")) {
      setError("Unsupported format. Please upload a JPEG, PNG, WebP, or HEIC image.");
      return;
    }

    setError(null);
    setAnalyzing(true);
    setAnalysis(null);

    const startTime = Date.now();

    try {
      // Runs 100% in the browser — no server needed
      const report = await analyzeFile(file);

      // Keep a minimum duration for the scanning UI
      const elapsed = Date.now() - startTime;
      const minDuration = 2200;
      if (elapsed < minDuration) {
        await new Promise((resolve) => setTimeout(resolve, minDuration - elapsed));
      }

      setAnalysis(report);
      setView("dashboard");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred during verification.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) processFile(e.target.files[0]);
  };

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-5 z-10">

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-start gap-3 p-4 rounded-2xl border border-red-500/20 bg-red-950/30 text-sm"
          >
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-400" />
            <div>
              <p className="font-semibold text-white">Verification Failed</p>
              <p className="text-red-300/70 mt-0.5 text-xs leading-relaxed">{error}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Drop Zone */}
      <motion.div
        animate={{
          borderColor: isDragActive ? "rgba(99,102,241,0.8)" : "rgba(255,255,255,0.08)",
          backgroundColor: isDragActive ? "rgba(99,102,241,0.06)" : "rgba(255,255,255,0.02)",
          scale: isDragActive ? 1.01 : 1,
        }}
        transition={{ duration: 0.2 }}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative w-full rounded-3xl border border-dashed cursor-pointer group glow-pulse ${isDragActive ? "glow-border" : ""}`}
        style={{ minHeight: "260px" }}
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 p-10">
          <motion.div
            animate={{ scale: isDragActive ? 1.15 : 1 }}
            transition={{ type: "spring", damping: 12 }}
            className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors ${
              isDragActive
                ? "bg-indigo-500/20 border border-indigo-400/30"
                : "bg-white/5 border border-white/10 group-hover:bg-white/8 group-hover:border-white/20"
            }`}
          >
            <Upload className={`w-7 h-7 transition-colors ${isDragActive ? "text-indigo-400" : "text-white/40 group-hover:text-white/60"}`} />
          </motion.div>

          <div className="text-center">
            <p className="text-white font-semibold text-base">
              {isDragActive ? "Release to verify" : "Drop your image here"}
            </p>
            <p className="text-white/40 text-sm mt-1.5">
              or{" "}
              <span className="text-indigo-400 font-medium hover:text-indigo-300 transition-colors">
                click to browse
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-center">
            {["JPEG", "PNG", "WebP", "HEIC"].map((fmt) => (
              <span key={fmt} className="text-[10px] font-bold tracking-widest uppercase text-white/25 border border-white/8 rounded-full px-3 py-1">
                {fmt}
              </span>
            ))}
          </div>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          className="hidden"
          disabled={isAnalyzing}
        />
      </motion.div>

      <div className="flex items-center justify-center gap-2 text-[11px] text-white/25">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500/60" />
        <span>All analysis runs locally in your browser. Files are never uploaded.</span>
      </div>
    </div>
  );
};

export default UploadZone;
