import { NextRequest, NextResponse } from "next/server";
import { Reader } from "@contentauth/c2pa-node";
import { transformC2paResult } from "@/utils/c2pa-transformer";
import exifr from "exifr";

export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────
export interface ForensicSignal {
  field: string;
  value: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  source: "EXIF" | "XMP" | "IPTC" | "BINARY" | "C2PA";
  meaning: string;
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

// ─────────────────────────────────────────────────────────────
// MIME TYPE DETECTION FROM MAGIC BYTES
// ─────────────────────────────────────────────────────────────
function detectMimeType(buffer: Buffer, defaultMime: string): string {
  if (buffer.length < 12) return defaultMime;
  const v = new Uint8Array(buffer);

  // JPEG: FF D8
  if (v[0] === 0xff && v[1] === 0xd8) return "image/jpeg";
  // PNG: 89 50 4E 47
  if (v[0] === 0x89 && v[1] === 0x50 && v[2] === 0x4e && v[3] === 0x47) return "image/png";
  // WebP: RIFF....WEBP
  if (v[0] === 0x52 && v[1] === 0x49 && v[2] === 0x46 && v[3] === 0x46 &&
      v[8] === 0x57 && v[9] === 0x45 && v[10] === 0x42 && v[11] === 0x50) return "image/webp";
  // HEIC: ftyp box
  if (v[4] === 0x66 && v[5] === 0x74 && v[6] === 0x79 && v[7] === 0x70) {
    const brand = buffer.toString("ascii", 8, 12);
    if (["heic","heix","hevc","heim","heis","mif1","msf1"].includes(brand)) return "image/heic";
  }
  return defaultMime;
}

// ─────────────────────────────────────────────────────────────
// DEEP FORENSIC METADATA ANALYSER (exifr + binary scan)
// ─────────────────────────────────────────────────────────────
async function runForensicAnalysis(buffer: Buffer): Promise<ForensicReport> {
  const signals: ForensicSignal[] = [];
  const reasons: string[] = [];
  const strippedEvidence: string[] = [];
  let exifFields: Record<string, any> = {};
  let xmpFields: Record<string, any> = {};
  let iptcFields: Record<string, any> = {};
  let generatorName: string | null = null;
  let classification: ForensicReport["classification"] = "UNKNOWN";

  // ── 1. Parse with exifr ──
  try {
    const parsed = await exifr.parse(buffer, {
      tiff: true, xmp: true, iptc: true, icc: false,
      mergeOutput: false, translateKeys: true, translateValues: true, reviveValues: true,
    }) as Record<string, any> | null;

    if (parsed) {
      const flat = { ...parsed };
      exifFields = parsed.exif || parsed.Exif || {};
      xmpFields  = parsed.xmp  || parsed.XMP  || {};
      iptcFields = parsed.iptc || parsed.IPTC || {};

      // EXIF: Software
      const sw = (flat.Software || exifFields.Software || "").toString();
      if (sw) {
        const swl = sw.toLowerCase();
        if (swl.includes("google") || swl.includes("gemini") || swl.includes("imagen")) {
          signals.push({ field: "EXIF:Software", value: sw, confidence: "HIGH", source: "EXIF", meaning: "Image created or processed by Google AI software" });
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
        }
      }

      // EXIF: Make/Model — real camera = human origin
      const make  = (flat.Make  || exifFields.Make  || "").toString();
      const model = (flat.Model || exifFields.Model || "").toString();
      if (make && !make.toLowerCase().includes("google")) {
        signals.push({ field: "EXIF:Make/Model", value: `${make} ${model}`.trim(), confidence: "HIGH", source: "EXIF", meaning: "Captured by a real physical camera — suggests human origin" });
        classification = "HUMAN_ORIGIN";
      } else if (make.toLowerCase().includes("google")) {
        signals.push({ field: "EXIF:Make/Model", value: `${make} ${model}`.trim(), confidence: "MEDIUM", source: "EXIF", meaning: "Google Pixel device — may have AI camera processing" });
      }

      // XMP: CreatorTool
      const ct = (xmpFields.CreatorTool || flat.CreatorTool || "").toString();
      if (ct) {
        const ctl = ct.toLowerCase();
        if (ctl.includes("google") || ctl.includes("gemini") || ctl.includes("imagen")) {
          signals.push({ field: "XMP:CreatorTool", value: ct, confidence: "HIGH", source: "XMP", meaning: "XMP confirms Google AI as creator tool" });
          generatorName = generatorName || "Google Gemini / Imagen";
        } else if (ctl.includes("midjourney")) {
          signals.push({ field: "XMP:CreatorTool", value: ct, confidence: "HIGH", source: "XMP", meaning: "XMP confirms Midjourney as creator tool" });
          generatorName = generatorName || "Midjourney";
        } else if (ctl.includes("photoshop") || ctl.includes("lightroom") || ctl.includes("affinity")) {
          signals.push({ field: "XMP:CreatorTool", value: ct, confidence: "MEDIUM", source: "XMP", meaning: "Image last saved from photo-editing software" });
          if (generatorName) strippedEvidence.push(`XMP CreatorTool shows ${ct} after AI generation markers`);
        }
      }

      // XMP: DigitalSourceType (IPTC standard)
      const dst = (xmpFields.DigitalSourceType || xmpFields.digitalSourceType || flat.DigitalSourceType || "").toString();
      if (dst.includes("trainedAlgorithmicMedia") || dst.includes("composite")) {
        signals.push({ field: "XMP:DigitalSourceType", value: dst, confidence: "HIGH", source: "XMP", meaning: "IPTC tag explicitly declares this as AI-generated media" });
        generatorName = generatorName || "AI Model (IPTC Confirmed)";
        reasons.push("IPTC DigitalSourceType tag explicitly declares this as AI-generated (trainedAlgorithmicMedia).");
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
    }
  } catch (err) {
    console.warn("exifr parse error:", err);
  }

  // ── 2. Binary scan for XMP packets and C2PA remnants ──
  try {
    const binaryStr = buffer.toString("binary");
    const binaryLower = binaryStr.toLowerCase();

    // XMP packet scan
    const xmpStart = binaryStr.indexOf("<?xpacket begin");
    if (xmpStart !== -1) {
      const xmpEnd = binaryStr.indexOf("</x:xmpmeta>", xmpStart);
      const xmpPacket = xmpEnd !== -1 ? binaryStr.slice(xmpStart, xmpEnd + 12) : binaryStr.slice(xmpStart, xmpStart + 8000);
      const xl = xmpPacket.toLowerCase();

      if (xl.includes("trainedalgorithmicmedia")) {
        signals.push({ field: "BINARY:XMP:DigitalSourceType", value: "trainedAlgorithmicMedia", confidence: "HIGH", source: "BINARY", meaning: "Raw XMP packet declares this as AI-generated media" });
        generatorName = generatorName || "AI Model (IPTC)";
      }
      if (xl.includes("gemini"))     { signals.push({ field: "BINARY:XMP:Gemini",     value: "Gemini in XMP",     confidence: "HIGH", source: "BINARY", meaning: "XMP references Google Gemini"   }); generatorName = generatorName || "Google Gemini"; }
      if (xl.includes("imagen"))     { signals.push({ field: "BINARY:XMP:Imagen",     value: "Imagen in XMP",     confidence: "HIGH", source: "BINARY", meaning: "XMP references Google Imagen"   }); generatorName = generatorName || "Google Imagen"; }
      if (xl.includes("midjourney")) { signals.push({ field: "BINARY:XMP:Midjourney", value: "Midjourney in XMP", confidence: "HIGH", source: "BINARY", meaning: "XMP references Midjourney"       }); generatorName = generatorName || "Midjourney"; }
      if (xl.includes("dall-e") || xl.includes("openai")) { signals.push({ field: "BINARY:XMP:OpenAI", value: "OpenAI in XMP", confidence: "HIGH", source: "BINARY", meaning: "XMP references OpenAI/DALL-E" }); generatorName = generatorName || "OpenAI DALL-E"; }
      if (xl.includes("stable diffusion") || xl.includes("comfyui") || xl.includes("automatic1111")) { signals.push({ field: "BINARY:XMP:SD", value: "Stable Diffusion in XMP", confidence: "HIGH", source: "BINARY", meaning: "XMP references Stable Diffusion" }); generatorName = generatorName || "Stable Diffusion"; }

      // Badge stripping detection
      const hasEditTool = xl.includes("photoshop") || xl.includes("lightroom") || xl.includes("affinity");
      const hasAi = xl.includes("gemini") || xl.includes("imagen") || xl.includes("midjourney") || xl.includes("openai") || xl.includes("trainedalgorithmic");
      if (hasEditTool && hasAi) strippedEvidence.push("Both a photo editor and AI generator are referenced in XMP — image may have been edited after generation");
    }

    // C2PA remnant detection (stripped badge)
    if (binaryLower.includes("c2pa") || binaryLower.includes("jumbf") || binaryLower.includes("cbor")) {
      signals.push({ field: "BINARY:C2PA_Remnant", value: "C2PA/JUMBF keyword found in binary", confidence: "HIGH", source: "BINARY", meaning: "Binary contains C2PA remnants — the manifest may have been stripped by an editor" });
      strippedEvidence.push("C2PA keyword remnants found. The image may have originally had a C2PA manifest that was removed during editing.");
    }

    // Photoshop IRB blocks (common after badge stripping)
    if (binaryStr.includes("Photoshop 3.0") || binaryStr.includes("8BPS")) {
      signals.push({ field: "BINARY:PhotoshopBlock", value: "Photoshop IRB block", confidence: "LOW", source: "BINARY", meaning: "Photoshop resource data found — image was processed through Photoshop" });
      if (generatorName) strippedEvidence.push("Photoshop IRB blocks found alongside AI generation signals — C2PA credentials may have been stripped");
    }
  } catch (err) {
    console.warn("Binary scan error:", err);
  }

  // ── 3. Build classification ──
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
    summary = `Forensic analysis found ${high} high-confidence signal${high !== 1 ? "s" : ""} pointing to ${generatorName}.`;
    if (strippedEvidence.length > 0) summary += " Signs of post-processing detected — the image may have been edited after generation to remove watermarks or C2PA credentials.";
    reasons.push(`${high} high-confidence metadata signals indicate ${generatorName}.`);
    if (strippedEvidence.length > 0) reasons.push("Post-processing tools were used after AI generation.");
  } else if (classification === "HUMAN_ORIGIN") {
    summary = "Metadata indicates this image was captured by a real physical camera.";
    reasons.push("EXIF Make/Model fields point to a real camera.");
  } else {
    summary = "No conclusive AI-generation metadata was found. This could mean: (1) the image is genuinely human-taken, (2) metadata was fully stripped, or (3) the AI tool used does not embed detectable markers.";
    reasons.push("No EXIF Software, XMP DigitalSourceType, or binary AI markers were found.");
    reasons.push("Some AI tools (e.g. apps that use 'Save for Web') strip all metadata before delivering images, making forensic detection impossible.");
  }

  return { classification, confidence, generator: generatorName, signals, exifFields, xmpFields, iptcFields, summary, reasons, possiblyStripped: strippedEvidence.length > 0, strippedEvidence };
}

// ─────────────────────────────────────────────────────────────
// API HANDLER
// ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ hasCredentials: false, trustLevel: "UNVERIFIED", trustReason: "No media file was uploaded.", activeManifest: null, allManifests: {}, validationStatus: [], validationState: "None" }, { status: 400 });
    }

    const rawBuffer = Buffer.from(await file.arrayBuffer());
    const mimeType  = detectMimeType(rawBuffer, file.type || "image/jpeg");

    console.log(`[GenProof] ${file.name} | ${mimeType} | ${rawBuffer.length} bytes`);

    // Run C2PA parse and forensic analysis in parallel
    const [c2paResult, forensicResult] = await Promise.allSettled([
      Reader.fromAsset({ buffer: rawBuffer, mimeType }),
      runForensicAnalysis(rawBuffer),
    ]);

    const forensic = forensicResult.status === "fulfilled" ? forensicResult.value : null;

    // ── PATH 1: Full C2PA manifest ──
    if (c2paResult.status === "fulfilled" && c2paResult.value) {
      const report = await transformC2paResult(c2paResult.value);
      (report as any).forensic = forensic;
      return NextResponse.json(report);
    }

    // ── PATH 2: Forensic signals only ──
    if (forensic && (forensic.generator || forensic.signals.length > 0)) {
      const isAi = forensic.classification === "AI_GENERATED" || forensic.classification === "AI_EDITED";
      const gen  = forensic.generator || "Unknown AI Tool";

      const assertions: any[] = [];
      if (Object.keys(forensic.exifFields).length > 0) assertions.push({ label: "exif.metadata", title: "EXIF Metadata", data: forensic.exifFields });
      if (Object.keys(forensic.xmpFields).length  > 0) assertions.push({ label: "xmp.metadata",  title: "XMP Metadata",  data: forensic.xmpFields  });
      if (Object.keys(forensic.iptcFields).length > 0) assertions.push({ label: "iptc.metadata", title: "IPTC Metadata", data: forensic.iptcFields });
      assertions.push({ label: "forensic.signals", title: "Forensic Detection Signals", data: { signals: forensic.signals, strippedEvidence: forensic.strippedEvidence } });

      return NextResponse.json({
        hasCredentials: isAi,
        trustLevel: "PARTIAL",
        trustReason: forensic.possiblyStripped
          ? `No C2PA credentials found. Forensic analysis suggests this was AI-generated by ${gen} and then processed through a photo editor, possibly removing provenance credentials.`
          : isAi
          ? `No cryptographic C2PA signature, but metadata forensics found ${forensic.signals.filter((s: any) => s.confidence === "HIGH").length} high-confidence signals pointing to ${gen}.`
          : `No C2PA credentials found. ${forensic.summary}`,
        activeManifest: isAi ? {
          label: "detected:forensic", title: file.name, format: mimeType,
          claimGenerator: `${gen} (Forensic Detection)`,
          claimGeneratorDisplay: gen, isAiGenerated: true, aiGeneratorTool: gen,
          thumbnailBase64: null, signature: null, assertions,
          history: [
            { action: "c2pa.created", display: "AI Generation Detected", description: forensic.summary, software: gen, timestamp: new Date().toISOString() },
            ...(forensic.possiblyStripped ? [{ action: "c2pa.edited", display: "Post-processing Detected", description: "Photo editing software found alongside AI generation signals.", software: "Photo Editor", timestamp: new Date().toISOString() }] : []),
          ],
        } : null,
        allManifests: {},
        validationStatus: forensic.signals.map((s: any) => ({ code: s.field, explanation: s.meaning })),
        validationState: forensic.classification,
        forensic,
      });
    }

    // ── PATH 3: Nothing detected ──
    return NextResponse.json({
      hasCredentials: false,
      trustLevel: "UNVERIFIED",
      trustReason: "No C2PA credentials or AI-generation metadata were detected. The image may have had its metadata fully stripped, or it was captured on a real camera.",
      activeManifest: null, allManifests: {}, validationStatus: [], validationState: "None", forensic,
    });

  } catch (error: any) {
    console.error("[GenProof] Exception:", error);
    return NextResponse.json({
      hasCredentials: false, trustLevel: "UNVERIFIED",
      trustReason: `Analysis failed: ${error.message}`,
      activeManifest: null, allManifests: {},
      validationStatus: [{ code: "internal.exception", explanation: error.message }],
      validationState: "Error",
    }, { status: 500 });
  }
}
