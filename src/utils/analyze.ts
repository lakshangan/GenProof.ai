/**
 * GenProof.ai — Browser-side C2PA + Forensic Analysis
 * Runs 100% in the browser using WebAssembly. No server needed.
 */

import exifr from "exifr";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export interface ForensicSignal {
  field: string;
  value: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  source: "EXIF" | "XMP" | "IPTC" | "BINARY" | "C2PA";
  meaning: string;
}

export interface TransformedAction {
  action: string;
  display: string;
  description: string;
  software?: string;
  timestamp?: string;
}

export interface TransformedAssertion {
  label: string;
  title: string;
  data: any;
}

export interface TransformedManifest {
  label: string;
  title: string;
  format: string;
  claimGenerator: string;
  claimGeneratorDisplay: string;
  isAiGenerated: boolean;
  aiGeneratorTool?: string;
  signature?: {
    alg: string;
    issuer?: string;
    commonName?: string;
    serialNumber?: string;
    time?: string;
  };
  thumbnailBase64?: string;
  assertions: TransformedAssertion[];
  history: TransformedAction[];
}

export interface ProvenanceReport {
  hasCredentials: boolean;
  trustLevel: "VERIFIED" | "PARTIAL" | "UNVERIFIED";
  trustReason: string;
  activeManifest: TransformedManifest | null;
  allManifests: Record<string, any>;
  validationStatus: any[];
  validationState: string;
  forensic?: ForensicReport | null;
}

export interface ForensicReport {
  classification: "AI_GENERATED" | "AI_EDITED" | "HUMAN_ORIGIN" | "UNKNOWN";
  confidence: number;
  generator: string | null;
  signals: ForensicSignal[];
  exifFields: Record<string, any>;
  xmpFields: Record<string, any>;
  iptcFields: Record<string, any>;
  summary: string;
  reasons: string[];
  possiblyStripped: boolean;
  strippedEvidence: string[];
}

// ─────────────────────────────────────────────
// C2PA SINGLETON CACHE
// ─────────────────────────────────────────────

let c2paInstance: any = null;

async function getC2pa() {
  if (c2paInstance) return c2paInstance;
  try {
    const { createC2pa } = await import("c2pa");
    c2paInstance = await createC2pa({
      wasmSrc: "/c2pa.wasm",
      workerSrc: "/c2pa.worker.js",
    });
    return c2paInstance;
  } catch (err) {
    console.warn("C2PA WASM init failed:", err);
    return null;
  }
}

// ─────────────────────────────────────────────
// ACTION / ASSERTION MAPS
// ─────────────────────────────────────────────

const ACTION_MAP: Record<string, { display: string; description: string }> = {
  "c2pa.created":          { display: "Created",          description: "The media file was originally created or captured." },
  "c2pa.converted":        { display: "Format Converted", description: "The asset was converted to a different file format." },
  "c2pa.resized":          { display: "Resized",           description: "The dimensions were modified." },
  "c2pa.cropped":          { display: "Cropped",           description: "The borders were cropped." },
  "c2pa.edited":           { display: "Modified",          description: "The asset was edited or modified." },
  "c2pa.filtered":         { display: "Filter Applied",    description: "A color filter or visual effect was applied." },
  "c2pa.placed":           { display: "Composite Placed",  description: "External elements were composited into the asset." },
  "c2pa.removed":          { display: "Elements Removed",  description: "Content or layers were removed." },
  "c2pa.color_adjustments":{ display: "Color Adjustments", description: "Colors, brightness, or levels were adjusted." },
  "c2pa.orientation":      { display: "Orientation Changed", description: "The asset was rotated or flipped." },
};

const ASSERTION_MAP: Record<string, string> = {
  "stds.schema-org.CreativeWork": "Creative Work Details",
  "c2pa.actions":                 "Editing Actions History",
  "c2pa.actions.v2":              "Editing Actions History",
  "c2pa.hash.data":               "Asset Content Hash",
  "c2pa.thumbnail.claim.jpeg":    "Claim Thumbnail",
  "c2pa.thumbnail.claim.png":     "Claim Thumbnail",
  "c2pa.metadata":                "Additional Metadata",
  "c2pa.training-mining":         "AI Training Restrictions",
};

function getFriendlyGenerator(gen: string): { display: string; isAi: boolean; tool?: string } {
  const g = gen.toLowerCase();
  if (g.includes("adobe firefly") || g.includes("firefly")) return { display: "Adobe Firefly", isAi: true, tool: "Adobe Firefly" };
  if (g.includes("photoshop"))      return { display: "Adobe Photoshop", isAi: false };
  if (g.includes("dall"))           return { display: "OpenAI DALL-E", isAi: true, tool: "DALL-E" };
  if (g.includes("midjourney"))     return { display: "Midjourney", isAi: true, tool: "Midjourney" };
  if (g.includes("stable diffusion") || g.includes("stablediffusion")) return { display: "Stable Diffusion", isAi: true, tool: "Stable Diffusion" };
  if (g.includes("gemini"))         return { display: "Google Gemini", isAi: true, tool: "Gemini" };
  if (g.includes("imagen"))         return { display: "Google Imagen", isAi: true, tool: "Imagen" };
  if (g.includes("runway"))         return { display: "Runway Gen", isAi: true, tool: "Runway" };
  if (g.includes("c2patool") || g.includes("make_test_images")) return { display: "C2PA Test Tool", isAi: false };
  const match = gen.match(/^([^/]+)/);
  const base = match ? match[1].trim() : gen;
  return { display: base.charAt(0).toUpperCase() + base.slice(1), isAi: g.includes("ai-generator") || g.includes("synthetic") };
}

// ─────────────────────────────────────────────
// C2PA BROWSER PARSE
// ─────────────────────────────────────────────

async function parseC2pa(file: File): Promise<ProvenanceReport | null> {
  try {
    const c2pa = await getC2pa();
    if (!c2pa) return null;

    const result = await c2pa.read(file);
    if (!result || !result.manifestStore) return null;

    const store = result.manifestStore;
    const active = store.activeManifest;
    if (!active) return null;

    // Trust level
    const validationResults = store.validationResults || [];
    const valErrors = validationResults.filter((v: any) => v.isError);
    const hasUntrusted = validationResults.some((v: any) =>
      v.code === "signingCredential.untrusted" || (v.explanation && v.explanation.includes("untrusted"))
    );

    let trustLevel: "VERIFIED" | "PARTIAL" | "UNVERIFIED" = "VERIFIED";
    let trustReason = "Content credentials are cryptographically valid and the asset has not been tampered with.";

    if (valErrors.length > 0) {
      trustLevel = "UNVERIFIED";
      trustReason = "This asset has invalid content credentials. The signature is broken or the file has been tampered with after signing.";
    } else if (hasUntrusted) {
      trustLevel = "VERIFIED";
      trustReason = "Content credentials are cryptographically valid and untampered, signed by an unrecognized or test certificate authority.";
    }

    // Thumbnail
    let thumbnailBase64: string | undefined;
    try {
      if (active.thumbnail?.blob) {
        const buf = await active.thumbnail.blob.arrayBuffer();
        const bytes = new Uint8Array(buf);
        const b64 = btoa(bytes.reduce((acc, b) => acc + String.fromCharCode(b), ""));
        thumbnailBase64 = `data:${active.thumbnail.mimeType || "image/jpeg"};base64,${b64}`;
      }
    } catch { /* skip thumbnail */ }

    // Generator
    const genDetails = getFriendlyGenerator(active.claimGenerator || "");

    // Assertions
    const assertions: TransformedAssertion[] = (active.assertions || []).map((a: any) => ({
      label: a.label,
      title: ASSERTION_MAP[a.label] || (a.label.split(".").pop() ?? a.label),
      data: a.data,
    }));

    // History
    const history: TransformedAction[] = [];
    const actionsAss = assertions.find(a => a.label === "c2pa.actions" || a.label === "c2pa.actions.v2");
    if (actionsAss?.data?.actions) {
      for (const act of actionsAss.data.actions) {
        const mapped = ACTION_MAP[act.action] || { display: act.action, description: `Action: ${act.action}` };
        history.push({
          action: act.action,
          display: mapped.display,
          description: mapped.description,
          software: act.softwareAgent ? getFriendlyGenerator(act.softwareAgent).display : genDetails.display,
          timestamp: act.when || active.signatureInfo?.time,
        });
      }
    }
    if (history.length === 0) {
      history.push({
        action: "c2pa.created",
        display: "Created",
        description: `Generated using ${genDetails.display}.`,
        software: genDetails.display,
        timestamp: active.signatureInfo?.time,
      });
    }

    const manifest: TransformedManifest = {
      label: active.label || "active",
      title: active.title || file.name,
      format: active.format || file.type,
      claimGenerator: active.claimGenerator || "",
      claimGeneratorDisplay: genDetails.isAi
        ? `Generated using ${genDetails.display}`
        : `Processed via ${genDetails.display}`,
      isAiGenerated: genDetails.isAi,
      aiGeneratorTool: genDetails.tool,
      thumbnailBase64,
      assertions,
      history,
    };

    if (active.signatureInfo) {
      manifest.signature = {
        alg: active.signatureInfo.alg,
        issuer: active.signatureInfo.issuer,
        commonName: active.signatureInfo.commonName,
        serialNumber: active.signatureInfo.certSerialNumber,
        time: active.signatureInfo.time,
      };
    }

    return {
      hasCredentials: true,
      trustLevel,
      trustReason,
      activeManifest: manifest,
      allManifests: store.manifests || {},
      validationStatus: validationResults,
      validationState: valErrors.length > 0 ? "Invalid" : "Valid",
    };
  } catch (err) {
    console.warn("C2PA browser parse failed:", err);
    return null;
  }
}

// ─────────────────────────────────────────────
// FORENSIC METADATA ANALYSIS (EXIF/XMP/IPTC + Binary)
// ─────────────────────────────────────────────

async function runForensics(file: File): Promise<ForensicReport> {
  const signals: ForensicSignal[] = [];
  const reasons: string[] = [];
  const strippedEvidence: string[] = [];
  let exifFields: Record<string, any> = {};
  let xmpFields: Record<string, any> = {};
  let iptcFields: Record<string, any> = {};
  let generatorName: string | null = null;
  let classification: ForensicReport["classification"] = "UNKNOWN";

  // ── 1. exifr full parse ──
  try {
    const parsed = await exifr.parse(file, {
      tiff: true, xmp: true, iptc: true, icc: false,
      mergeOutput: false, translateKeys: true, translateValues: true, reviveValues: true,
    }) as Record<string, any> | null;

    if (parsed) {
      const flat: Record<string, any> = { ...parsed };
      exifFields = parsed.exif || parsed.Exif || {};
      xmpFields  = parsed.xmp  || parsed.XMP  || {};
      iptcFields = parsed.iptc || parsed.IPTC || {};

      // Software field
      const sw = (flat.Software || exifFields.Software || "").toString();
      if (sw) {
        const swl = sw.toLowerCase();
        if (swl.includes("google") || swl.includes("gemini") || swl.includes("imagen")) {
          signals.push({ field: "EXIF:Software", value: sw, confidence: "HIGH", source: "EXIF", meaning: "Image was created or processed by Google AI software" });
          generatorName = "Google Gemini / Imagen";
        } else if (swl.includes("midjourney")) {
          signals.push({ field: "EXIF:Software", value: sw, confidence: "HIGH", source: "EXIF", meaning: "Image created by Midjourney" });
          generatorName = "Midjourney";
        } else if (swl.includes("dall") || swl.includes("openai")) {
          signals.push({ field: "EXIF:Software", value: sw, confidence: "HIGH", source: "EXIF", meaning: "Image created by OpenAI DALL-E" });
          generatorName = "OpenAI DALL-E";
        } else if (swl.includes("stable diffusion") || swl.includes("automatic1111") || swl.includes("comfyui")) {
          signals.push({ field: "EXIF:Software", value: sw, confidence: "HIGH", source: "EXIF", meaning: "Image created by Stable Diffusion" });
          generatorName = "Stable Diffusion";
        } else if (swl.includes("photoshop") || swl.includes("lightroom") || swl.includes("affinity") || swl.includes("gimp")) {
          signals.push({ field: "EXIF:Software", value: sw, confidence: "LOW", source: "EXIF", meaning: "Image was edited in photo software — original source may differ" });
          if (generatorName) strippedEvidence.push(`Editing software (${sw}) found after AI generation markers`);
        } else {
          signals.push({ field: "EXIF:Software", value: sw, confidence: "LOW", source: "EXIF", meaning: "Unknown software" });
        }
      }

      // Make / Model
      const make  = (flat.Make  || exifFields.Make  || "").toString();
      const model = (flat.Model || exifFields.Model || "").toString();
      if (make && make.toLowerCase() !== "google") {
        signals.push({ field: "EXIF:Make/Model", value: `${make} ${model}`.trim(), confidence: "HIGH", source: "EXIF", meaning: "Captured by a real physical camera — suggests human-taken photo" });
        classification = "HUMAN_ORIGIN";
      } else if (make.toLowerCase().includes("google")) {
        signals.push({ field: "EXIF:Make/Model", value: `${make} ${model}`.trim(), confidence: "MEDIUM", source: "EXIF", meaning: "Google Pixel device — may have AI generation" });
      }

      // XMP: CreatorTool
      const ct = (xmpFields.CreatorTool || flat.CreatorTool || "").toString();
      if (ct) {
        const ctl = ct.toLowerCase();
        if (ctl.includes("google") || ctl.includes("gemini") || ctl.includes("imagen")) {
          signals.push({ field: "XMP:CreatorTool", value: ct, confidence: "HIGH", source: "XMP", meaning: "XMP confirms Google AI as the creator tool" });
          generatorName = generatorName || "Google Gemini / Imagen";
        } else if (ctl.includes("midjourney")) {
          signals.push({ field: "XMP:CreatorTool", value: ct, confidence: "HIGH", source: "XMP", meaning: "XMP confirms Midjourney as the creator tool" });
          generatorName = generatorName || "Midjourney";
        } else if (ctl.includes("photoshop") || ctl.includes("lightroom") || ctl.includes("affinity")) {
          signals.push({ field: "XMP:CreatorTool", value: ct, confidence: "MEDIUM", source: "XMP", meaning: "Image last saved from photo-editing software" });
          if (generatorName) strippedEvidence.push(`XMP CreatorTool changed to ${ct} after likely AI generation`);
        }
      }

      // XMP: DigitalSourceType (IPTC AI standard)
      const dst = (xmpFields.DigitalSourceType || xmpFields.digitalSourceType || flat.DigitalSourceType || "").toString();
      if (dst) {
        if (dst.includes("trainedAlgorithmicMedia") || dst.includes("composite")) {
          signals.push({ field: "XMP:DigitalSourceType", value: dst, confidence: "HIGH", source: "XMP", meaning: "IPTC standard field explicitly declares this as AI-generated media" });
          generatorName = generatorName || "AI Model (IPTC Confirmed)";
          reasons.push("The IPTC DigitalSourceType tag explicitly declares this image as AI-generated (trainedAlgorithmicMedia).");
        }
      }

      // XMP: Creator
      const creator = xmpFields.creator || xmpFields.Creator || flat.creator || flat.Creator;
      if (creator) {
        const cs = Array.isArray(creator) ? creator.join(", ") : creator.toString();
        const cl = cs.toLowerCase();
        if (cl.includes("google") || cl.includes("gemini") || cl.includes("openai") || cl.includes("midjourney")) {
          signals.push({ field: "XMP:Creator", value: cs.slice(0, 100), confidence: "HIGH", source: "XMP", meaning: "XMP Creator field references an AI company" });
          generatorName = generatorName || cs;
        }
      }

      // IPTC Keywords
      const kw = iptcFields.Keywords || flat.Keywords;
      if (kw) {
        const ks = Array.isArray(kw) ? kw.join(" ") : kw.toString();
        if (/ai|generated|artificial|synthetic/i.test(ks)) {
          signals.push({ field: "IPTC:Keywords", value: ks.slice(0, 150), confidence: "MEDIUM", source: "IPTC", meaning: "Keywords indicate AI-generated content" });
        }
      }
    }
  } catch (err) {
    console.warn("exifr parse error:", err);
  }

  // ── 2. Binary XMP scan ──
  try {
    const buf = await file.arrayBuffer();
    const bytes = new Uint8Array(buf);
    // Decode as latin-1 for raw binary scanning
    let raw = "";
    for (let i = 0; i < Math.min(bytes.length, 200000); i++) {
      raw += String.fromCharCode(bytes[i]);
    }

    const xmpStart = raw.indexOf("<?xpacket begin");
    if (xmpStart !== -1) {
      const xmpEnd = raw.indexOf("</x:xmpmeta>", xmpStart);
      const xmp = xmpEnd !== -1 ? raw.slice(xmpStart, xmpEnd + 12) : raw.slice(xmpStart, xmpStart + 8000);
      const xl = xmp.toLowerCase();

      if (xl.includes("trainedalgorithmicmedia")) {
        signals.push({ field: "BINARY:XMP:DigitalSourceType", value: "trainedAlgorithmicMedia", confidence: "HIGH", source: "BINARY", meaning: "Raw XMP packet declares this as AI-generated media" });
        generatorName = generatorName || "AI Model (IPTC)";
      }
      if (xl.includes("gemini"))     { signals.push({ field: "BINARY:XMP:Gemini", value: "Gemini reference in XMP", confidence: "HIGH", source: "BINARY", meaning: "XMP references Google Gemini" }); generatorName = generatorName || "Google Gemini"; }
      if (xl.includes("imagen"))     { signals.push({ field: "BINARY:XMP:Imagen", value: "Imagen reference in XMP", confidence: "HIGH", source: "BINARY", meaning: "XMP references Google Imagen" }); generatorName = generatorName || "Google Imagen"; }
      if (xl.includes("midjourney")) { signals.push({ field: "BINARY:XMP:Midjourney", value: "Midjourney in XMP", confidence: "HIGH", source: "BINARY", meaning: "XMP references Midjourney" }); generatorName = generatorName || "Midjourney"; }
      if (xl.includes("dall-e") || xl.includes("openai")) { signals.push({ field: "BINARY:XMP:OpenAI", value: "OpenAI/DALL-E in XMP", confidence: "HIGH", source: "BINARY", meaning: "XMP references OpenAI or DALL-E" }); generatorName = generatorName || "OpenAI DALL-E"; }
      if (xl.includes("stable diffusion") || xl.includes("comfyui") || xl.includes("automatic1111")) { signals.push({ field: "BINARY:XMP:SD", value: "Stable Diffusion in XMP", confidence: "HIGH", source: "BINARY", meaning: "XMP references Stable Diffusion" }); generatorName = generatorName || "Stable Diffusion"; }

      const hasEditTool = xl.includes("photoshop") || xl.includes("lightroom") || xl.includes("affinity");
      const hasAi = xl.includes("gemini") || xl.includes("imagen") || xl.includes("midjourney") || xl.includes("openai") || xl.includes("trainedalgorithmic");
      if (hasEditTool && hasAi) strippedEvidence.push("Both a photo editor and an AI generator are referenced in XMP — image may have been edited to remove provenance markers");
    }

    // C2PA remnants in binary (stripped badge detection)
    if (raw.includes("c2pa") || raw.includes("jumbf") || raw.includes("cbor")) {
      signals.push({ field: "BINARY:C2PA_Remnant", value: "C2PA/JUMBF keyword found in binary", confidence: "HIGH", source: "BINARY", meaning: "Binary data contains C2PA remnants — the manifest may have been stripped by an editor" });
      strippedEvidence.push("C2PA keyword remnants found. The image may have originally had a C2PA manifest that was removed during editing.");
    }

    // Photoshop IRB blocks
    if (raw.includes("Photoshop 3.0") || raw.includes("8BPS")) {
      signals.push({ field: "BINARY:PhotoshopBlock", value: "Photoshop IRB block", confidence: "LOW", source: "BINARY", meaning: "Photoshop resource data found — image was processed through Photoshop" });
      if (generatorName) strippedEvidence.push("Photoshop IRB blocks found alongside AI generation signals — credentials may have been stripped");
    }
  } catch (err) {
    console.warn("Binary scan error:", err);
  }

  // ── 3. Classification ──
  const high = signals.filter(s => s.confidence === "HIGH").length;
  const med  = signals.filter(s => s.confidence === "MEDIUM").length;
  let confidence = 0;

  if (generatorName) {
    confidence = Math.min(95, 50 + high * 15 + med * 8);
    classification = strippedEvidence.length > 0 ? "AI_EDITED" : "AI_GENERATED";
  } else if (classification === "HUMAN_ORIGIN") {
    confidence = Math.min(80, 40 + med * 10);
  } else {
    confidence = Math.min(40, high * 10 + med * 5);
  }

  let summary = "";
  if ((classification === "AI_GENERATED" || classification === "AI_EDITED") && generatorName) {
    summary = `Forensic analysis found ${high} high-confidence signals pointing to ${generatorName}. `;
    if (strippedEvidence.length > 0) summary += "Signs of post-processing detected — the image may have been edited after generation to remove watermarks or C2PA credentials.";
    reasons.push(`${high} high-confidence metadata signals indicate ${generatorName}.`);
    if (strippedEvidence.length > 0) reasons.push("Post-processing tools were used after AI generation.");
  } else if (classification === "HUMAN_ORIGIN") {
    summary = "Metadata indicates this image was captured by a real physical camera. No AI generation signals were detected.";
    reasons.push("EXIF Make/Model fields point to a real camera.");
  } else {
    summary = "No conclusive AI-generation metadata was found. This could mean: (1) the image is genuinely human-taken, (2) metadata was stripped, or (3) the AI tool used doesn't embed detectable markers.";
    reasons.push("No EXIF Software, XMP DigitalSourceType, or binary AI markers were found.");
    reasons.push("Some AI tools deliberately strip all metadata before delivering images. Re-exporting through 'Save for Web' in Photoshop removes all tracing metadata.");
  }

  return { classification, confidence, generator: generatorName, signals, exifFields, xmpFields, iptcFields, summary, reasons, possiblyStripped: strippedEvidence.length > 0, strippedEvidence };
}

// ─────────────────────────────────────────────
// MAIN ENTRY POINT — Called from UploadZone
// ─────────────────────────────────────────────

export async function analyzeFile(file: File): Promise<ProvenanceReport> {
  // Run both in parallel
  const [c2paResult, forensic] = await Promise.allSettled([
    parseC2pa(file),
    runForensics(file),
  ]);

  const c2pa  = c2paResult.status  === "fulfilled" ? c2paResult.value  : null;
  const foren = forensic.status === "fulfilled" ? forensic.value : null;

  // ── PATH 1: Full C2PA found ──
  if (c2pa) {
    return { ...c2pa, forensic: foren };
  }

  // ── PATH 2: No C2PA but forensic signals found ──
  if (foren && (foren.generator || foren.signals.length > 0)) {
    const isAi = foren.classification === "AI_GENERATED" || foren.classification === "AI_EDITED";
    const gen  = foren.generator || "Unknown AI Tool";

    const assertions: TransformedAssertion[] = [];
    if (Object.keys(foren.exifFields).length > 0) assertions.push({ label: "exif.metadata", title: "EXIF Metadata", data: foren.exifFields });
    if (Object.keys(foren.xmpFields).length  > 0) assertions.push({ label: "xmp.metadata",  title: "XMP Metadata",  data: foren.xmpFields  });
    if (Object.keys(foren.iptcFields).length > 0) assertions.push({ label: "iptc.metadata", title: "IPTC Metadata", data: foren.iptcFields });
    assertions.push({ label: "forensic.signals", title: "Forensic Detection Signals", data: { signals: foren.signals, strippedEvidence: foren.strippedEvidence } });

    return {
      hasCredentials: isAi,
      trustLevel: "PARTIAL",
      trustReason: foren.possiblyStripped
        ? `No C2PA credentials found. Forensic analysis suggests this was AI-generated by ${gen} and then processed through a photo editor, possibly removing provenance credentials.`
        : isAi
        ? `No cryptographic C2PA signature, but metadata forensics found ${foren.signals.filter(s => s.confidence === "HIGH").length} high-confidence signals pointing to ${gen}.`
        : `No C2PA credentials found. ${foren.summary}`,
      activeManifest: isAi ? {
        label: "detected:forensic",
        title: file.name,
        format: file.type,
        claimGenerator: `${gen} (Forensic Detection)`,
        claimGeneratorDisplay: gen,
        isAiGenerated: true,
        aiGeneratorTool: gen,
        thumbnailBase64: undefined,
        signature: undefined,
        assertions,
        history: [
          { action: "c2pa.created", display: "AI Generation Detected", description: foren.summary, software: gen, timestamp: new Date().toISOString() },
          ...(foren.possiblyStripped ? [{ action: "c2pa.edited", display: "Post-processing Detected", description: "Photo editing software signatures found after AI generation.", software: "Photo Editor", timestamp: new Date().toISOString() }] : []),
        ],
      } : null,
      allManifests: {},
      validationStatus: foren.signals.map(s => ({ code: s.field, explanation: s.meaning })),
      validationState: foren.classification,
      forensic: foren,
    };
  }

  // ── PATH 3: Nothing found ──
  return {
    hasCredentials: false,
    trustLevel: "UNVERIFIED",
    trustReason: "No C2PA credentials or AI-generation metadata were detected. The image may have had its metadata fully stripped, or it was captured on a real camera.",
    activeManifest: null,
    allManifests: {},
    validationStatus: [],
    validationState: "None",
    forensic: foren,
  };
}
