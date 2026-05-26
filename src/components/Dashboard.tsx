"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, ShieldCheck, ShieldAlert, ShieldX, 
  History, Cpu, FileText, FileJson, Calendar, 
  Hash, Code, Download, RefreshCw, ChevronDown, 
  ChevronRight, Award, Lock, ExternalLink, Eye
} from "@/components/icons";
import useStore from "@/store/useStore";

type ExplorerTab = "visual" | "json" | "js" | "cert";

export const Dashboard: React.FC = () => {
  const activeAnalysis = useStore((state) => state.activeAnalysis);
  const resetAll = useStore((state) => state.resetAll);
  const setView = useStore((state) => state.setView);
  
  const [activeTab, setActiveTab] = useState<ExplorerTab>("visual");
  const [expandedAssertion, setExpandedAssertion] = useState<string | null>(null);
  const [devMode, setDevMode] = useState(false);

  if (!activeAnalysis) return null;

  const {
    trustLevel,
    trustReason,
    activeManifest,
    validationStatus,
    validationState,
    allManifests,
    forensic,
  } = activeAnalysis as any;

  const toggleAssertion = (label: string) => {
    setExpandedAssertion(expandedAssertion === label ? null : label);
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

  const getTrustBadgeStyles = () => {
    switch (trustLevel) {
      case "VERIFIED":
        return {
          icon: <ShieldCheck className="w-8 h-8 text-success" />,
          colorClass: "text-success border-success/30 bg-success/5",
          text: "Verified Credentials",
        };
      case "PARTIAL":
        const isMetadataScan = validationState === "MetadataDetected";
        return {
          icon: <ShieldAlert className="w-8 h-8 text-warning" />,
          colorClass: "text-warning border-warning/30 bg-warning/5",
          text: isMetadataScan ? "AI Metadata Detected" : "Untrusted Certificate",
        };
      case "UNVERIFIED":
      default:
        return {
          icon: <ShieldX className="w-8 h-8 text-error" />,
          colorClass: "text-error border-error/30 bg-error/5",
          text: "Unverified Asset",
        };
    }
  };

  const trustBadge = getTrustBadgeStyles();

  const getOriginName = () => {
    if (!activeManifest) return "Unknown Origin";
    return activeManifest.aiGeneratorTool || activeManifest.claimGeneratorDisplay.split("via").pop()?.trim() || "Unknown Software";
  };

  return (
    <div className="w-full max-w-[1400px] mx-auto px-6 py-10 z-10 flex flex-col gap-8 min-h-screen">
      
      {/* Top Header Actions */}
      <div className="flex justify-between items-center pb-6 border-b border-card-border/50">
        <button
          onClick={resetAll}
          className="flex items-center gap-2 text-sm font-medium text-foreground/50 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Upload new image</span>
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setView("compare")}
            className="flex items-center gap-2 text-sm font-medium border border-card-border/60 text-white hover:bg-white/5 transition-all rounded-xl py-2 px-4"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Compare Flow</span>
          </button>
          <button
            onClick={downloadReport}
            className="flex items-center gap-2 text-sm font-medium bg-white text-black hover:bg-white/90 transition-all rounded-xl py-2 px-4 shadow-[0_0_15px_rgba(255,255,255,0.1)]"
          >
            <Download className="w-4 h-4" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* Split-Screen Main Layout */}
      <div className="flex flex-col lg:flex-row gap-12 items-start relative pb-24">
        
        {/* LEFT COLUMN: Sticky Image Preview (50% Width) */}
        <div className="w-full lg:w-1/2 lg:sticky lg:top-32 flex flex-col gap-6">
          
          <div className="rounded-[2.5rem] p-3 border border-white/10 bg-white/5 backdrop-blur-2xl shadow-2xl relative overflow-hidden group">
            {/* Ambient Background Glow matching state */}
            <div 
              className={`absolute -top-12 -right-12 w-64 h-64 rounded-full blur-[80px] pointer-events-none opacity-20 transition-all duration-1000 ${
                trustLevel === "VERIFIED" ? "bg-success" : trustLevel === "PARTIAL" ? "bg-warning" : "bg-error"
              }`}
            />
            
            <div className="aspect-[4/3] rounded-[2rem] overflow-hidden bg-black/50 relative">
              {activeManifest?.thumbnailBase64 ? (
                <img 
                  src={activeManifest.thumbnailBase64} 
                  alt="Embedded Provenance"
                  className="w-full h-full object-contain bg-black/20"
                />
              ) : (
                <div className="w-full h-full flex flex-col justify-center items-center text-foreground/45 gap-4">
                  <ShieldX className="w-16 h-16 stroke-[1] text-white/20" />
                  <span className="text-sm font-medium">No embedded C2PA thumbnail available</span>
                </div>
              )}
            </div>
            
            <div className="absolute top-8 left-8">
              <div className={`px-4 py-1.5 rounded-full backdrop-blur-md border border-white/20 font-semibold text-xs tracking-wider uppercase text-white shadow-lg ${trustBadge.colorClass}`}>
                {activeManifest?.format?.split("/")[1] || "JPEG"} • {trustLevel}
              </div>
            </div>
          </div>

          <div className={`rounded-3xl p-6 border flex flex-col gap-2 ${trustBadge.colorClass} backdrop-blur-md`}>
            <div className="flex items-center gap-3">
              {trustBadge.icon}
              <h3 className="text-xl font-bold tracking-tight text-white">{trustBadge.text}</h3>
            </div>
            <p className="text-sm leading-relaxed text-white/75 mt-2 pl-11">
              {trustReason}
            </p>
          </div>
        </div>

        {/* RIGHT COLUMN: Scrolling Details & Inspector (50% Width) */}
        <div className="w-full lg:w-1/2 flex flex-col gap-10">
          
          {/* Top Info Block */}
          <div className="flex flex-col gap-4">
            <h4 className="text-[10px] uppercase tracking-widest font-bold text-accent">Verified Origin</h4>
            <h2 className="text-5xl lg:text-6xl font-bold text-white tracking-tighter leading-[1.1]">
              {getOriginName()}
            </h2>
            <p className="text-lg font-light text-foreground/60 leading-relaxed max-w-lg mt-2">
              {activeManifest?.isAiGenerated
                ? `This asset is cryptographically verified to have been synthesized using ${getOriginName()} Content Credentials.`
                : activeManifest
                ? `This media file was processed or exported via ${activeManifest.claimGeneratorDisplay || "verified software"} retaining its authenticity signature.`
                : `No C2PA provenance signatures were found. The asset is unverified.`
              }
            </p>
            
            {activeManifest && (
              <div className="flex flex-wrap items-center gap-4 mt-4">
                <div className="flex items-center gap-2 text-sm text-white/70 bg-white/5 border border-white/10 rounded-full px-4 py-1.5">
                  <Calendar className="w-4 h-4" />
                  <span>{activeManifest.signature?.time ? new Date(activeManifest.signature.time).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : "Unknown Date"}</span>
                </div>
                {activeManifest.isAiGenerated && (
                  <div className="flex items-center gap-2 text-sm text-accent bg-accent/10 border border-accent/20 rounded-full px-4 py-1.5">
                    <Cpu className="w-4 h-4" />
                    <span className="font-semibold">AI Generated Content</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="w-full h-px bg-gradient-to-r from-card-border to-transparent" />

          {/* Timeline Section */}
          <div className="flex flex-col gap-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-3 tracking-tight">
              <History className="w-5 h-5 text-accent" />
              Provenance Timeline
            </h3>
            
            {activeManifest?.history && activeManifest.history.length > 0 ? (
              <div className="pl-4">
                <div className="relative border-l-2 border-white/10 ml-2 pl-8 space-y-8 py-2">
                  {activeManifest.history.map((item: any, index: number) => {
                    const isCreation = item.action.includes("created");
                    return (
                      <div key={index} className="relative group">
                        <div className={`absolute -left-[42px] top-1 w-5 h-5 rounded-full border bg-background flex justify-center items-center z-10 ${
                          isCreation ? "border-accent shadow-[0_0_20px_rgba(99,102,241,0.8)] glow-border" : "border-white/20"
                        }`}>
                          {isCreation ? <div className="w-2 h-2 rounded-full bg-accent animate-pulse" /> : <div className="w-1.5 h-1.5 rounded-full bg-white/30" />}
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center justify-between">
                            <span className={`text-base font-semibold tracking-tight ${isCreation ? "text-white text-lg" : "text-white/80"}`}>{item.display}</span>
                            {item.timestamp && <span className="text-xs font-mono text-white/40 bg-white/5 px-2 py-1 rounded-md">{new Date(item.timestamp).toLocaleDateString()}</span>}
                          </div>
                          <p className="text-sm text-white/60 mt-1.5 leading-relaxed">{item.description}</p>
                          {item.software && (
                            <div className="mt-3 text-xs font-medium text-accent border border-accent/20 rounded-lg px-3 py-1.5 w-fit bg-accent/5">
                              Created via {item.software}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-sm text-white/40 italic">No editing action history claims available.</div>
            )}
          </div>

          {/* Deep Forensic Analysis Section */}
          {forensic && forensic.signals && forensic.signals.length > 0 && (
            <div className="flex flex-col gap-6 mt-4 border-t border-white/10 pt-10">
              <div className="flex flex-col gap-1">
                <h3 className="text-xl font-bold text-white flex items-center gap-3 tracking-tight">
                  <Eye className="w-5 h-5 text-indigo-400" />
                  Deep Forensic Analysis
                </h3>
                <p className="text-sm text-white/40 ml-8">Metadata extracted directly from EXIF, XMP, IPTC, and raw binary layers.</p>
              </div>
              
              <div className="p-6 rounded-3xl border border-indigo-500/20 bg-indigo-500/[0.03] flex flex-col gap-5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-[50px] pointer-events-none" />
                <div className="flex items-center gap-4">
                  <div className={`px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-[0.1em] border ${
                    forensic.classification.includes("AI") ? "bg-indigo-500/10 text-indigo-300 border-indigo-500/20" : "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                  }`}>
                    {forensic.classification.replace("_", " ")}
                  </div>
                  <span className="text-sm font-semibold text-white/70">Confidence Level: <span className="text-white">{forensic.confidence}%</span></span>
                </div>
                <p className="text-base text-white/80 leading-relaxed font-light">{forensic.summary}</p>
                
                {forensic.possiblyStripped && (
                  <div className="mt-1 p-4 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-start gap-4">
                    <ShieldAlert className="w-6 h-6 text-orange-400 shrink-0 mt-0.5" />
                    <div className="flex flex-col gap-1">
                      <strong className="text-sm text-orange-300">Badge Stripping Detected</strong>
                      <p className="text-xs text-orange-200/70 leading-relaxed">
                        Post-processing tools (like Photoshop or Lightroom) were used after AI generation. C2PA provenance credentials may have been intentionally or accidentally removed during saving.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3">
                {forensic.signals.map((signal: any, idx: number) => (
                  <div key={idx} className="group flex flex-col sm:flex-row gap-5 p-5 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all hover:border-white/10">
                    <div className="shrink-0 pt-0.5">
                      <div className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest border ${
                        signal.confidence === "HIGH" ? "bg-red-500/10 text-red-400 border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.15)]" : 
                        signal.confidence === "MEDIUM" ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20 shadow-[0_0_10px_rgba(234,179,8,0.15)]" : 
                        "bg-white/5 text-white/40 border-white/10"
                      }`}>
                        {signal.confidence} SIGNAL
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 w-full">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-mono font-medium text-accent/70 bg-accent/10 px-2 py-0.5 rounded uppercase tracking-wider">{signal.source}</span>
                        <span className="text-[11px] font-mono text-white/30 truncate">{signal.field}</span>
                      </div>
                      <span className="text-base font-semibold text-white tracking-tight leading-snug">{signal.value}</span>
                      <p className="text-sm text-white/50 leading-relaxed font-light">{signal.meaning}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cryptographic Inspector (Sleek Accordions) */}
          {activeManifest?.assertions && activeManifest.assertions.length > 0 && (
            <div className="flex flex-col gap-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-3 tracking-tight">
                <Award className="w-5 h-5 text-accent" />
                Cryptographic Assertions
              </h3>
              
              <div className="flex flex-col gap-3">
                {activeManifest.assertions.map((assertion: any, index: number) => {
                  const isExpanded = expandedAssertion === assertion.label;
                  return (
                    <div key={index} className="border border-white/10 rounded-2xl bg-white/[0.02] overflow-hidden transition-all hover:border-white/20">
                      <button
                        onClick={() => toggleAssertion(assertion.label)}
                        className="w-full flex justify-between items-center p-4 text-left"
                      >
                        <div className="flex items-center gap-3">
                          <Code className="w-4 h-4 text-white/40" />
                          <span className="font-semibold text-sm text-white">{assertion.title}</span>
                          <span className="text-[10px] font-mono text-white/30 hidden sm:inline">{assertion.label}</span>
                        </div>
                        {isExpanded ? <ChevronDown className="w-4 h-4 text-white/50" /> : <ChevronRight className="w-4 h-4 text-white/50" />}
                      </button>
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="border-t border-white/5 bg-black/30 overflow-hidden"
                          >
                            <pre className="p-5 text-xs font-mono text-white/60 leading-relaxed overflow-x-auto">
                              {JSON.stringify(assertion.data, null, 2)}
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
          <div className="flex flex-col gap-6 border border-white/10 bg-white/[0.02] rounded-3xl p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
              <h3 className="text-lg font-bold text-white flex items-center gap-3 tracking-tight">
                <FileJson className="w-5 h-5 text-accent" />
                Raw Manifest Data
              </h3>
              <div className="flex gap-1 bg-black/40 p-1 rounded-xl border border-white/5">
                {(["visual", "json", "cert"] as ExplorerTab[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`text-xs font-semibold px-4 py-1.5 rounded-lg uppercase tracking-wider transition-all ${
                      activeTab === tab ? "bg-white text-black shadow-md" : "text-white/40 hover:text-white/80"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            <div className="min-h-[250px]">
              {activeTab === "visual" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-white/60">
                  <div className="p-4 rounded-2xl bg-black/20 border border-white/5">
                    <div className="text-[10px] uppercase tracking-widest font-bold text-white/30 mb-1">Claim Generator</div>
                    <div className="font-semibold text-white truncate">{activeManifest?.claimGenerator || "N/A"}</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-black/20 border border-white/5">
                    <div className="text-[10px] uppercase tracking-widest font-bold text-white/30 mb-1">Manifest Label</div>
                    <div className="font-mono text-xs text-white truncate">{activeManifest?.label || "N/A"}</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-black/20 border border-white/5">
                    <div className="text-[10px] uppercase tracking-widest font-bold text-white/30 mb-1">Format</div>
                    <div className="font-semibold text-white uppercase">{activeManifest?.format || "N/A"}</div>
                  </div>
                </div>
              )}

              {activeTab === "json" && (
                <pre className="p-4 rounded-2xl border border-white/5 bg-black/40 text-xs font-mono text-white/50 leading-relaxed overflow-x-auto max-h-[400px]">
                  {JSON.stringify(allManifests, null, 2)}
                </pre>
              )}

              {activeTab === "cert" && (
                <div className="flex flex-col gap-4">
                  {activeManifest?.signature ? (
                    <div className="border border-white/10 rounded-2xl bg-white/[0.01] overflow-hidden">
                      <div className="p-4 border-b border-white/10 bg-black/40 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Lock className="w-4 h-4 text-success" />
                          <span className="font-bold text-white text-sm">Signature Authority</span>
                        </div>
                        <span className="text-xs font-mono py-1 px-3 bg-success/10 text-success rounded-lg font-bold">
                          {activeManifest.signature.alg}
                        </span>
                      </div>
                      <div className="p-5 space-y-4 text-xs font-medium">
                        <div className="flex justify-between border-b border-white/5 pb-2">
                          <span className="text-white/40">Issuer</span>
                          <span className="text-white text-right">{activeManifest.signature.issuer || "N/A"}</span>
                        </div>
                        <div className="flex justify-between border-b border-white/5 pb-2">
                          <span className="text-white/40">Common Name</span>
                          <span className="text-white text-right">{activeManifest.signature.commonName || "N/A"}</span>
                        </div>
                        <div className="flex justify-between border-b border-white/5 pb-2">
                          <span className="text-white/40">Serial Number</span>
                          <span className="text-white/70 font-mono text-[10px] text-right truncate max-w-[200px]">{activeManifest.signature.serialNumber || "N/A"}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-white/40">No Digital Signature</div>
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
