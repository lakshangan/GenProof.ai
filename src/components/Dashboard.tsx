"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, ShieldCheck, ShieldAlert, ShieldX, 
  History, Cpu, FileText, FileJson, Calendar, 
  Code, Download, RefreshCw, ChevronDown, 
  ChevronRight, Award, Lock, ExternalLink, Eye, Copy, Check
} from "@/components/icons";
import useStore from "@/store/useStore";

type ExplorerTab = "visual" | "json" | "cert";

export const Dashboard: React.FC = () => {
  const activeAnalysis = useStore((state) => state.activeAnalysis);
  const resetAll = useStore((state) => state.resetAll);
  const setView = useStore((state) => state.setView);
  
  const [activeTab, setActiveTab] = useState<ExplorerTab>("visual");
  const [expandedAssertion, setExpandedAssertion] = useState<string | null>(null);
  const [copiedAssertion, setCopiedAssertion] = useState<string | null>(null);

  if (!activeAnalysis) return null;

  const {
    trustLevel,
    trustReason,
    activeManifest,
    validationState,
    allManifests,
    forensic,
  } = activeAnalysis as any;

  const toggleAssertion = (label: string) => {
    setExpandedAssertion(expandedAssertion === label ? null : label);
  };

  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAssertion(label);
    setTimeout(() => setCopiedAssertion(null), 2000);
  };

  const downloadReport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(activeAnalysis, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${activeManifest?.title || "c2pa"}-provenance-report.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const getTrustStatusStyles = () => {
    switch (trustLevel) {
      case "VERIFIED":
        return {
          icon: <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />,
          borderColor: "border-l-emerald-500",
          glowColor: "rgba(16, 185, 129, 0.15)",
          textColor: "text-emerald-400",
          title: "Verified Credentials",
        };
      case "PARTIAL":
        const isMetadataScan = validationState === "MetadataDetected";
        return {
          icon: <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />,
          borderColor: "border-l-amber-500",
          glowColor: "rgba(245, 158, 11, 0.15)",
          textColor: "text-amber-400",
          title: isMetadataScan ? "AI Metadata Detected" : "Untrusted Certificate",
        };
      case "UNVERIFIED":
      default:
        return {
          icon: <ShieldX className="w-5 h-5 text-red-400 shrink-0" />,
          borderColor: "border-l-red-500",
          glowColor: "rgba(239, 68, 68, 0.15)",
          textColor: "text-red-400",
          title: "Unverified Asset",
        };
    }
  };

  const trustStyle = getTrustStatusStyles();

  const getOriginName = () => {
    if (!activeManifest) return "Unknown Origin";
    return activeManifest.aiGeneratorTool || activeManifest.claimGeneratorDisplay?.split("via")?.pop()?.trim() || "Unknown Software";
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-6 py-6 z-10 flex flex-col gap-10 min-h-screen">
      
      {/* Top Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-white/[0.04] z-20">
        <button
          onClick={resetAll}
          className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/50 hover:text-white transition-all bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.05] hover:border-white/[0.1] rounded-full py-2.5 px-4.5 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>New Upload</span>
        </button>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => setView("compare")}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wider border border-white/[0.05] hover:border-white/[0.12] text-white/75 hover:text-white bg-white/[0.01] hover:bg-white/[0.05] transition-all rounded-full py-2.5 px-4.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
            <span>Compare Flow</span>
          </button>
          <button
            onClick={downloadReport}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wider bg-white text-black hover:bg-white/90 transition-all rounded-full py-2.5 px-4.5 shadow-[0_4px_20px_rgba(255,255,255,0.06)] cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* Split-Screen Main Layout */}
      <div className="flex flex-col lg:flex-row gap-12 items-start relative">
        
        {/* LEFT COLUMN: Sticky Image Preview (50% Width) */}
        <div className="w-full lg:w-5/12 lg:sticky lg:top-24 flex flex-col gap-6">
          
          <div className="rounded-[2rem] p-2 border border-white/[0.06] bg-white/[0.02] backdrop-blur-2xl shadow-xl relative overflow-hidden group">
            {/* Ambient Background Glow matching state */}
            <div 
              className="absolute -top-12 -right-12 w-48 h-48 rounded-full blur-[64px] pointer-events-none opacity-20 transition-all duration-1000"
              style={{ backgroundColor: trustStyle.glowColor }}
            />
            
            <div className="aspect-[4/3] rounded-[1.75rem] overflow-hidden bg-black/45 relative">
              {activeManifest?.thumbnailBase64 ? (
                <img 
                  src={activeManifest.thumbnailBase64} 
                  alt="Embedded Provenance"
                  className="w-full h-full object-contain bg-black/10 transition-transform duration-500 group-hover:scale-[1.015]"
                />
              ) : (
                <div className="w-full h-full flex flex-col justify-center items-center text-white/30 gap-3">
                  <ShieldX className="w-12 h-12 stroke-[1.2] text-white/10" />
                  <span className="text-xs font-medium uppercase tracking-wider">No Embedded Thumbnail</span>
                </div>
              )}
            </div>
          </div>

          {/* Minimalist Trust Status Card */}
          <div className={`rounded-2xl p-5 border border-white/[0.04] border-l-3 ${trustStyle.borderColor} bg-white/[0.01] backdrop-blur-xl shadow-lg flex flex-col gap-2 relative overflow-hidden`}>
            <div className="absolute top-0 right-0 w-24 h-24 blur-[40px] pointer-events-none rounded-full" style={{ backgroundColor: trustStyle.glowColor, opacity: 0.12 }} />
            <div className="flex items-center gap-2.5">
              {trustStyle.icon}
              <span className={`text-xs font-bold uppercase tracking-wider ${trustStyle.textColor}`}>{trustStyle.title}</span>
            </div>
            <p className="text-sm leading-relaxed text-white/70 mt-1 pl-7">
              {trustReason}
            </p>
          </div>
        </div>

        {/* RIGHT COLUMN: Scrolling Details & Inspector (7/12 Width) */}
        <div className="w-full lg:w-7/12 flex flex-col gap-10">
          
          {/* Top Info Block */}
          <div className="flex flex-col gap-4">
            <span className="text-[10px] uppercase tracking-widest font-extrabold text-indigo-400">Provenance Verified</span>
            <h2 className="text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">
              <span className="bg-gradient-to-r from-white via-white to-white/70 bg-clip-text text-transparent">{getOriginName()}</span>
            </h2>
            <p className="text-base font-light text-white/60 leading-relaxed max-w-xl mt-2">
              {activeManifest?.isAiGenerated
                ? `This asset is cryptographically verified to have been synthesized using ${getOriginName()} Content Credentials.`
                : activeManifest
                ? `This media file was processed or exported via ${activeManifest.claimGeneratorDisplay || "verified software"} retaining its authenticity signature.`
                : `No C2PA provenance signatures were found. The asset is unverified.`
              }
            </p>
            
            {activeManifest && (
              <div className="flex flex-wrap items-center gap-3 mt-3">
                <div className="flex items-center gap-2 text-xs text-white/70 bg-white/[0.02] border border-white/[0.06] rounded-full px-3.5 py-1.5 font-medium">
                  <Calendar className="w-3.5 h-3.5 text-white/40" />
                  <span>{activeManifest.signature?.time ? new Date(activeManifest.signature.time).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : "Unknown Date"}</span>
                </div>
                {activeManifest.isAiGenerated && (
                  <div className="flex items-center gap-2 text-xs text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-3.5 py-1.5 font-medium">
                    <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                    <span>AI Generated</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="w-full h-px bg-gradient-to-r from-white/[0.06] to-transparent" />

          {/* Timeline Section */}
          <div className="flex flex-col gap-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2.5 tracking-tight">
              <History className="w-4.5 h-4.5 text-indigo-400" />
              Provenance Timeline
            </h3>
            
            {activeManifest?.history && activeManifest.history.length > 0 ? (
              <div className="pl-2">
                <div className="relative border-l border-white/[0.08] ml-2.5 pl-6 space-y-6 py-1">
                  {activeManifest.history.map((item: any, index: number) => {
                    const isCreation = item.action.includes("created");
                    return (
                      <div key={index} className="relative group">
                        <div className="absolute -left-[30px] top-1.5 z-10">
                          {isCreation ? (
                            <div className="w-4 h-4 rounded-full border border-indigo-500/40 bg-indigo-950 flex items-center justify-center">
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                            </div>
                          ) : (
                            <div className="w-3 h-3 rounded-full border border-white/20 bg-neutral-900 flex items-center justify-center ml-0.5 mt-0.5">
                              <span className="w-1 h-1 rounded-full bg-white/40" />
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center justify-between gap-4">
                            <span className={`text-sm font-semibold tracking-tight ${isCreation ? "text-white text-base" : "text-white/80"}`}>{item.display}</span>
                            {item.timestamp && <span className="text-[10px] font-mono text-white/40 bg-white/[0.02] border border-white/[0.05] px-2 py-0.5 rounded">{new Date(item.timestamp).toLocaleDateString()}</span>}
                          </div>
                          <p className="text-xs text-white/50 mt-1 leading-relaxed">{item.description}</p>
                          {item.software && (
                            <div className="mt-2 text-[10px] font-semibold text-indigo-300 border border-indigo-500/10 rounded px-2 py-0.5 w-fit bg-indigo-500/[0.03] uppercase tracking-wider">
                              {item.software}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-xs text-white/30 italic ml-7">No editing action history claims available.</div>
            )}
          </div>

          {/* Deep Forensic Analysis Section */}
          {forensic && forensic.signals && forensic.signals.length > 0 && (
            <div className="flex flex-col gap-6 mt-2 border-t border-white/[0.04] pt-8">
              <div className="flex flex-col gap-1">
                <h3 className="text-lg font-bold text-white flex items-center gap-2.5 tracking-tight">
                  <Eye className="w-4.5 h-4.5 text-indigo-400" />
                  Deep Forensic Analysis
                </h3>
                <p className="text-xs text-white/40 ml-7">Metadata extracted directly from EXIF, XMP, IPTC, and raw binary layers.</p>
              </div>
              
              <div className="p-5 rounded-2xl border border-indigo-500/10 bg-indigo-500/[0.01] flex flex-col gap-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 blur-[40px] pointer-events-none" />
                <div className="flex items-center gap-3">
                  <div className={`px-2.5 py-1 rounded text-[9px] font-bold uppercase tracking-wider border ${
                    forensic.classification.includes("AI") ? "bg-indigo-500/10 text-indigo-300 border-indigo-500/20" : "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                  }`}>
                    {forensic.classification.replace("_", " ")}
                  </div>
                  <span className="text-xs font-semibold text-white/60">Confidence Level: <span className="text-white">{forensic.confidence}%</span></span>
                </div>
                <p className="text-sm text-white/70 leading-relaxed font-light">{forensic.summary}</p>
                
                {forensic.possiblyStripped && (
                  <div className="mt-1 p-3.5 rounded-xl bg-amber-500/[0.02] border border-amber-500/10 flex items-start gap-3">
                    <ShieldAlert className="w-4.5 h-4.5 text-amber-400 shrink-0 mt-0.5" />
                    <div className="flex flex-col gap-0.5">
                      <strong className="text-xs text-amber-300 font-semibold uppercase tracking-wider">Badge Stripping Detected</strong>
                      <p className="text-[11px] text-white/50 leading-relaxed mt-0.5">
                        Post-processing tools were detected. C2PA provenance credentials may have been removed or modified during export.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2">
                {forensic.signals.map((signal: any, idx: number) => (
                  <div key={idx} className="group flex flex-col sm:flex-row gap-4 p-4 rounded-xl border border-white/[0.03] bg-white/[0.01] hover:bg-white/[0.02] transition-all hover:border-white/[0.06]">
                    <div className="shrink-0 pt-0.5">
                      <div className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${
                        signal.confidence === "HIGH" ? "bg-red-500/10 text-red-400 border-red-500/20" : 
                        signal.confidence === "MEDIUM" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : 
                        "bg-white/5 text-white/40 border-white/10"
                      }`}>
                        {signal.confidence} SIGNAL
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 w-full">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[9px] font-bold font-mono text-indigo-400/80 bg-indigo-500/5 px-2 py-0.5 rounded uppercase tracking-wider">{signal.source}</span>
                        <span className="text-[10px] font-mono text-white/30 truncate">{signal.field}</span>
                      </div>
                      <span className="text-sm font-semibold text-white tracking-tight mt-1">{signal.value}</span>
                      <p className="text-xs text-white/50 leading-relaxed font-light">{signal.meaning}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cryptographic Inspector (Sleek Accordions) */}
          {activeManifest?.assertions && activeManifest.assertions.length > 0 && (
            <div className="flex flex-col gap-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2.5 tracking-tight">
                <Award className="w-4.5 h-4.5 text-indigo-400" />
                Cryptographic Assertions
              </h3>
              
              <div className="flex flex-col gap-2.5">
                {activeManifest.assertions.map((assertion: any, index: number) => {
                  const isExpanded = expandedAssertion === assertion.label;
                  const jsonStr = JSON.stringify(assertion.data, null, 2);
                  return (
                    <div key={index} className="border border-white/[0.04] rounded-xl bg-white/[0.01] overflow-hidden transition-all hover:border-white/[0.08]">
                      <button
                        onClick={() => toggleAssertion(assertion.label)}
                        className="w-full flex justify-between items-center p-3.5 text-left cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          <Code className="w-4 h-4 text-white/35" />
                          <span className="font-semibold text-xs text-white uppercase tracking-wider">{assertion.title}</span>
                          <span className="text-[9px] font-mono text-white/30 hidden sm:inline">{assertion.label}</span>
                        </div>
                        {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-white/40" /> : <ChevronRight className="w-3.5 h-3.5 text-white/40" />}
                      </button>
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="border-t border-white/[0.04] bg-black/20 overflow-hidden relative"
                          >
                            <button
                              onClick={() => handleCopyText(jsonStr, assertion.label)}
                              className="absolute top-3 right-3 text-white/40 hover:text-white bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.05] p-1.5 rounded-lg transition-colors cursor-pointer"
                              title="Copy Assertion JSON"
                            >
                              {copiedAssertion === assertion.label ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                            <pre className="p-4 text-[11px] font-mono text-white/60 leading-relaxed overflow-x-auto max-h-[300px]">
                              {jsonStr}
                            </pre>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Raw Explorer */}
          <div className="flex flex-col gap-6 border border-white/[0.04] bg-white/[0.01] rounded-2xl p-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2.5 tracking-wider uppercase">
                <FileJson className="w-4 h-4 text-indigo-400" />
                Raw Metadata Explorer
              </h3>
              <div className="flex gap-0.5 bg-black/35 p-0.5 rounded-lg border border-white/[0.04]">
                {(["visual", "json", "cert"] as ExplorerTab[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`text-[9px] font-bold px-3 py-1.5 rounded-md uppercase tracking-wider transition-all cursor-pointer ${
                      activeTab === tab ? "bg-white text-black shadow" : "text-white/40 hover:text-white/80"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            <div className="min-h-[200px]">
              {activeTab === "visual" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-white/60">
                  <div className="p-3.5 rounded-xl bg-black/15 border border-white/[0.03]">
                    <div className="text-[9px] uppercase tracking-widest font-semibold text-white/30 mb-0.5">Claim Generator</div>
                    <div className="font-semibold text-white truncate">{activeManifest?.claimGenerator || "N/A"}</div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-black/15 border border-white/[0.03]">
                    <div className="text-[9px] uppercase tracking-widest font-semibold text-white/30 mb-0.5">Manifest Label</div>
                    <div className="font-mono text-[11px] text-white truncate">{activeManifest?.label || "N/A"}</div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-black/15 border border-white/[0.03]">
                    <div className="text-[9px] uppercase tracking-widest font-semibold text-white/30 mb-0.5">Mime Type Format</div>
                    <div className="font-semibold text-white uppercase">{activeManifest?.format || "N/A"}</div>
                  </div>
                </div>
              )}

              {activeTab === "json" && (
                <pre className="p-3.5 rounded-xl border border-white/[0.03] bg-black/20 text-[11px] font-mono text-white/50 leading-relaxed overflow-x-auto max-h-[350px]">
                  {JSON.stringify(allManifests, null, 2)}
                </pre>
              )}

              {activeTab === "cert" && (
                <div className="flex flex-col gap-4">
                  {activeManifest?.signature ? (
                    <div className="cert-pass-border border border-white/[0.06] rounded-xl overflow-hidden shadow-lg bg-gradient-to-b from-white/[0.01] to-transparent">
                      <div className="p-3.5 border-b border-white/[0.06] bg-black/20 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Lock className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="font-bold text-white text-[10px] uppercase tracking-wider">Signing Authority Certificate</span>
                        </div>
                        <span className="text-[9px] font-mono py-0.5 px-2 bg-emerald-500/10 text-emerald-300 rounded font-bold uppercase border border-emerald-500/20">
                          {activeManifest.signature.alg}
                        </span>
                      </div>
                      <div className="p-4.5 space-y-3.5 text-xs">
                        <div className="flex justify-between border-b border-white/[0.03] pb-2 gap-4">
                          <span className="text-white/40">Issuer Common Name</span>
                          <span className="text-white text-right font-medium">{activeManifest.signature.issuer || "N/A"}</span>
                        </div>
                        <div className="flex justify-between border-b border-white/[0.03] pb-2 gap-4">
                          <span className="text-white/40">Common Name</span>
                          <span className="text-white text-right font-medium">{activeManifest.signature.commonName || "N/A"}</span>
                        </div>
                        <div className="flex justify-between border-b border-white/[0.03] pb-2 gap-4">
                          <span className="text-white/40">Serial Number</span>
                          <span className="text-white/70 font-mono text-[10px] text-right truncate max-w-[220px]">{activeManifest.signature.serialNumber || "N/A"}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-white/30 text-xs italic">No Digital Signature Available</div>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Dashboard;
