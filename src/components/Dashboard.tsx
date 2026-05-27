"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, ShieldCheck, ShieldAlert, ShieldX, 
  History, Cpu, FileText, FileJson, Calendar, 
  Code, Download, RefreshCw, ChevronDown, 
  ChevronRight, Award, Lock, ExternalLink, Eye, Copy, Check, Info
} from "@/components/CustomIcons";
import useStore from "@/store/useStore";
import { buildPdfReportHtml } from "@/lib/reportBuilder";

type TechnicalTab = "timeline" | "forensics" | "signatures" | "assertions";

export const Dashboard: React.FC = () => {
  const activeAnalysis = useStore((state) => state.activeAnalysis);
  const resetAll = useStore((state) => state.resetAll);
  const setView = useStore((state) => state.setView);
  
  const [activeTab, setActiveTab] = useState<TechnicalTab>("timeline");
  const [expandedAssertion, setExpandedAssertion] = useState<string | null>(null);
  const [copiedAssertion, setCopiedAssertion] = useState<string | null>(null);
  const [copiedJson, setCopiedJson] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

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

  const handleCopyRawJson = () => {
    navigator.clipboard.writeText(JSON.stringify(allManifests, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const downloadPdfReport = () => {
    setShowExportMenu(false);
    const reportDate = new Date().toLocaleString(undefined, { dateStyle: "long", timeStyle: "short" });
    const html = buildPdfReportHtml({
      title: activeManifest?.title || "Unknown Asset",
      trustLevel,
      trustTitle: getTrustStatusStyles().title,
      trustReason,
      isAiGenerated: !!activeManifest?.isAiGenerated,
      origin: getOriginName(),
      signatureTime: activeManifest?.signature?.time
        ? new Date(activeManifest.signature.time).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
        : "Not recorded",
      format: (activeManifest?.format?.split("/")[1] || "JPEG").toUpperCase(),
      dimensions: getDimensions(),
      editingSoftware: getEditingSoftware(),
      aiTraining: getAiTrainingRestriction(),
      thumbnailBase64: activeManifest?.thumbnailBase64,
      confidence: forensic?.confidence,
      history: activeManifest?.history || [],
      signals: forensic?.signals || [],
      signature: activeManifest?.signature,
      cameraInfo: getCameraInfo(),
      reportDate,
    });
    const win = window.open("", "_blank");
    if (win) { win.document.write(html); win.document.close(); }
  };

  const downloadJsonReport = () => {
    setShowExportMenu(false);
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(activeAnalysis, null, 2));
    const a = document.createElement("a");
    a.setAttribute("href", dataStr);
    a.setAttribute("download", `${activeManifest?.title || "c2pa"}-provenance-report.json`);
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const getTrustStatusStyles = () => {
    switch (trustLevel) {
      case "VERIFIED":
        return {
          icon: <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />,
          borderColor: "border-emerald-500/20 dark:border-emerald-500/30",
          bgColor: "bg-emerald-500/[0.02] dark:bg-emerald-500/[0.015]",
          textColor: "text-emerald-700 dark:text-emerald-400",
          badgeBg: "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/20",
          title: "Verified Origin",
        };
      case "PARTIAL":
        const isMetadataScan = validationState === "MetadataDetected";
        return {
          icon: <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />,
          borderColor: "border-amber-500/20 dark:border-amber-500/30",
          bgColor: "bg-amber-500/[0.02] dark:bg-amber-500/[0.015]",
          textColor: "text-amber-700 dark:text-amber-400",
          badgeBg: "bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/20",
          title: isMetadataScan ? "AI Metadata Detected" : "Untrusted Signature",
        };
      case "UNVERIFIED":
      default:
        return {
          icon: <ShieldX className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />,
          borderColor: "border-red-500/20 dark:border-red-500/30",
          bgColor: "bg-red-500/[0.02] dark:bg-red-500/[0.015]",
          textColor: "text-red-700 dark:text-red-400",
          badgeBg: "bg-red-500/10 text-red-800 dark:text-red-300 border-red-500/20",
          title: "Unverified Content",
        };
    }
  };

  const trustStyle = getTrustStatusStyles();

  const getOriginName = () => {
    if (!activeManifest) return "Unknown Source";
    return activeManifest.aiGeneratorTool || activeManifest.claimGeneratorDisplay?.split("via")?.pop()?.trim() || "Unknown Software";
  };

  // Extract camera capture specifications if available
  const getCameraInfo = () => {
    if (!forensic?.exifFields) return null;
    const make = forensic.exifFields.Make;
    const model = forensic.exifFields.Model;
    if (!make && !model) return null;
    return {
      make: make?.toString() || "",
      model: model?.toString() || "",
      exposure: forensic.exifFields.ExposureTime ? `${forensic.exifFields.ExposureTime}s` : null,
      aperture: forensic.exifFields.FNumber ? `f/${forensic.exifFields.FNumber}` : null,
      iso: forensic.exifFields.ISO || forensic.exifFields.ISOSpeedRatings || null,
      lens: forensic.exifFields.LensModel || forensic.exifFields.LensInfo || null,
      focalLength: forensic.exifFields.FocalLength ? `${forensic.exifFields.FocalLength}mm` : null,
    };
  };

  const cameraInfo = getCameraInfo();

  // Extract dimensions
  const getDimensions = () => {
    const width = forensic?.exifFields?.PixelXDimension || forensic?.exifFields?.ImageWidth || forensic?.xmpFields?.PixelXDimension;
    const height = forensic?.exifFields?.PixelYDimension || forensic?.exifFields?.ImageHeight || forensic?.xmpFields?.PixelYDimension;
    if (width && height) return `${width} × ${height} px`;
    return null;
  };

  const dimensions = getDimensions();

  // Parse AI Training restriction from stds.schema-org.CreativeWork or c2pa.training-mining
  const getAiTrainingRestriction = () => {
    if (!activeManifest?.assertions) return "No restrictions specified";
    const assertion = activeManifest.assertions.find(
      (a: any) => a.label === "c2pa.training-mining"
    );
    if (!assertion || !assertion.data) return "No restrictions specified";
    
    const entries = assertion.data.entries || {};
    const training = entries["c2pa.ai-training"]?.constraint;
    const mining = entries["c2pa.ai-data-mining"]?.constraint;
    
    if (training === "c2pa.restricted" && mining === "c2pa.restricted") {
      return "Restricted (Do Not Train or Mine)";
    } else if (training === "c2pa.restricted") {
      return "Restricted (Do Not Train)";
    } else if (mining === "c2pa.restricted") {
      return "Restricted (Do Not Mine)";
    }
    return "Allowed / No restrictions";
  };

  const aiTraining = getAiTrainingRestriction();

  // Compile editing software list
  const getEditingSoftware = () => {
    const list: string[] = [];
    if (activeManifest?.history) {
      activeManifest.history.forEach((h: any) => {
        if (h.software && h.software !== activeManifest.aiGeneratorTool && h.software !== getOriginName()) {
          list.push(h.software);
        }
      });
    }
    if (forensic?.exifFields?.Software) {
      const sw = forensic.exifFields.Software.toString();
      if (!list.some(item => item.toLowerCase().includes(sw.toLowerCase()))) {
        list.push(sw);
      }
    }
    const unique = Array.from(new Set(list));
    return unique.length > 0 ? unique.join(", ") : "None detected";
  };

  const editingSoftware = getEditingSoftware();

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-8 min-h-screen text-foreground select-text">
      
      {/* Top Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-5 border-b border-card-border">
        <button
          onClick={resetAll}
          className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-foreground/50 hover:text-foreground transition-all bg-foreground/[0.02] hover:bg-foreground/[0.05] border border-card-border rounded-full py-2 px-4 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>New Upload</span>
        </button>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={() => setView("compare")}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wider border border-card-border text-foreground/75 hover:text-foreground bg-foreground/[0.01] hover:bg-foreground/[0.04] transition-all rounded-full py-2 px-4 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-accent" />
            <span>Compare Flow</span>
          </button>

          {/* Split export button */}
          <div className="relative flex-1 sm:flex-initial" ref={exportMenuRef}>
            <div className="flex">
              <button
                onClick={downloadPdfReport}
                className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider bg-foreground text-background hover:bg-foreground/90 transition-all rounded-l-full py-2 pl-4 pr-3 cursor-pointer whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Report</span>
              </button>
              <button
                onClick={() => setShowExportMenu(v => !v)}
                className="flex items-center justify-center bg-foreground text-background hover:bg-foreground/85 transition-all rounded-r-full py-2 px-2.5 border-l border-background/20 cursor-pointer"
                aria-label="More export options"
              >
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showExportMenu ? "rotate-180" : ""}`} />
              </button>
            </div>

            {showExportMenu && (
              <div className="absolute right-0 top-full mt-2 w-54 rounded-xl border border-card-border bg-[#060f12] shadow-2xl shadow-black/70 overflow-hidden z-50">
                <div className="px-3.5 py-2 border-b border-card-border">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-foreground/30">Export options</span>
                </div>
                <button
                  onClick={downloadPdfReport}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-foreground/[0.04] transition-colors cursor-pointer border-b border-card-border"
                >
                  <span className="text-lg leading-none">📄</span>
                  <div>
                    <div className="text-xs font-bold text-foreground">PDF Report</div>
                    <div className="text-[10px] text-foreground/40 mt-0.5">Branded provenance report</div>
                  </div>
                </button>
                <button
                  onClick={downloadJsonReport}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-foreground/[0.04] transition-colors cursor-pointer"
                >
                  <FileJson className="w-4 h-4 text-foreground/40 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-foreground/70">JSON Data</div>
                    <div className="text-[10px] text-foreground/40 mt-0.5">Raw C2PA manifest data</div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
         SECTION 1: GENERAL USER OVERVIEW (SIMPLE & CLEAR)
         ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row gap-8 items-stretch">
        
        {/* Left Column: Image Card */}
        <div className="w-full lg:w-5/12 flex flex-col">
          <div className="flex-1 rounded-[1.5rem] border border-card-border bg-card-bg/40 backdrop-blur-xl p-4 flex flex-col justify-between shadow-sm relative">
            {/* Viewfinder Corners */}
            <div className="absolute top-4.5 left-4.5 w-3.5 h-3.5 border-t-2 border-l-2 border-foreground/15 rounded-tl-sm pointer-events-none" />
            <div className="absolute top-4.5 right-4.5 w-3.5 h-3.5 border-t-2 border-r-2 border-foreground/15 rounded-tr-sm pointer-events-none" />
            <div className="absolute bottom-4.5 left-4.5 w-3.5 h-3.5 border-b-2 border-l-2 border-foreground/15 rounded-bl-sm pointer-events-none" />
            <div className="absolute bottom-4.5 right-4.5 w-3.5 h-3.5 border-b-2 border-r-2 border-foreground/15 rounded-br-sm pointer-events-none" />

            <div className="aspect-[4/3] rounded-[1rem] overflow-hidden bg-black/[0.04] dark:bg-black/45 relative flex items-center justify-center border border-card-border/60">
              {activeManifest?.thumbnailBase64 ? (
                <img 
                  src={activeManifest.thumbnailBase64} 
                  alt="Embedded Provenance Thumbnail"
                  className="w-full h-full object-contain select-none"
                />
              ) : (
                <div className="w-full h-full flex flex-col justify-center items-center text-foreground/30 gap-2">
                  <FileText className="w-10 h-10 stroke-[1.2] opacity-40" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider">No Embedded Thumbnail</span>
                </div>
              )}
            </div>
            
            {/* Minimalist File Info */}
            <div className="mt-4 pt-4 border-t border-card-border/60 grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-foreground/45 block text-[10px] uppercase tracking-wider">Filename</span>
                <span className="font-semibold text-foreground truncate block mt-0.5" title={activeManifest?.title || "Unknown Asset"}>
                  {activeManifest?.title || "Unknown Asset"}
                </span>
              </div>
              <div>
                <span className="text-foreground/45 block text-[10px] uppercase tracking-wider">Format & Resolution</span>
                <span className="font-semibold text-foreground block mt-0.5">
                  {(activeManifest?.format?.split("/")[1] || "JPEG").toUpperCase()} {dimensions ? `• ${dimensions}` : ""}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Authenticity Summary Card */}
        <div className="w-full lg:w-7/12 flex flex-col">
          <div className={`flex-1 rounded-[1.5rem] border ${trustStyle.borderColor} ${trustStyle.bgColor} p-6 sm:p-7 flex flex-col justify-between shadow-sm relative`}>
            {/* Viewfinder Corners */}
            <div className="absolute top-5 left-5 w-4 h-4 border-t-2 border-l-2 border-foreground/15 rounded-tl-sm pointer-events-none" />
            <div className="absolute top-5 right-5 w-4 h-4 border-t-2 border-r-2 border-foreground/15 rounded-tr-sm pointer-events-none" />
            <div className="absolute bottom-5 left-5 w-4 h-4 border-b-2 border-l-2 border-foreground/15 rounded-bl-sm pointer-events-none" />
            <div className="absolute bottom-5 right-5 w-4 h-4 border-b-2 border-r-2 border-foreground/15 rounded-br-sm pointer-events-none" />
            
            {/* Title & Trust Status */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${trustStyle.badgeBg}`}>
                  {trustStyle.icon}
                  {trustStyle.title}
                </span>
                {activeManifest?.isAiGenerated && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-accent/20 bg-accent/5 text-accent text-[10px] font-bold uppercase tracking-wider">
                    <Cpu className="w-3 h-3" />
                    AI Origin
                  </span>
                )}
              </div>

              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mt-2">
                {activeManifest?.isAiGenerated ? (
                  <>
                    AI Generated Media
                    <span className="block text-xs sm:text-sm font-semibold text-foreground/45 mt-1.5 uppercase tracking-wider">
                      Generated via {getOriginName()}
                    </span>
                  </>
                ) : (
                  <>
                    Authentic Physical Origin
                    {cameraInfo ? (
                      <span className="block text-xs sm:text-sm font-semibold text-foreground/45 mt-1.5 uppercase tracking-wider">
                        Captured via {cameraInfo.make} {cameraInfo.model}
                      </span>
                    ) : (
                      activeManifest && (
                        <span className="block text-xs sm:text-sm font-semibold text-foreground/45 mt-1.5 uppercase tracking-wider">
                          Processed via {getOriginName()}
                        </span>
                      )
                    )}
                  </>
                )}
              </h2>

              <p className="text-sm text-foreground/70 leading-relaxed mt-3 max-w-xl">
                {trustReason}
              </p>
            </div>

            {/* Core Creation Grid (layman stats) */}
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 pt-6 border-t border-card-border">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] uppercase tracking-wider text-foreground/40 font-semibold">Creator / Source Tool</span>
                <span className="text-sm font-semibold text-foreground flex items-center gap-1.5 mt-0.5">
                  <Cpu className="w-4 h-4 text-foreground/50" />
                  {getOriginName()}
                </span>
              </div>

              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] uppercase tracking-wider text-foreground/40 font-semibold">Capture / Signature Date</span>
                <span className="text-sm font-semibold text-foreground flex items-center gap-1.5 mt-0.5">
                  <Calendar className="w-4 h-4 text-foreground/50" />
                  {activeManifest?.signature?.time 
                    ? new Date(activeManifest.signature.time).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) 
                    : "Not recorded"}
                </span>
              </div>

              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] uppercase tracking-wider text-foreground/40 font-semibold">Editing Software Used</span>
                <span className="text-sm font-semibold text-foreground flex items-center gap-1.5 mt-0.5">
                  <FileText className="w-4 h-4 text-foreground/50" />
                  {editingSoftware}
                </span>
              </div>

              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] uppercase tracking-wider text-foreground/40 font-semibold">AI Training Rights</span>
                <span className="text-sm font-semibold text-foreground flex items-center gap-1.5 mt-0.5">
                  <Lock className="w-4 h-4 text-foreground/50" />
                  {aiTraining}
                </span>
              </div>
            </div>

            {/* Camera Exif Metadata Summary (if human origin camera present) */}
            {cameraInfo && (
              <div className="mt-6 p-4 rounded-xl border border-card-border bg-foreground/[0.01] flex flex-col gap-2.5">
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold text-foreground/50">
                  <Info className="w-3.5 h-3.5" />
                  Camera Capture Specifications
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-foreground/40 block text-[9px] uppercase font-semibold">Device</span>
                    <span className="font-semibold text-foreground truncate block">{cameraInfo.make} {cameraInfo.model}</span>
                  </div>
                  {cameraInfo.lens && (
                    <div className="col-span-1 sm:col-span-2">
                      <span className="text-foreground/40 block text-[9px] uppercase font-semibold">Lens</span>
                      <span className="font-semibold text-foreground truncate block" title={cameraInfo.lens}>{cameraInfo.lens}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-foreground/40 block text-[9px] uppercase font-semibold">Exposure Settings</span>
                    <span className="font-semibold text-foreground block">
                      {[cameraInfo.aperture, cameraInfo.exposure, cameraInfo.iso ? `ISO ${cameraInfo.iso}` : null].filter(Boolean).join(" • ")}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      <div className="w-full h-px bg-card-border my-2" />

      {/* ─────────────────────────────────────────────────────────────
         SECTION 2: ADVANCED TECHNICAL BREAKDOWN (TABBED & STRUCTURED)
         ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-6">
        
        {/* Tab Switcher */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Award className="w-4.5 h-4.5 text-accent" />
            <h3 className="text-lg font-bold tracking-tight text-foreground">Advanced Provenance Report</h3>
          </div>

          <div className="flex flex-wrap gap-1 p-0.5 rounded-xl border border-card-border bg-foreground/[0.01] w-full sm:w-auto">
            {(["timeline", "forensics", "signatures", "assertions"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 sm:flex-none text-[10px] font-bold px-4 py-2 rounded-lg uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === tab 
                    ? "bg-foreground text-background shadow-sm" 
                    : "text-foreground/50 hover:text-foreground/80"
                }`}
              >
                {tab === "timeline" && "Edit History"}
                {tab === "forensics" && "Forensic Logs"}
                {tab === "signatures" && "Digital Certs"}
                {tab === "assertions" && "Raw Assertions"}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Contents */}
        <div className="rounded-2xl border border-card-border bg-card-bg/25 backdrop-blur-xl p-5 min-h-[300px]">
          <AnimatePresence mode="wait">
            
            {/* TAB 1: EDIT TIMELINE */}
            {activeTab === "timeline" && (
              <motion.div
                key="timeline"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-4"
              >
                <div className="flex flex-col gap-1 mb-2">
                  <h4 className="text-sm font-bold text-foreground">Provenance History Log</h4>
                  <p className="text-xs text-foreground/40">Cryptographic audit log of actions applied to this file since creation.</p>
                </div>

                {activeManifest?.history && activeManifest.history.length > 0 ? (
                  <div className="pl-2 py-2">
                    <div className="relative border-l border-card-border ml-2 pl-6 space-y-6">
                      {activeManifest.history.map((item: any, index: number) => {
                        const isCreation = item.action?.includes("created") || index === 0;
                        return (
                          <div key={index} className="relative group">
                            {/* Bullet Point */}
                            <div className="absolute -left-[31px] top-1 z-10">
                              {isCreation ? (
                                <div className="w-3.5 h-3.5 rounded-full border border-accent/40 bg-background flex items-center justify-center shadow-sm">
                                  <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                                </div>
                              ) : (
                                <div className="w-2.5 h-2.5 rounded-full border border-card-border bg-card-bg flex items-center justify-center ml-0.5 mt-0.5">
                                  <span className="w-1 h-1 rounded-full bg-foreground/30" />
                                </div>
                              )}
                            </div>

                            <div className="flex flex-col gap-1">
                              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                                <span className={`text-xs font-bold tracking-tight uppercase ${isCreation ? "text-foreground" : "text-foreground/80"}`}>
                                  {item.display}
                                </span>
                                {item.timestamp && (
                                  <span className="text-[10px] font-mono text-foreground/45 bg-foreground/[0.02] border border-card-border px-2 py-0.5 rounded">
                                    {new Date(item.timestamp).toLocaleString()}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-foreground/50 leading-relaxed max-w-2xl">{item.description}</p>
                              {item.software && (
                                <div className="mt-1 text-[9px] font-semibold text-accent border border-accent/15 rounded px-2 py-0.5 w-fit bg-accent/5 uppercase tracking-wider">
                                  Via {item.software}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-foreground/30 italic py-6">No editing history available in the manifest.</div>
                )}
              </motion.div>
            )}

            {/* TAB 2: FORENSIC SIGNALS */}
            {activeTab === "forensics" && (
              <motion.div
                key="forensics"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-4"
              >
                <div className="flex flex-col gap-1 mb-2">
                  <h4 className="text-sm font-bold text-foreground">Deep Forensic Analysis Logs</h4>
                  <p className="text-xs text-foreground/40">Metadata signals extracted directly from EXIF, XMP, IPTC, and raw binary signatures.</p>
                </div>

                {forensic && forensic.signals && forensic.signals.length > 0 ? (
                  <div className="flex flex-col gap-4">
                    {/* Summary Callout */}
                    <div className="p-4 rounded-xl border border-card-border bg-foreground/[0.01] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-semibold text-foreground">Scanned Metadata Profile</span>
                        <p className="text-xs text-foreground/60 leading-relaxed max-w-xl">{forensic.summary}</p>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="text-[9px] font-semibold text-foreground/40 uppercase">Confidence</span>
                          <span className="text-lg font-bold text-foreground">{forensic.confidence}%</span>
                        </div>
                        <div className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${
                          forensic.classification?.includes("AI") 
                            ? "bg-accent/10 text-accent border-accent/20" 
                            : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                        }`}>
                          {forensic.classification?.replace("_", " ")}
                        </div>
                      </div>
                    </div>

                    {/* Stripped Badge Warn */}
                    {forensic.possiblyStripped && (
                      <div className="p-3.5 rounded-xl bg-amber-500/[0.02] border border-amber-500/15 flex items-start gap-3">
                        <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-xs text-amber-700 dark:text-amber-300 font-semibold uppercase tracking-wider block">Metadata Stripping Detected</strong>
                          <p className="text-[11px] text-foreground/50 leading-relaxed mt-0.5">
                            Post-processing signs were found (e.g. Photoshop resource blocks). Original C2PA Content Credentials may have been removed during conversion or export.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Signals Grid Table */}
                    <div className="overflow-x-auto border border-card-border rounded-xl bg-black/[0.02]">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className="border-b border-card-border bg-foreground/[0.01]">
                            <th className="py-3 px-4 font-semibold text-foreground/40 uppercase tracking-wider w-1/6">Source</th>
                            <th className="py-3 px-4 font-semibold text-foreground/40 uppercase tracking-wider w-1/4">Metadata Tag</th>
                            <th className="py-3 px-4 font-semibold text-foreground/40 uppercase tracking-wider w-1/4">Reported Value</th>
                            <th className="py-3 px-4 font-semibold text-foreground/40 uppercase tracking-wider w-1/3">Scanned Meaning</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-card-border">
                          {forensic.signals.map((signal: any, idx: number) => (
                            <tr key={idx} className="hover:bg-foreground/[0.01] transition-colors">
                              <td className="py-3 px-4">
                                <span className="text-[9px] font-mono font-bold text-accent/80 bg-accent/5 px-2 py-0.5 rounded border border-accent/10 uppercase tracking-wider">
                                  {signal.source}
                                </span>
                              </td>
                              <td className="py-3 px-4 font-mono text-[10px] text-foreground/70 truncate max-w-[200px]">{signal.field}</td>
                              <td className="py-3 px-4 font-semibold text-foreground truncate max-w-[200px]" title={signal.value}>{signal.value}</td>
                              <td className="py-3 px-4 text-foreground/60 leading-relaxed">{signal.meaning}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-foreground/30 italic py-6">No forensic metadata logs available.</div>
                )}
              </motion.div>
            )}

            {/* TAB 3: DIGITAL SIGNATURES */}
            {activeTab === "signatures" && (
              <motion.div
                key="signatures"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-4"
              >
                <div className="flex flex-col gap-1 mb-2">
                  <h4 className="text-sm font-bold text-foreground">Digital Certificate Verification</h4>
                  <p className="text-xs text-foreground/40">Cryptographic certificates verifying the authenticity of the signing authority.</p>
                </div>

                {activeManifest?.signature ? (
                  <div className="max-w-xl border border-card-border rounded-xl overflow-hidden bg-black/[0.01]">
                    <div className="p-4 border-b border-card-border bg-foreground/[0.01] flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span className="font-bold text-foreground text-[10px] uppercase tracking-wider">Signing Authority Chain</span>
                      </div>
                      <span className="text-[9px] font-mono py-0.5 px-2 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 rounded font-bold uppercase border border-emerald-500/20">
                        {activeManifest.signature.alg}
                      </span>
                    </div>
                    <div className="p-4 space-y-3.5 text-xs">
                      <div className="flex justify-between border-b border-card-border pb-2 gap-4">
                        <span className="text-foreground/45">Issuer Certificate Authority</span>
                        <span className="text-foreground text-right font-medium">{activeManifest.signature.issuer || "Unknown Issuer"}</span>
                      </div>
                      <div className="flex justify-between border-b border-card-border pb-2 gap-4">
                        <span className="text-foreground/45">Common Name (CN)</span>
                        <span className="text-foreground text-right font-medium">{activeManifest.signature.commonName || "Unknown CN"}</span>
                      </div>
                      <div className="flex justify-between pb-1 gap-4">
                        <span className="text-foreground/45">Certificate Serial Number</span>
                        <span className="text-foreground/70 font-mono text-[10px] text-right truncate max-w-[280px]">
                          {activeManifest.signature.serialNumber || "None"}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-foreground/30 italic py-6">No cryptographic signing certificate details available.</div>
                )}
              </motion.div>
            )}

            {/* TAB 4: RAW ASSERTIONS & JSON */}
            {activeTab === "assertions" && (
              <motion.div
                key="assertions"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-6"
              >
                {/* 4a. Cryptographic assertions */}
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1">
                    <h4 className="text-sm font-bold text-foreground">Cryptographic Assertions</h4>
                    <p className="text-xs text-foreground/40">C2PA claims signed securely inside the media file header block.</p>
                  </div>
                  
                  {activeManifest?.assertions && activeManifest.assertions.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      {activeManifest.assertions.map((assertion: any, index: number) => {
                        const isExpanded = expandedAssertion === assertion.label;
                        const jsonStr = JSON.stringify(assertion.data, null, 2);
                        return (
                          <div key={index} className="border border-card-border rounded-xl bg-black/[0.01] overflow-hidden transition-all">
                            <button
                              onClick={() => toggleAssertion(assertion.label)}
                              className="w-full flex justify-between items-center p-3.5 text-left cursor-pointer hover:bg-foreground/[0.01]"
                            >
                              <div className="flex items-center gap-2.5">
                                <Code className="w-4 h-4 text-foreground/35" />
                                <span className="font-semibold text-xs text-foreground uppercase tracking-wider">{assertion.title}</span>
                                <span className="text-[9px] font-mono text-foreground/30 hidden sm:inline">{assertion.label}</span>
                              </div>
                              {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-foreground/40" /> : <ChevronRight className="w-3.5 h-3.5 text-foreground/40" />}
                            </button>
                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="border-t border-card-border bg-black/[0.04] overflow-hidden relative"
                                >
                                  <button
                                    onClick={() => handleCopyText(jsonStr, assertion.label)}
                                    className="absolute top-3 right-3 text-foreground/40 hover:text-foreground bg-foreground/[0.02] hover:bg-foreground/[0.06] border border-card-border p-1.5 rounded-lg transition-colors cursor-pointer"
                                    title="Copy Assertion JSON"
                                  >
                                    {copiedAssertion === assertion.label ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                  </button>
                                  <pre className="p-4 text-[11px] font-mono text-foreground/60 leading-relaxed overflow-x-auto max-h-[300px]">
                                    {jsonStr}
                                  </pre>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-xs text-foreground/30 italic py-2">No assertions found in the manifest store.</div>
                  )}
                </div>

                {/* 4b. Raw JSON explorer */}
                <div className="flex flex-col gap-4 border-t border-card-border pt-6">
                  <div className="flex justify-between items-center">
                    <div className="flex flex-col gap-1">
                      <h4 className="text-sm font-bold text-foreground">Manifest Store JSON</h4>
                      <p className="text-xs text-foreground/40">Raw structured C2PA JSON tree parsed from the file's binary headers.</p>
                    </div>
                    <button
                      onClick={handleCopyRawJson}
                      className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider py-1.5 px-3 rounded-lg border border-card-border bg-foreground/[0.02] hover:bg-foreground/[0.06] text-foreground transition-all cursor-pointer"
                    >
                      {copiedJson ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>Copy Full JSON</span>
                    </button>
                  </div>

                  <pre className="p-4 rounded-xl border border-card-border bg-black/[0.04] text-[11px] font-mono text-foreground/50 leading-relaxed overflow-x-auto max-h-[350px]">
                    {JSON.stringify(allManifests, null, 2)}
                  </pre>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

      </div>

    </div>
  );
};

export default Dashboard;
