"use client";

import React, { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, AlertCircle, ShieldCheck } from "@/components/CustomIcons";
import useStore from "@/store/useStore";

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
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/verify", { method: "POST", body: formData });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.trustReason || "Failed to analyze metadata.");
      }

      const report = await response.json();

      const elapsed = Date.now() - startTime;
      const minDuration = 2200;
      if (elapsed < minDuration) {
        await new Promise(resolve => setTimeout(resolve, minDuration - elapsed));
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
        whileHover={{
          borderColor: "rgba(255,255,255,0.08)",
          backgroundColor: "rgba(255,255,255,0.02)",
        }}
        animate={{
          borderColor: isDragActive ? "rgba(99,102,241,0.6)" : "rgba(255,255,255,0.04)",
          backgroundColor: isDragActive ? "rgba(99,102,241,0.03)" : "rgba(255,255,255,0.01)",
          scale: isDragActive ? 1.01 : 1,
        }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative w-full rounded-[28px] border border-solid cursor-pointer group glow-pulse transition-shadow duration-300 ${isDragActive ? "glow-border" : ""}`}
        style={{ minHeight: "260px" }}
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 p-10">
          <motion.div
            animate={{ scale: isDragActive ? 1.1 : 1 }}
            transition={{ type: "spring", damping: 14 }}
            className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
              isDragActive
                ? "bg-indigo-500/10 border border-indigo-400/20"
                : "bg-white/[0.02] border border-white/[0.05] group-hover:bg-white/[0.04] group-hover:border-white/[0.1] shadow-inner"
            }`}
          >
            <Upload className={`w-5 h-5 transition-colors ${isDragActive ? "text-indigo-400" : "text-white/30 group-hover:text-white/50"}`} />
          </motion.div>

          <div className="text-center">
            <p className="text-white/80 font-medium text-sm tracking-tight">
              {isDragActive ? "Release to verify" : "Drop your image here"}
            </p>
            <p className="text-white/30 text-xs mt-1">
              or{" "}
              <span className="text-indigo-400 font-medium hover:text-indigo-300 transition-colors">
                click to browse
              </span>
            </p>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap justify-center">
            {["JPEG", "PNG", "WebP", "HEIC"].map((fmt) => (
              <span key={fmt} className="text-[9px] font-semibold tracking-wider uppercase text-white/30 border border-white/[0.04] bg-white/[0.01] rounded-full px-2.5 py-0.5">
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
