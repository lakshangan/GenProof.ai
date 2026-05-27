"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { 
  ArrowLeft, Upload, ShieldCheck, ShieldAlert, ShieldX, 
  Cpu, Lock, Calendar, FileText, Check, AlertCircle 
} from "@/components/CustomIcons";
import useStore from "@/store/useStore";
import { ProvenanceReport } from "@/utils/c2pa-transformer";

export const C2PACompare: React.FC = () => {
  const setView = useStore((state) => state.setView);
  
  const [leftReport, setLeftReport] = useState<ProvenanceReport | null>(null);
  const [rightReport, setRightReport] = useState<ProvenanceReport | null>(null);
  
  const [leftLoading, setLeftLoading] = useState(false);
  const [rightLoading, setRightLoading] = useState(false);
  
  const [leftError, setLeftError] = useState<string | null>(null);
  const [rightError, setRightError] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, side: "left" | "right") => {
    const file = e.target.files?.[0];
    if (!file) return;

    const setReport = side === "left" ? setLeftReport : setRightReport;
    const setLoading = side === "left" ? setLeftLoading : setRightLoading;
    const setError = side === "left" ? setLeftError : setRightError;

    setReport(null);
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/verify", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.trustReason || "Failed to analyze C2PA metadata.");
      }

      const report = await response.json();
      setReport(report);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred during verification.");
    } finally {
      setLoading(false);
    }
  };

  const getTrustBadge = (level: string) => {
    switch (level) {
      case "VERIFIED":
        return (
          <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 bg-emerald-500/5 py-1 px-2.5 rounded-full">
            <ShieldCheck className="w-3 h-3" /> VERIFIED
          </span>
        );
      case "PARTIAL":
        return (
          <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 border border-amber-500/20 bg-amber-500/5 py-1 px-2.5 rounded-full">
            <ShieldAlert className="w-3 h-3" /> PARTIAL
          </span>
        );
      case "UNVERIFIED":
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400 border border-red-500/20 bg-red-500/5 py-1 px-2.5 rounded-full">
            <ShieldX className="w-3 h-3" /> UNVERIFIED
          </span>
        );
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6 text-foreground select-text">
      
      {/* Header Actions Panel */}
      <div className="flex justify-between items-center border-b border-card-border pb-5 z-20">
        <button
          onClick={() => setView("landing")}
          className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-foreground/50 hover:text-foreground transition-all bg-foreground/[0.02] hover:bg-foreground/[0.05] border border-card-border rounded-full py-2 px-4 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </button>
        <span className="text-xs font-bold uppercase tracking-widest text-accent">Provenance Comparator</span>
      </div>

      {/* Upload Comparer Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 z-10">
        
        {/* Left Image Upload Slot */}
        <div className="rounded-2xl p-5 border border-card-border bg-card-bg/40 backdrop-blur-xl flex flex-col gap-4 shadow-sm">
          <span className="text-[10px] uppercase tracking-widest font-bold text-foreground/30">Source Image A</span>
          
          {!leftReport ? (
            <motion.label
              whileHover={{
                borderColor: "rgba(99, 102, 241, 0.3)",
                backgroundColor: "rgba(255, 255, 255, 0.02)",
              }}
              className="relative border border-dashed border-card-border bg-foreground/[0.01] transition-all rounded-2xl h-[150px] flex flex-col justify-center items-center cursor-pointer p-4 text-center group overflow-hidden"
            >
              <input type="file" onChange={(e) => handleFileUpload(e, "left")} className="hidden" />
              {leftLoading ? (
                <div className="flex flex-col items-center gap-2.5">
                  <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs text-foreground/50">Analyzing...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-foreground/[0.02] border border-card-border group-hover:bg-foreground/[0.04] flex items-center justify-center transition-all">
                    <Upload className="w-4 h-4 text-foreground/30 group-hover:text-foreground/50 transition-colors" />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-foreground/80 font-semibold uppercase tracking-wider">Select Image A</span>
                    <span className="text-[10px] text-foreground/30">JPEG, PNG, WebP, HEIC</span>
                  </div>
                </div>
              )}
            </motion.label>
          ) : (
            <div className="p-4 border border-card-border bg-foreground/[0.01] rounded-xl flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3 overflow-hidden">
                {leftReport.activeManifest?.thumbnailBase64 ? (
                  <img src={leftReport.activeManifest.thumbnailBase64} className="w-11 h-11 rounded-lg object-cover bg-black/5 border border-card-border" alt="Thumb A" />
                ) : (
                  <div className="w-11 h-11 rounded-lg bg-black/10 flex justify-center items-center border border-card-border">
                    <FileText className="w-4 h-4 text-foreground/30" />
                  </div>
                )}
                <div className="overflow-hidden">
                  <div className="font-semibold text-foreground truncate text-xs">{leftReport.activeManifest?.title || "Image A"}</div>
                  <div className="text-[9px] text-foreground/30 font-bold uppercase mt-0.5">{(leftReport.activeManifest?.format.split("/")[1] || "JPEG").toUpperCase()}</div>
                </div>
              </div>
              <button 
                onClick={() => setLeftReport(null)}
                className="text-[10px] font-bold uppercase tracking-wider text-foreground/50 hover:text-foreground transition-colors py-1.5 px-3 rounded-lg border border-card-border hover:bg-foreground/[0.04] cursor-pointer"
              >
                Clear
              </button>
            </div>
          )}
          {leftError && (
            <div className="text-xs text-red-600 dark:text-red-400 border border-red-500/20 bg-red-500/[0.02] p-3 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{leftError}</span>
            </div>
          )}
        </div>

        {/* Right Image Upload Slot */}
        <div className="rounded-2xl p-5 border border-card-border bg-card-bg/40 backdrop-blur-xl flex flex-col gap-4 shadow-sm">
          <span className="text-[10px] uppercase tracking-widest font-bold text-foreground/30">Source Image B</span>
          
          {!rightReport ? (
            <motion.label
              whileHover={{
                borderColor: "rgba(99, 102, 241, 0.3)",
                backgroundColor: "rgba(255, 255, 255, 0.02)",
              }}
              className="relative border border-dashed border-card-border bg-foreground/[0.01] transition-all rounded-2xl h-[150px] flex flex-col justify-center items-center cursor-pointer p-4 text-center group overflow-hidden"
            >
              <input type="file" onChange={(e) => handleFileUpload(e, "right")} className="hidden" />
              {rightLoading ? (
                <div className="flex flex-col items-center gap-2.5">
                  <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs text-foreground/50">Analyzing...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-foreground/[0.02] border border-card-border group-hover:bg-foreground/[0.04] flex items-center justify-center transition-all">
                    <Upload className="w-4 h-4 text-foreground/30 group-hover:text-foreground/50 transition-colors" />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-foreground/80 font-semibold uppercase tracking-wider">Select Image B</span>
                    <span className="text-[10px] text-foreground/30">JPEG, PNG, WebP, HEIC</span>
                  </div>
                </div>
              )}
            </motion.label>
          ) : (
            <div className="p-4 border border-card-border bg-foreground/[0.01] rounded-xl flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3 overflow-hidden">
                {rightReport.activeManifest?.thumbnailBase64 ? (
                  <img src={rightReport.activeManifest.thumbnailBase64} className="w-11 h-11 rounded-lg object-cover bg-black/5 border border-card-border" alt="Thumb B" />
                ) : (
                  <div className="w-11 h-11 rounded-lg bg-black/10 flex justify-center items-center border border-card-border">
                    <FileText className="w-4 h-4 text-foreground/30" />
                  </div>
                )}
                <div className="overflow-hidden">
                  <div className="font-semibold text-foreground truncate text-xs">{rightReport.activeManifest?.title || "Image B"}</div>
                  <div className="text-[9px] text-foreground/30 font-bold uppercase mt-0.5">{(rightReport.activeManifest?.format.split("/")[1] || "JPEG").toUpperCase()}</div>
                </div>
              </div>
              <button 
                onClick={() => setRightReport(null)}
                className="text-[10px] font-bold uppercase tracking-wider text-foreground/50 hover:text-foreground transition-colors py-1.5 px-3 rounded-lg border border-card-border hover:bg-foreground/[0.04] cursor-pointer"
              >
                Clear
              </button>
            </div>
          )}
          {rightError && (
            <div className="text-xs text-red-600 dark:text-red-400 border border-red-500/20 bg-red-500/[0.02] p-3 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{rightError}</span>
            </div>
          )}
        </div>
      </div>

      {/* Side by Side Comparative Grid */}
      {(leftReport || rightReport) && (
        <div className="rounded-2xl border border-card-border bg-card-bg/40 backdrop-blur-xl p-5 overflow-hidden flex flex-col gap-4 shadow-sm z-10">
          <h3 className="font-bold text-foreground text-xs uppercase tracking-wider">Metadata Comparison Matrix</h3>
          
          <div className="overflow-x-auto border border-card-border rounded-xl bg-black/[0.01]">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-card-border bg-foreground/[0.01]">
                  <th className="py-3 px-4 text-foreground/45 font-semibold uppercase tracking-wider w-1/4">Property</th>
                  <th className="py-3 px-4 text-foreground font-bold uppercase tracking-wider w-3/8">Image A</th>
                  <th className="py-3 px-4 text-foreground font-bold uppercase tracking-wider w-3/8">Image B</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-card-border">
                <tr className="hover:bg-foreground/[0.01] transition-colors">
                  <td className="py-3 px-4 font-semibold text-foreground/60">C2PA Credentials</td>
                  <td className="py-3 px-4 text-foreground">
                    {leftReport?.hasCredentials ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Present</span>
                    ) : (
                      <span className="text-foreground/30">Missing</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-foreground">
                    {rightReport?.hasCredentials ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Present</span>
                    ) : (
                      <span className="text-foreground/30">Missing</span>
                    )}
                  </td>
                </tr>
                <tr className="hover:bg-foreground/[0.01] transition-colors">
                  <td className="py-3 px-4 font-semibold text-foreground/60">Trust Level</td>
                  <td className="py-3 px-4">{leftReport ? getTrustBadge(leftReport.trustLevel) : "-"}</td>
                  <td className="py-3 px-4">{rightReport ? getTrustBadge(rightReport.trustLevel) : "-"}</td>
                </tr>
                <tr className="hover:bg-foreground/[0.01] transition-colors">
                  <td className="py-3 px-4 font-semibold text-foreground/60">Claim Generator</td>
                  <td className="py-3 px-4 text-foreground font-semibold max-w-[200px] truncate">{leftReport?.activeManifest?.claimGeneratorDisplay || "-"}</td>
                  <td className="py-3 px-4 text-foreground font-semibold max-w-[200px] truncate">{rightReport?.activeManifest?.claimGeneratorDisplay || "-"}</td>
                </tr>
                <tr className="hover:bg-foreground/[0.01] transition-colors">
                  <td className="py-3 px-4 font-semibold text-foreground/60">AI Origin</td>
                  <td className="py-3 px-4 text-foreground">
                    {leftReport ? (
                      leftReport.activeManifest?.isAiGenerated ? (
                        <span className="text-accent font-semibold">Yes ({leftReport.activeManifest.aiGeneratorTool || "AI Tool"})</span>
                      ) : (
                        "No"
                      )
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="py-3 px-4 text-foreground">
                    {rightReport ? (
                      rightReport.activeManifest?.isAiGenerated ? (
                        <span className="text-accent font-semibold">Yes ({rightReport.activeManifest.aiGeneratorTool || "AI Tool"})</span>
                      ) : (
                        "No"
                      )
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>
                <tr className="hover:bg-foreground/[0.01] transition-colors">
                  <td className="py-3 px-4 font-semibold text-foreground/60">Signature Algorithm</td>
                  <td className="py-3 px-4 text-foreground font-mono text-[10px]">{leftReport?.activeManifest?.signature?.alg || "-"}</td>
                  <td className="py-3 px-4 text-foreground font-mono text-[10px]">{rightReport?.activeManifest?.signature?.alg || "-"}</td>
                </tr>
                <tr className="hover:bg-foreground/[0.01] transition-colors">
                  <td className="py-3 px-4 font-semibold text-foreground/60">Issuer Certificate</td>
                  <td className="py-3 px-4 text-foreground max-w-[220px] truncate" title={leftReport?.activeManifest?.signature?.issuer}>{leftReport?.activeManifest?.signature?.issuer || "-"}</td>
                  <td className="py-3 px-4 text-foreground max-w-[220px] truncate" title={rightReport?.activeManifest?.signature?.issuer}>{rightReport?.activeManifest?.signature?.issuer || "-"}</td>
                </tr>
                <tr className="hover:bg-foreground/[0.01] transition-colors">
                  <td className="py-3 px-4 font-semibold text-foreground/60">Signing Timestamp</td>
                  <td className="py-3 px-4 text-foreground">
                    {leftReport?.activeManifest?.signature?.time 
                      ? new Date(leftReport.activeManifest.signature.time).toLocaleDateString(undefined, { dateStyle: "medium" }) 
                      : "-"}
                  </td>
                  <td className="py-3 px-4 text-foreground">
                    {rightReport?.activeManifest?.signature?.time 
                      ? new Date(rightReport.activeManifest.signature.time).toLocaleDateString(undefined, { dateStyle: "medium" }) 
                      : "-"}
                  </td>
                </tr>
                <tr className="hover:bg-foreground/[0.01] transition-colors">
                  <td className="py-3 px-4 font-semibold text-foreground/60">Provenance Steps</td>
                  <td className="py-3 px-4 text-foreground">{leftReport?.activeManifest?.history?.length || "-"}</td>
                  <td className="py-3 px-4 text-foreground">{rightReport?.activeManifest?.history?.length || "-"}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Comparative Timeline Grid */}
      {leftReport && rightReport && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 z-10">
          
          {/* Timeline A */}
          <div className="rounded-2xl border border-card-border bg-card-bg/40 backdrop-blur-xl p-5 shadow-sm">
            <h4 className="font-bold text-foreground text-xs uppercase tracking-wider mb-5 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-accent" />
              Timeline: {leftReport.activeManifest?.title || "Image A"}
            </h4>
            <div className="border-l border-card-border ml-2 pl-4 space-y-5 text-[11px]">
              {leftReport.activeManifest?.history?.map((h, i) => {
                const isCreation = h.action?.includes("created") || i === 0;
                return (
                  <div key={i} className="relative">
                    <div className="absolute -left-[21px] top-1">
                      {isCreation ? (
                        <div className="w-2.5 h-2.5 rounded-full border border-accent bg-background flex items-center justify-center" />
                      ) : (
                        <div className="w-2 h-2 rounded-full border border-card-border bg-card-bg ml-0.5" />
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-foreground">{h.display}</div>
                      <div className="text-foreground/50 mt-0.5">{h.description}</div>
                      {h.software && <div className="text-[9px] font-bold text-accent uppercase mt-1">Via {h.software}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Timeline B */}
          <div className="rounded-2xl border border-card-border bg-card-bg/40 backdrop-blur-xl p-5 shadow-sm">
            <h4 className="font-bold text-foreground text-xs uppercase tracking-wider mb-5 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-accent" />
              Timeline: {rightReport.activeManifest?.title || "Image B"}
            </h4>
            <div className="border-l border-card-border ml-2 pl-4 space-y-5 text-[11px]">
              {rightReport.activeManifest?.history?.map((h, i) => {
                const isCreation = h.action?.includes("created") || i === 0;
                return (
                  <div key={i} className="relative">
                    <div className="absolute -left-[21px] top-1">
                      {isCreation ? (
                        <div className="w-2.5 h-2.5 rounded-full border border-accent bg-background flex items-center justify-center" />
                      ) : (
                        <div className="w-2 h-2 rounded-full border border-card-border bg-card-bg ml-0.5" />
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-foreground">{h.display}</div>
                      <div className="text-foreground/50 mt-0.5">{h.description}</div>
                      {h.software && <div className="text-[9px] font-bold text-accent uppercase mt-1">Via {h.software}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
        </div>
      )}
    </div>
  );
};

export default C2PACompare;
