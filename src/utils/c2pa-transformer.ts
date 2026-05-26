import { Buffer } from "buffer";

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
}

// Map C2PA action types to human-readable labels and descriptions
const ACTION_MAP: Record<string, { display: string; description: string }> = {
  "c2pa.created": {
    display: "Asset Created",
    description: "The media file was originally created or captured.",
  },
  "c2pa.converted": {
    display: "Format Converted",
    description: "The asset was converted to a different file format.",
  },
  "c2pa.resized": {
    display: "Resized",
    description: "The dimensions of the asset were modified.",
  },
  "c2pa.cropped": {
    display: "Cropped",
    description: "The asset's borders were cropped or re-framed.",
  },
  "c2pa.edited": {
    display: "Modified",
    description: "The asset was edited or modified.",
  },
  "c2pa.filtered": {
    display: "Filter Applied",
    description: "A color filter or visual effect was applied to the asset.",
  },
  "c2pa.placed": {
    display: "Composite Placed",
    description: "External elements or layers were composited into the asset.",
  },
  "c2pa.removed": {
    display: "Elements Removed",
    description: "Content or layers were removed from the asset.",
  },
  "c2pa.reimported": {
    display: "Reimported",
    description: "An ingredient asset was reimported during processing.",
  },
  "c2pa.color_adjustments": {
    display: "Color Adjustments",
    description: "Colors, brightness, contrast, or levels were adjusted.",
  },
  "c2pa.drawing": {
    display: "Drawing/Painting Added",
    description: "Vector art, drawings, or painted strokes were added.",
  },
  "c2pa.orientation": {
    display: "Orientation Changed",
    description: "The asset was rotated or flipped.",
  },
};

// Map assertion labels to friendly titles
const ASSERTION_LABEL_MAP: Record<string, string> = {
  "stds.schema-org.CreativeWork": "Creative Work Details",
  "c2pa.actions": "Editing Actions History",
  "c2pa.actions.v2": "Editing Actions History",
  "c2pa.hash.data": "Asset Content Hash",
  "c2pa.thumbnail.claim.jpeg": "Claim Thumbnail",
  "c2pa.thumbnail.claim.png": "Claim Thumbnail",
  "c2pa.metadata": "Additional Metadata",
  "c2pa.training-mining": "AI Training & Mining Restrictions",
};

/**
 * Maps a claim generator string to a friendly product display name
 */
export function getFriendlyGenerator(generator: string): { display: string; isAi: boolean; tool?: string } {
  const genLower = generator.toLowerCase();
  
  if (genLower.includes("adobe firefly") || genLower.includes("firefly")) {
    return { display: "Adobe Firefly", isAi: true, tool: "Adobe Firefly" };
  }
  if (genLower.includes("photoshop")) {
    return { display: "Adobe Photoshop", isAi: false };
  }
  if (genLower.includes("dall")) {
    return { display: "OpenAI DALL-E", isAi: true, tool: "DALL-E" };
  }
  if (genLower.includes("midjourney")) {
    return { display: "Midjourney", isAi: true, tool: "Midjourney" };
  }
  if (genLower.includes("stable diffusion") || genLower.includes("stablediffusion")) {
    return { display: "Stable Diffusion", isAi: true, tool: "Stable Diffusion" };
  }
  if (genLower.includes("gemini")) {
    return { display: "Google Gemini", isAi: true, tool: "Gemini" };
  }
  if (genLower.includes("runway")) {
    return { display: "Runway Gen", isAi: true, tool: "Runway" };
  }
  if (genLower.includes("make_test_images")) {
    return { display: "CAI Conformance Test Suite", isAi: false };
  }
  if (genLower.includes("c2patool")) {
    return { display: "C2PA CLI Tool", isAi: false };
  }

  // Parse standard generator format, e.g., name/version
  const match = generator.match(/^([^/]+)/);
  const baseName = match ? match[1].trim() : generator;
  
  return { 
    display: baseName.charAt(0).toUpperCase() + baseName.slice(1), 
    isAi: genLower.includes("ai-generator") || genLower.includes("synthetic") 
  };
}

/**
 * Transforms the raw C2PA Reader output into a clean client-ready JSON response
 */
export async function transformC2paResult(reader: any): Promise<ProvenanceReport> {
  if (!reader) {
    return {
      hasCredentials: false,
      trustLevel: "UNVERIFIED",
      trustReason: "No C2PA Content Credentials found in the asset.",
      activeManifest: null,
      allManifests: {},
      validationStatus: [],
      validationState: "None",
    };
  }

  const rawStore = reader.json();
  const activeManifest = reader.getActive();

  if (!activeManifest) {
    return {
      hasCredentials: false,
      trustLevel: "UNVERIFIED",
      trustReason: "No active manifest could be resolved.",
      activeManifest: null,
      allManifests: rawStore.manifests || {},
      validationStatus: rawStore.validation_status || [],
      validationState: rawStore.validation_state || "None",
    };
  }

  // 1. Determine general trust level
  const valState = rawStore.validation_state;
  const valStatus = rawStore.validation_status || [];
  
  let trustLevel: "VERIFIED" | "PARTIAL" | "UNVERIFIED" = "UNVERIFIED";
  let trustReason = "Content credentials verification failed.";

  if (valState === "Valid" || valState === "valid") {
    // Check if there are warnings like untrusted credentials
    const hasUntrusted = valStatus.some((s: any) => 
      s.code === "signingCredential.untrusted" || 
      (s.explanation && s.explanation.includes("untrusted"))
    );

    if (hasUntrusted) {
      trustLevel = "VERIFIED";
      trustReason = "Content credentials are cryptographically valid and untampered, though signed by an unrecognized or test certificate authority.";
    } else {
      trustLevel = "VERIFIED";
      trustReason = "Content credentials are valid, signed by a trusted authority, and content has not been tampered with.";
    }
  } else if (valState === "Invalid" || valState === "invalid") {
    trustLevel = "UNVERIFIED";
    trustReason = "This asset has invalid content credentials. The signature is broken or the file has been tampered with after signing.";
  }

  // 2. Extract Embedded Thumbnail as Base64 data URI
  let thumbnailBase64: string | undefined;
  if (activeManifest.thumbnail && activeManifest.thumbnail.identifier) {
    try {
      const res = await reader.resourceToAsset(activeManifest.thumbnail.identifier, { buffer: null });
      if (res && res.buffer) {
        const mime = activeManifest.thumbnail.format || "image/jpeg";
        thumbnailBase64 = `data:${mime};base64,${res.buffer.toString("base64")}`;
      }
    } catch (err) {
      console.warn("Failed to extract embedded C2PA thumbnail:", err);
    }
  }

  // 3. Build Friendly Claims
  const genDetails = getFriendlyGenerator(activeManifest.claim_generator || "");
  
  // Try to find if AI training restriction is defined
  let hasAiTrainingRestriction = false;
  
  // 4. Map assertions
  const assertions: TransformedAssertion[] = (activeManifest.assertions || []).map((a: any) => {
    if (a.label === "c2pa.training-mining") {
      hasAiTrainingRestriction = true;
    }
    return {
      label: a.label,
      title: ASSERTION_LABEL_MAP[a.label] || a.label.split(".").pop() || a.label,
      data: a.data,
    };
  });

  // 5. Map history / actions
  const history: TransformedAction[] = [];
  
  // C2PA actions can be in c2pa.actions or c2pa.actions.v2
  const actionsAssertion = assertions.find(a => a.label === "c2pa.actions" || a.label === "c2pa.actions.v2");
  if (actionsAssertion && actionsAssertion.data && Array.isArray(actionsAssertion.data.actions)) {
    actionsAssertion.data.actions.forEach((act: any) => {
      const actionKey = act.action;
      const mapped = ACTION_MAP[actionKey] || {
        display: actionKey.split(".").pop() || actionKey,
        description: `Modified using action ${actionKey}.`,
      };

      let software = act.software || activeManifest.claim_generator;
      if (software) {
        software = getFriendlyGenerator(software).display;
      }

      history.push({
        action: actionKey,
        display: mapped.display,
        description: mapped.description,
        software: software,
        timestamp: act.when || activeManifest.signature_info?.time,
      });
    });
  }

  // If no action list is present but it is a creation claim, add a default step
  if (history.length === 0) {
    history.push({
      action: "c2pa.created",
      display: "Asset Created",
      description: `Generated using ${genDetails.display}.`,
      software: genDetails.display,
      timestamp: activeManifest.signature_info?.time,
    });
  }

  const claimGeneratorDisplay = genDetails.isAi
    ? `Generated using ${genDetails.display} (Verified AI Origin)`
    : `Processed via ${genDetails.display}`;

  const activeTransformed: TransformedManifest = {
    label: activeManifest.label,
    title: activeManifest.title || "Untitled Asset",
    format: activeManifest.format || "image/jpeg",
    claimGenerator: activeManifest.claim_generator,
    claimGeneratorDisplay,
    isAiGenerated: genDetails.isAi,
    aiGeneratorTool: genDetails.tool,
    thumbnailBase64,
    assertions,
    history,
  };

  if (activeManifest.signature_info) {
    activeTransformed.signature = {
      alg: activeManifest.signature_info.alg,
      issuer: activeManifest.signature_info.issuer,
      commonName: activeManifest.signature_info.common_name,
      serialNumber: activeManifest.signature_info.cert_serial_number,
      time: activeManifest.signature_info.time,
    };
  }

  return {
    hasCredentials: true,
    trustLevel,
    trustReason,
    activeManifest: activeTransformed,
    allManifests: rawStore.manifests || {},
    validationStatus: valStatus,
    validationState: valState,
  };
}
