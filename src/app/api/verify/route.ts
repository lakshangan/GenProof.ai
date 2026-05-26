import { NextRequest, NextResponse } from "next/server";
import { Reader } from "@contentauth/c2pa-node";
import { transformC2paResult } from "@/utils/c2pa-transformer";
import exifr from "exifr";

export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────────────────────
// TYPE DEFINITIONS
// ─────────────────────────────────────────────────────────────
export interface ForensicSignal {
  field: string;
  value: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  source: "EXIF" | "XMP" | "IPTC" | "BINARY" | "C2PA";
  meaning: string;
}

export interface ForensicReport {
  // Primary classification
  classification: "AI_GENERATED" | "AI_EDITED" | "HUMAN_ORIGIN" | "UNKNOWN";
  confidence: number; // 0–100
  generator: string | null;
  generatorVersion: string | null;

  // Detailed signals found
  signals: ForensicSignal[];

  // Raw metadata for display
  exifFields: Record<string, any>;
  xmpFields: Record<string, any>;
  iptcFields: Record<string, any>;

  // Human-readable analysis
  summary: string;
  reasons: string[];

  // Was the C2PA badge potentially stripped?
  possiblyStripped: boolean;
  strippedEvidence: string[];
}

// ─────────────────────────────────────────────────────────────
// MIME TYPE DETECTION
// ─────────────────────────────────────────────────────────────
function detectMimeType(buffer: Buffer, defaultMime: string): string {
  if (buffer.length < 12) return defaultMime;
  const view = new Uint8Array(buffer);

  if (view[0] === 0xff && view[1] === 0xd8) return "image/jpeg";
  if (view[0] === 0x89 && view[1] === 0x50 && view[2] === 0x4e && view[3] === 0x47) return "image/png";
  if (view[0] === 0x52 && view[1] === 0x49 && view[2] === 0x46 && view[3] === 0x46 &&
    view[8] === 0x57 && view[9] === 0x45 && view[10] === 0x42 && view[11] === 0x50)
    return "image/webp";
  if (view[4] === 0x66 && view[5] === 0x74 && view[6] === 0x79 && view[7] === 0x70) {
    const brand = buffer.toString("ascii", 8, 12);
    if (["heic", "heix", "hevc", "heim", "heis", "mif1", "msf1"].includes(brand))
      return "image/heic";
  }

  return defaultMime;
}

// ─────────────────────────────────────────────────────────────
// CORE: DEEP FORENSIC METADATA ANALYSER
// Extracts real EXIF/XMP/IPTC data and performs deep binary scan
// ─────────────────────────────────────────────────────────────
async function runForensicAnalysis(buffer: Buffer, filename: string, mimeType: string): Promise<ForensicReport> {
  const signals: ForensicSignal[] = [];
  const reasons: string[] = [];
  const strippedEvidence: string[] = [];

  let exifFields: Record<string, any> = {};
  let xmpFields: Record<string, any> = {};
  let iptcFields: Record<string, any> = {};

  let generatorName: string | null = null;
  let generatorVersion: string | null = null;
  let classification: ForensicReport["classification"] = "UNKNOWN";

  // ── 1. Parse with exifr (full parse: EXIF + XMP + IPTC + ICC) ──
  try {
    const parsed = await exifr.parse(buffer, {
      tiff: true,
      xmp: true,
      iptc: true,
      icc: false,
      jfif: true,
      ihdr: true,
      mergeOutput: false,
      translateKeys: true,
      translateValues: true,
      reviveValues: true,
    }) as Record<string, any> | null;

    if (parsed) {
      exifFields = parsed.exif || parsed.Exif || {};
      xmpFields = parsed.xmp || parsed.XMP || {};
      iptcFields = parsed.iptc || parsed.IPTC || {};

      // Merge top-level keys (exifr sometimes returns flat)
      const flat = { ...parsed };

      // ── EXIF: Software field (most reliable single indicator) ──
      const software = flat.Software || flat.software || exifFields.Software || "";
      if (software) {
        const swLower = software.toLowerCase();
        if (swLower.includes("google") || swLower.includes("gemini") || swLower.includes("imagen")) {
          signals.push({ field: "EXIF:Software", value: software, confidence: "HIGH", source: "EXIF", meaning: "Image was processed or created by Google AI software" });
          generatorName = "Google Gemini / Imagen";
        } else if (swLower.includes("midjourney")) {
          signals.push({ field: "EXIF:Software", value: software, confidence: "HIGH", source: "EXIF", meaning: "Image created by Midjourney AI" });
          generatorName = "Midjourney";
        } else if (swLower.includes("dall") || swLower.includes("openai")) {
          signals.push({ field: "EXIF:Software", value: software, confidence: "HIGH", source: "EXIF", meaning: "Image created by OpenAI DALL-E" });
          generatorName = "OpenAI DALL-E";
        } else if (swLower.includes("stable diffusion") || swLower.includes("automatic1111") || swLower.includes("comfyui")) {
          signals.push({ field: "EXIF:Software", value: software, confidence: "HIGH", source: "EXIF", meaning: "Image created by Stable Diffusion" });
          generatorName = "Stable Diffusion";
        } else if (swLower.includes("photoshop") || swLower.includes("lightroom") || swLower.includes("gimp") || swLower.includes("affinity")) {
          signals.push({ field: "EXIF:Software", value: software, confidence: "MEDIUM", source: "EXIF", meaning: "Image was edited in photo-editing software — original source may differ" });
          // Photoshop on an AI image is strong "stripped" evidence
          if (generatorName) strippedEvidence.push(`Editing software (${software}) found after AI generation markers`);
        } else {
          signals.push({ field: "EXIF:Software", value: software, confidence: "LOW", source: "EXIF", meaning: "Unknown software used to create or process this image" });
        }
      }

      // ── EXIF: Make / Model (Camera or Device) ──
      const make = flat.Make || flat.make || exifFields.Make || "";
      const model = flat.Model || flat.model || exifFields.Model || "";
      if (make || model) {
        const combined = `${make} ${model}`.toLowerCase();
        if (combined.includes("google") || combined.includes("pixel")) {
          signals.push({ field: "EXIF:Make/Model", value: `${make} ${model}`.trim(), confidence: "MEDIUM", source: "EXIF", meaning: "Photo taken on a Google Pixel device — may have AI processing" });
        } else if (make && !combined.includes("ai") && !combined.includes("virtual")) {
          signals.push({ field: "EXIF:Make/Model", value: `${make} ${model}`.trim(), confidence: "HIGH", source: "EXIF", meaning: "Image captured by a real physical camera — suggests human origin" });
          classification = "HUMAN_ORIGIN";
        }
      }

      // ── EXIF: ImageDescription / UserComment / Comment ──
      const description = flat.ImageDescription || flat.Description || flat.UserComment || flat.Comment || exifFields.ImageDescription || "";
      if (description && typeof description === "string") {
        const dLower = description.toLowerCase();
        if (dLower.includes("generated") || dLower.includes("ai") || dLower.includes("diffusion") || dLower.includes("midjourney") || dLower.includes("gemini")) {
          signals.push({ field: "EXIF:ImageDescription", value: description.slice(0, 200), confidence: "HIGH", source: "EXIF", meaning: "Description field contains AI generation markers" });
        }
      }

      // ── XMP: CreatorTool ──
      const creatorTool = xmpFields.CreatorTool || flat.CreatorTool || "";
      if (creatorTool) {
        const ctLower = creatorTool.toLowerCase();
        if (ctLower.includes("google") || ctLower.includes("gemini") || ctLower.includes("imagen")) {
          signals.push({ field: "XMP:CreatorTool", value: creatorTool, confidence: "HIGH", source: "XMP", meaning: "XMP metadata confirms Google AI as the creator tool" });
          generatorName = generatorName || "Google Gemini / Imagen";
        } else if (ctLower.includes("midjourney")) {
          signals.push({ field: "XMP:CreatorTool", value: creatorTool, confidence: "HIGH", source: "XMP", meaning: "XMP metadata confirms Midjourney as the creator tool" });
          generatorName = generatorName || "Midjourney";
        } else if (ctLower.includes("photoshop") || ctLower.includes("lightroom")) {
          signals.push({ field: "XMP:CreatorTool", value: creatorTool, confidence: "MEDIUM", source: "XMP", meaning: "Image was last saved from Photoshop/Lightroom — original content may have been AI-generated" });
          if (generatorName) strippedEvidence.push(`XMP CreatorTool changed to ${creatorTool} after likely AI generation`);
        }
      }

      // ── XMP: DigitalSourceType (IPTC standard for AI generated) ──
      const dst = xmpFields.DigitalSourceType || xmpFields.digitalSourceType || flat.DigitalSourceType || flat.digitalSourceType || "";
      if (dst) {
        const dstStr = dst.toString();
        if (dstStr.includes("trainedAlgorithmicMedia") || dstStr.includes("compositeWithTrainedAlgorithmicMedia")) {
          signals.push({ field: "XMP:DigitalSourceType", value: dstStr, confidence: "HIGH", source: "XMP", meaning: "IPTC standard field confirms this is AI-generated (trainedAlgorithmicMedia)" });
          generatorName = generatorName || "AI Model (IPTC Confirmed)";
          reasons.push("IPTC DigitalSourceType tag explicitly declares this image as AI-generated trained algorithmic media.");
        }
      }

      // ── XMP: Rights / Copyright ──
      const rights = xmpFields.Rights || xmpFields.Copyright || flat.Copyright || flat.rights || "";
      if (rights && typeof rights === "string") {
        const rLower = rights.toLowerCase();
        if (rLower.includes("google") || rLower.includes("openai") || rLower.includes("stability")) {
          signals.push({ field: "XMP:Copyright", value: rights.slice(0, 150), confidence: "MEDIUM", source: "XMP", meaning: "Copyright field references an AI company" });
        }
      }

      // ── XMP: dc:creator / creator ──
      const creator = xmpFields.creator || xmpFields.Creator || flat.creator || flat.Creator || "";
      if (creator) {
        const cStr = Array.isArray(creator) ? creator.join(", ") : creator.toString();
        const cLower = cStr.toLowerCase();
        if (cLower.includes("google") || cLower.includes("gemini") || cLower.includes("openai") || cLower.includes("midjourney")) {
          signals.push({ field: "XMP:Creator", value: cStr.slice(0, 100), confidence: "HIGH", source: "XMP", meaning: "XMP Creator field references an AI organization" });
          generatorName = generatorName || cStr;
        }
      }

      // ── XMP: History (edit history from Photoshop etc.) ──
      const history = xmpFields.History || xmpFields.history || flat.History || [];
      if (Array.isArray(history) && history.length > 0) {
        const historyStr = JSON.stringify(history).toLowerCase();
        if (historyStr.includes("generate") || historyStr.includes("ai") || historyStr.includes("neural")) {
          signals.push({ field: "XMP:History", value: `${history.length} edit steps recorded`, confidence: "MEDIUM", source: "XMP", meaning: "Edit history contains AI or generation actions" });
        }
        if (history.length > 0) {
          const tools = history.map((h: any) => h.softwareAgent || h.tool || "").filter(Boolean).join(", ");
          if (tools) {
            signals.push({ field: "XMP:HistoryTools", value: tools.slice(0, 150), confidence: "LOW", source: "XMP", meaning: "These editing tools were used in the image history" });
          }
        }
      }

      // ── IPTC: Keywords ──
      const keywords = iptcFields.Keywords || iptcFields.keywords || flat.Keywords || [];
      const kwStr = Array.isArray(keywords) ? keywords.join(" ") : keywords.toString();
      if (kwStr) {
        const kwLower = kwStr.toLowerCase();
        if (kwLower.includes("ai") || kwLower.includes("generated") || kwLower.includes("artificial intelligence") || kwLower.includes("synthetic")) {
          signals.push({ field: "IPTC:Keywords", value: kwStr.slice(0, 200), confidence: "MEDIUM", source: "IPTC", meaning: "Keywords indicate AI-generated content" });
        }
      }
    }
  } catch (exifrErr) {
    console.warn("exifr parse error (non-fatal):", exifrErr);
  }

  // ── 2. Binary String Scan (UTF-8 pass) ──
  try {
    const binaryStr = buffer.toString("binary");
    const binaryLower = binaryStr.toLowerCase();

    // Look for XMP packet markers
    const xmpStart = binaryStr.indexOf("<?xpacket begin");
    if (xmpStart !== -1) {
      const xmpEnd = binaryStr.indexOf("</x:xmpmeta>", xmpStart);
      const xmpPacket = xmpEnd !== -1 ? binaryStr.slice(xmpStart, xmpEnd + 12) : binaryStr.slice(xmpStart, xmpStart + 4000);
      const xmpLower = xmpPacket.toLowerCase();

      if (xmpLower.includes("trainedAlgorithmicMedia") || xmpLower.includes("trainedalgorithmicmedia")) {
        signals.push({ field: "BINARY:XMP:DigitalSourceType", value: "trainedAlgorithmicMedia", confidence: "HIGH", source: "BINARY", meaning: "Raw XMP packet contains IPTC AI-generated source type" });
        generatorName = generatorName || "AI Model (IPTC Confirmed)";
      }
      if (xmpLower.includes("gemini")) {
        signals.push({ field: "BINARY:XMP:Gemini", value: "gemini reference in XMP", confidence: "HIGH", source: "BINARY", meaning: "XMP packet contains direct reference to Google Gemini" });
        generatorName = generatorName || "Google Gemini";
      }
      if (xmpLower.includes("imagen")) {
        signals.push({ field: "BINARY:XMP:Imagen", value: "imagen reference in XMP", confidence: "HIGH", source: "BINARY", meaning: "XMP packet contains direct reference to Google Imagen" });
        generatorName = generatorName || "Google Imagen";
      }
      if (xmpLower.includes("midjourney")) {
        signals.push({ field: "BINARY:XMP:Midjourney", value: "midjourney reference in XMP", confidence: "HIGH", source: "BINARY", meaning: "XMP packet references Midjourney" });
        generatorName = generatorName || "Midjourney";
      }
      if (xmpLower.includes("dall-e") || xmpLower.includes("openai")) {
        signals.push({ field: "BINARY:XMP:OpenAI", value: "openai/dall-e reference in XMP", confidence: "HIGH", source: "BINARY", meaning: "XMP packet references OpenAI or DALL-E" });
        generatorName = generatorName || "OpenAI DALL-E";
      }
      if (xmpLower.includes("stable diffusion") || xmpLower.includes("stablediffusion") || xmpLower.includes("automatic1111") || xmpLower.includes("comfyui")) {
        signals.push({ field: "BINARY:XMP:StableDiffusion", value: "stable diffusion in XMP", confidence: "HIGH", source: "BINARY", meaning: "XMP packet references Stable Diffusion" });
        generatorName = generatorName || "Stable Diffusion";
      }

      // Detect Photoshop editing AFTER AI generation (badge stripping)
      const hasPhotoEditTool = xmpLower.includes("photoshop") || xmpLower.includes("lightroom") || xmpLower.includes("affinity") || xmpLower.includes("pixelmator");
      const hasAiRef = xmpLower.includes("gemini") || xmpLower.includes("imagen") || xmpLower.includes("midjourney") || xmpLower.includes("openai") || xmpLower.includes("dall") || xmpLower.includes("trainedalgorithmicmedia");
      if (hasPhotoEditTool && hasAiRef) {
        strippedEvidence.push("Both a photo editor and an AI generator are referenced in XMP metadata, suggesting the image was AI-generated then edited");
      }
    }

    // Look for Photoshop IRB markers (badge stripping detection)
    const hasPhotoshopBlock = binaryStr.includes("Photoshop 3.0") || binaryStr.includes("8BPS") || binaryStr.includes("8BIM");
    if (hasPhotoshopBlock) {
      signals.push({ field: "BINARY:PhotoshopBlock", value: "Photoshop IRB resource block detected", confidence: "LOW", source: "BINARY", meaning: "Photoshop resource data found — image was processed through Photoshop" });
      if (generatorName) {
        strippedEvidence.push("Photoshop resource blocks found in a known AI-generated image — C2PA credentials may have been stripped");
      }
    }

    // Look for C2PA JUMBF ghost remnants (stripped C2PA evidence)
    if (binaryStr.includes("c2pa") || binaryStr.includes("jumbf") || binaryStr.includes("cbor")) {
      signals.push({ field: "BINARY:C2PA_Remnant", value: "C2PA/JUMBF keyword remnant found", confidence: "HIGH", source: "BINARY", meaning: "Binary data contains C2PA/JUMBF remnants — may indicate C2PA signature was stripped" });
      strippedEvidence.push("C2PA keyword remnants found in binary data. The image may have originally had a C2PA manifest that was removed during editing.");
    }

  } catch (binaryErr) {
    console.warn("Binary scan error (non-fatal):", binaryErr);
  }

  // ─────────────────────────────────────────────────────────────
  // 3. Build final classification
  // ─────────────────────────────────────────────────────────────
  const highSignals = signals.filter(s => s.confidence === "HIGH").length;
  const mediumSignals = signals.filter(s => s.confidence === "MEDIUM").length;

  let confidence = 0;

  if (generatorName) {
    confidence = Math.min(95, 50 + highSignals * 15 + mediumSignals * 8);
    classification = "AI_GENERATED";
    if (strippedEvidence.length > 0) {
      classification = "AI_EDITED";
    }
  } else if (classification !== "HUMAN_ORIGIN") {
    confidence = Math.min(40, highSignals * 10 + mediumSignals * 5);
    classification = signals.length > 0 ? "UNKNOWN" : "UNKNOWN";
  } else {
    confidence = Math.min(80, 40 + mediumSignals * 10);
  }

  // Build human readable summary
  let summary = "";
  if (classification === "AI_GENERATED" && generatorName) {
    summary = `This image shows strong forensic evidence of being AI-generated using ${generatorName}. ${highSignals} high-confidence signals were detected across EXIF, XMP, and binary metadata layers.`;
    reasons.push(`${highSignals} high-confidence metadata signals point to ${generatorName}.`);
    if (strippedEvidence.length > 0) {
      summary += ` Additionally, signs of post-processing or badge stripping were detected.`;
      reasons.push("Post-processing tools were used after AI generation — this is a common technique to remove watermarks or C2PA credentials.");
    }
  } else if (classification === "AI_EDITED") {
    summary = `This image appears to have been AI-generated (likely ${generatorName}) and then edited using photo editing software, possibly to remove watermarks or provenance credentials.`;
    reasons.push("Both AI generation metadata and photo editing software signatures co-exist in this file.");
  } else if (classification === "HUMAN_ORIGIN") {
    summary = `Metadata indicates this image was captured by a real camera. No AI generation signals were detected.`;
    reasons.push("EXIF Make/Model fields point to a real camera, which is typically absent in AI-generated images.");
  } else {
    summary = `No conclusive AI generation metadata was detected in this image. This could mean: (1) it was genuinely photographed, (2) metadata was stripped, or (3) the AI tool used doesn't embed detectable markers.`;
    reasons.push("No EXIF Software, XMP DigitalSourceType, or binary AI markers were found.");
    reasons.push("Note: Some AI tools (e.g. apps that strip metadata before saving) deliberately omit all tracing metadata.");
    reasons.push("Techniques like re-exporting through Photoshop 'Save for Web' or using metadata-stripping tools will remove all detectable signals.");
  }

  return {
    classification,
    confidence,
    generator: generatorName,
    generatorVersion,
    signals,
    exifFields,
    xmpFields,
    iptcFields,
    summary,
    reasons,
    possiblyStripped: strippedEvidence.length > 0,
    strippedEvidence,
  };
}

// ─────────────────────────────────────────────────────────────
// MAIN API HANDLER
// ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ hasCredentials: false, trustLevel: "UNVERIFIED", trustReason: "No media file was uploaded.", activeManifest: null, allManifests: {}, validationStatus: [], validationState: "None" }, { status: 400 });
    }

    const rawBuffer = Buffer.from(await file.arrayBuffer());
    const mimeType = detectMimeType(rawBuffer, file.type || "image/jpeg");

    console.log(`[GenProof] Analyzing: ${file.name} | MIME: ${mimeType} | Size: ${rawBuffer.length} bytes`);

    // ── Run forensic analysis in parallel with C2PA parse ──
    const [c2paResult, forensic] = await Promise.allSettled([
      Reader.fromAsset({ buffer: rawBuffer, mimeType }),
      runForensicAnalysis(rawBuffer, file.name, mimeType),
    ]);

    const forensicReport = forensic.status === "fulfilled" ? forensic.value : null;

    // ── PATH 1: Full C2PA manifest found ──
    if (c2paResult.status === "fulfilled" && c2paResult.value) {
      const report = await transformC2paResult(c2paResult.value);
      // Attach forensic data to the report
      (report as any).forensic = forensicReport;
      return NextResponse.json(report);
    }

    // ── PATH 2: No C2PA but forensic signals found ──
    if (forensicReport && (forensicReport.generator || forensicReport.signals.length > 0)) {
      const isAi = forensicReport.classification === "AI_GENERATED" || forensicReport.classification === "AI_EDITED";
      const trustLevel = isAi ? "PARTIAL" : "UNVERIFIED";
      const generator = forensicReport.generator || "Unknown Tool";

      const assertions: any[] = [];
      if (Object.keys(forensicReport.exifFields).length > 0) {
        assertions.push({ label: "exif.metadata", title: "EXIF Metadata", data: forensicReport.exifFields });
      }
      if (Object.keys(forensicReport.xmpFields).length > 0) {
        assertions.push({ label: "xmp.metadata", title: "XMP Metadata", data: forensicReport.xmpFields });
      }
      if (Object.keys(forensicReport.iptcFields).length > 0) {
        assertions.push({ label: "iptc.metadata", title: "IPTC Metadata", data: forensicReport.iptcFields });
      }
      assertions.push({
        label: "forensic.signals",
        title: "Forensic Detection Signals",
        data: { signals: forensicReport.signals, strippedEvidence: forensicReport.strippedEvidence }
      });

      const altReport = {
        hasCredentials: isAi,
        trustLevel,
        trustReason: forensicReport.possiblyStripped
          ? `No C2PA credentials found. Forensic analysis suggests this image was AI-generated by ${generator} and then processed through a photo editor, which may have removed provenance credentials.`
          : isAi
          ? `No cryptographic C2PA signature, but metadata forensics found ${forensicReport.signals.filter(s => s.confidence === "HIGH").length} high-confidence AI-generation signals pointing to ${generator}.`
          : `No C2PA credentials found. Forensic analysis returned ${forensicReport.signals.length} weak signals with no conclusive AI-generation evidence.`,
        activeManifest: isAi ? {
          label: "detected:forensic",
          title: file.name,
          format: mimeType,
          claimGenerator: `${generator} (Forensic Detection)`,
          claimGeneratorDisplay: generator,
          isAiGenerated: true,
          aiGeneratorTool: generator,
          thumbnailBase64: null,
          signature: null,
          assertions,
          history: [
            {
              action: "c2pa.created",
              display: "AI Generation Detected (Forensic)",
              description: forensicReport.summary,
              software: generator,
              timestamp: new Date().toISOString(),
            },
            ...(forensicReport.possiblyStripped ? [{
              action: "c2pa.edited",
              display: "Post-processing Detected",
              description: "Photo editing software signatures found after AI generation — may indicate badge/watermark removal.",
              software: "Photo Editor (Unknown)",
              timestamp: new Date().toISOString(),
            }] : [])
          ],
        } : null,
        allManifests: {},
        validationStatus: forensicReport.signals.map(s => ({ code: s.field, explanation: s.meaning })),
        validationState: forensicReport.classification,
        forensic: forensicReport,
      };

      return NextResponse.json(altReport);
    }

    // ── PATH 3: Absolutely nothing found ──
    return NextResponse.json({
      hasCredentials: false,
      trustLevel: "UNVERIFIED",
      trustReason: "No C2PA credentials or AI-generation metadata were detected. The image may have had its metadata fully stripped, or it was captured on a real camera.",
      activeManifest: null,
      allManifests: {},
      validationStatus: [],
      validationState: "None",
      forensic: forensicReport,
    });

  } catch (error: any) {
    console.error("[GenProof] API Exception:", error);
    return NextResponse.json({
      hasCredentials: false,
      trustLevel: "UNVERIFIED",
      trustReason: `Analysis failed: ${error.message}`,
      activeManifest: null,
      allManifests: {},
      validationStatus: [{ code: "internal.exception", explanation: error.message }],
      validationState: "Error",
    }, { status: 500 });
  }
}
