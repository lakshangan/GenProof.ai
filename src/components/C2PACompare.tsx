"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { 
  ArrowLeft, Upload, ShieldCheck, ShieldAlert, ShieldX, 
  Cpu, Lock, Calendar, Settings, FileText, Check, AlertCircle 
} from "@/components/icons";
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
        return <span className="inline-flex items-center gap-1 text-xs text-success border border-success-light bg-success-light/5 py-1 px-2.5 rounded-full font-semibold"><ShieldCheck className="w-3.5 h-3.5" /> VERIFIED</span>;
      case "PARTIAL":
        return <span className="inline-flex items-center gap-1 text-xs text-warning border border-warning-light bg-warning-light/5 py-1 px-2.5 rounded-full font-semibold"><ShieldAlert className="w-3.5 h-3.5" /> PARTIAL</span>;
      case "UNVERIFIED":
      default:
        return <span className="inline-flex items-center gap-1 text-xs text-error border border-error-light bg-error-light/5 py-1 px-2.5 rounded-full font-semibold"><ShieldX className="w-3.5 h-3.5" /> UNVERIFIED</span>;
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8 z-10 flex flex-col gap-6">
      
      {/* Header Actions Panel */}
      <div className="flex justify-between items-center border-b border-card-border pb-6">
        <button
          onClick={() => setView("landing")}
          className="flex items-center gap-2 text-sm text-foreground/50 hover:text-white transition-colors py-1.5 px-3 rounded-lg hover:bg-white/5 border border-transparent hover:border-card-border"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Verifier</span>
        </button>
        <h2 className="text-lg font-bold text-white tracking-tight">Compare Provenance Chains</h2>
      </div>

      {/* Upload Comparer Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Left Image Upload Slot */}
        <div className="glass-panel rounded-3xl p-6 border border-card-border flex flex-col gap-4">
          <h3 className="text-sm uppercase tracking-wider font-semibold text-accent">Source Image A</h3>
          
          {!leftReport ? (
            <label className="relative border border-dashed border-card-border bg-white/[0.01] hover:bg-white/[0.02] hover:border-accent/40 transition-all rounded-2xl h-[160px] flex flex-col justify-center items-center cursor-pointer p-4 text-center">
              <input type="file" onChange={(e) => handleFileUpload(e, "left")} className="hidden" />
              {leftLoading ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs text-foreground/50">Analyzing...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="w-6 h-6 text-foreground/45" />
                  <span className="text-sm text-white font-medium">Select Image A</span>
                  <span className="text-xs text-foreground/40">JPEG, PNG, WebP, HEIC</span>
                </div>
              )}
            </label>
          ) : (
            <div className="p-4 border border-card-border bg-white/[0.01] rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3 overflow-hidden">
                {leftReport.activeManifest?.thumbnailBase64 ? (
                  <img src={leftReport.activeManifest.thumbnailBase64} className="w-12 h-12 rounded-lg object-cover" alt="Thumb A" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-black/40 flex justify-center items-center"><FileText className="w-5 h-5 text-foreground/45" /></div>
                )}
                <div className="overflow-hidden">
                  <div className="font-semibold text-white truncate text-sm">{leftReport.activeManifest?.title || "Image A"}</div>
                  <div className="text-xs text-foreground/45 mt-0.5">{leftReport.activeManifest?.format.split("/")[1].toUpperCase() || "JPEG"}</div>
                </div>
              </div>
              <button 
                onClick={() => setLeftReport(null)}
                className="text-xs text-foreground/45 hover:text-white transition-colors py-1 px-2.5 rounded-lg border border-card-border hover:bg-white/5"
              >
                Clear
              </button>
            </div>
          )}
          {leftError && <div className="text-xs text-error border border-error-light/20 bg-error-light/5 p-3 rounded-xl flex items-center gap-2"><AlertCircle className="w-4 h-4" />{leftError}</div>}
        </div>

        {/* Right Image Upload Slot */}
        <div className="glass-panel rounded-3xl p-6 border border-card-border flex flex-col gap-4">
          <h3 className="text-sm uppercase tracking-wider font-semibold text-accent">Source Image B</h3>
          
          {!rightReport ? (
            <label className="relative border border-dashed border-card-border bg-white/[0.01] hover:bg-white/[0.02] hover:border-accent/40 transition-all rounded-2xl h-[160px] flex flex-col justify-center items-center cursor-pointer p-4 text-center">
              <input type="file" onChange={(e) => handleFileUpload(e, "right")} className="hidden" />
              {rightLoading ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs text-foreground/50">Analyzing...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="w-6 h-6 text-foreground/45" />
                  <span className="text-sm text-white font-medium">Select Image B</span>
                  <span className="text-xs text-foreground/40">JPEG, PNG, WebP, HEIC</span>
                </div>
              )}
            </label>
          ) : (
            <div className="p-4 border border-card-border bg-white/[0.01] rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3 overflow-hidden">
                {rightReport.activeManifest?.thumbnailBase64 ? (
                  <img src={rightReport.activeManifest.thumbnailBase64} className="w-12 h-12 rounded-lg object-cover" alt="Thumb B" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-black/40 flex justify-center items-center"><FileText className="w-5 h-5 text-foreground/45" /></div>
                )}
                <div className="overflow-hidden">
                  <div className="font-semibold text-white truncate text-sm">{rightReport.activeManifest?.title || "Image B"}</div>
                  <div className="text-xs text-foreground/45 mt-0.5">{rightReport.activeManifest?.format.split("/")[1].toUpperCase() || "JPEG"}</div>
                </div>
              </div>
              <button 
                onClick={() => setRightReport(null)}
                className="text-xs text-foreground/45 hover:text-white transition-colors py-1 px-2.5 rounded-lg border border-card-border hover:bg-white/5"
              >
                Clear
              </button>
            </div>
          )}
          {rightError && <div className="text-xs text-error border border-error-light/20 bg-error-light/5 p-3 rounded-xl flex items-center gap-2"><AlertCircle className="w-4 h-4" />{rightError}</div>}
        </div>
      </div>

      {/* Side by Side Comparative Grid */}
      {(leftReport || rightReport) && (
        <div className="glass-panel rounded-3xl p-6 border border-card-border overflow-hidden flex flex-col gap-6">
          <h3 className="font-semibold text-white text-base">Metadata Comparison Matrix</h3>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="border-b border-card-border">
                  <th className="py-3 px-4 text-foreground/45 font-medium w-1/4">Property</th>
                  <th className="py-3 px-4 text-white font-bold w-3/8">Image A</th>
                  <th className="py-3 px-4 text-white font-bold w-3/8">Image B</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-card-border/40">
                <tr>
                  <td className="py-3.5 px-4 font-semibold text-foreground/75">C2PA Credentials</td>
                  <td className="py-3.5 px-4 text-white">{leftReport?.hasCredentials ? <span className="text-success font-semibold flex items-center gap-1"><Check className="w-4 h-4" /> Present</span> : <span className="text-foreground/45">Missing</span>}</td>
                  <td className="py-3.5 px-4 text-white">{rightReport?.hasCredentials ? <span className="text-success font-semibold flex items-center gap-1"><Check className="w-4 h-4" /> Present</span> : <span className="text-foreground/45">Missing</span>}</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-semibold text-foreground/75">Trust Level</td>
                  <td className="py-3.5 px-4">{leftReport ? getTrustBadge(leftReport.trustLevel) : "-"}</td>
                  <td className="py-3.5 px-4">{rightReport ? getTrustBadge(rightReport.trustLevel) : "-"}</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-semibold text-foreground/75">Claim Generator</td>
                  <td className="py-3.5 px-4 text-white max-w-[200px] truncate">{leftReport?.activeManifest?.claimGeneratorDisplay || "-"}</td>
                  <td className="py-3.5 px-4 text-white max-w-[200px] truncate">{rightReport?.activeManifest?.claimGeneratorDisplay || "-"}</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-semibold text-foreground/75">AI Generated</td>
                  <td className="py-3.5 px-4 text-white">
                    {leftReport ? (leftReport.activeManifest?.isAiGenerated ? <span className="text-accent font-semibold">Yes ({leftReport.activeManifest.aiGeneratorTool})</span> : "No") : "-"}
                  </td>
                  <td className="py-3.5 px-4 text-white">
                    {rightReport ? (rightReport.activeManifest?.isAiGenerated ? <span className="text-accent font-semibold">Yes ({rightReport.activeManifest.aiGeneratorTool})</span> : "No") : "-"}
                  </td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-semibold text-foreground/75">Signature Alg</td>
                  <td className="py-3.5 px-4 text-white font-mono text-xs">{leftReport?.activeManifest?.signature?.alg || "-"}</td>
                  <td className="py-3.5 px-4 text-white font-mono text-xs">{rightReport?.activeManifest?.signature?.alg || "-"}</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-semibold text-foreground/75">Issuer Certificate</td>
                  <td className="py-3.5 px-4 text-white max-w-[200px] truncate">{leftReport?.activeManifest?.signature?.issuer || "-"}</td>
                  <td className="py-3.5 px-4 text-white max-w-[200px] truncate">{rightReport?.activeManifest?.signature?.issuer || "-"}</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-semibold text-foreground/75">Signing Date</td>
                  <td className="py-3.5 px-4 text-white">{leftReport?.activeManifest?.signature?.time ? new Date(leftReport.activeManifest.signature.time).toLocaleString() : "-"}</td>
                  <td className="py-3.5 px-4 text-white">{rightReport?.activeManifest?.signature?.time ? new Date(rightReport.activeManifest.signature.time).toLocaleString() : "-"}</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-semibold text-foreground/75">Edit Timeline Steps</td>
                  <td className="py-3.5 px-4 text-white">{leftReport?.activeManifest?.history.length || "-"}</td>
                  <td className="py-3.5 px-4 text-white">{rightReport?.activeManifest?.history.length || "-"}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Comparative Timeline Grid */}
      {leftReport && rightReport && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Timeline A */}
          <div className="glass-panel rounded-3xl p-6 border border-card-border">
            <h4 className="font-semibold text-white mb-4 flex items-center gap-2"><Cpu className="w-4 h-4 text-accent" /> Timeline: {leftReport.activeManifest?.title || "Image A"}</h4>
            <div className="border-l border-white/10 ml-2 pl-4 space-y-4 text-xs">
              {leftReport.activeManifest?.history.map((h, i) => (
                <div key={i} className="relative">
                  <div className="absolute -left-[21px] top-1 w-3.5 h-3.5 rounded-full border border-card-border bg-background flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                  </div>
                  <div>
                    <div className="font-bold text-white text-sm">{h.display}</div>
                    <div className="text-foreground/70 mt-0.5">{h.description}</div>
                    {h.software && <div className="text-[10px] text-accent mt-1">Via {h.software}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Timeline B */}
          <div className="glass-panel rounded-3xl p-6 border border-card-border">
            <h4 className="font-semibold text-white mb-4 flex items-center gap-2"><Cpu className="w-4 h-4 text-accent" /> Timeline: {rightReport.activeManifest?.title || "Image B"}</h4>
            <div className="border-l border-white/10 ml-2 pl-4 space-y-4 text-xs">
              {rightReport.activeManifest?.history.map((h, i) => (
                <div key={i} className="relative">
                  <div className="absolute -left-[21px] top-1 w-3.5 h-3.5 rounded-full border border-card-border bg-background flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                  </div>
                  <div>
                    <div className="font-bold text-white text-sm">{h.display}</div>
                    <div className="text-foreground/70 mt-0.5">{h.description}</div>
                    {h.software && <div className="text-[10px] text-accent mt-1">Via {h.software}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default C2PACompare;
