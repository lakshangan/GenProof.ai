# GenProof.ai

GenProof.ai is a Next.js provenance intelligence app for inspecting where an image came from. It verifies C2PA Content Credentials when they are present, extracts forensic metadata from EXIF/XMP/IPTC fields, scans binary image data for AI-generator markers, and presents the result in a polished dashboard.

The app is built for fast manual verification: upload an image, wait for the scan, then review the trust verdict, origin timeline, signature details, assertions, raw manifest data, and optional side-by-side comparison.

## What This Project Does

- Verifies C2PA Content Credentials embedded in images.
- Reads cryptographic manifest data with `@contentauth/c2pa-node`.
- Extracts EXIF, XMP, and IPTC metadata with `exifr`.
- Detects common AI-generation clues from Google Gemini / Imagen, Midjourney, DALL-E, Stable Diffusion, Runway, Adobe Firefly, and similar tools.
- Flags possible provenance stripping when metadata suggests an image was AI-generated and then processed through an editor.
- Shows a human-readable provenance timeline.
- Exports the full analysis result as JSON.
- Compares two image provenance reports side by side.
- Includes two sample images under `public/` for quick testing.

## Important Privacy Note

The current UI sends uploaded files to the local Next.js API route at `/api/verify` for analysis. In local development this means files are processed by your local dev server. In production this means files are processed by the serverless/runtime environment hosting the Next.js app.

The code also contains `src/utils/analyze.ts`, a browser-oriented C2PA + forensic analyzer that uses the `c2pa` WebAssembly package and the files in `public/c2pa.worker.js` and `public/c2pa.wasm`. However, the active upload and compare flows currently call `/api/verify`.

## Tech Stack

- **Next.js 16**: App Router, React framework, API route.
- **React 19**: Client UI components.
- **TypeScript**: Typed source code and report interfaces.
- **Tailwind CSS v4**: Global styling through `src/app/globals.css`.
- **Framer Motion**: Page, dashboard, scan, and transition animations.
- **Zustand**: Small client-side app state store.
- **@contentauth/c2pa-node**: Server-side C2PA manifest parsing.
- **c2pa**: Browser-side C2PA WebAssembly package assets.
- **exifr**: EXIF, XMP, IPTC metadata parsing.
- **lucide-react**: Icon source re-exported through `src/components/icons.ts`.
- **lenis**: Smooth scrolling wrapper.

## Requirements

- Node.js 20 or newer is recommended.
- npm, because this repository includes `package-lock.json`.

No environment variables are required for the current project.

## Getting Started

Install dependencies:

```bash
npm install
```

Start the local development server:

```bash
npm run dev
```

Open the app:

```text
http://localhost:3000
```

Build for production:

```bash
npm run build
```

Run the production build locally:

```bash
npm run start
```

Run linting:

```bash
npm run lint
```

## Available Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Starts the Next.js development server. |
| `npm run build` | Builds the production app. |
| `npm run start` | Starts the built production app. |
| `npm run lint` | Runs ESLint using the Next.js TypeScript config. |
| `npm run postinstall` | Copies C2PA browser worker and WASM assets from `node_modules` into `public/`. |

The `postinstall` script copies:

- `node_modules/c2pa/dist/c2pa.worker.min.js` to `public/c2pa.worker.js`
- `node_modules/c2pa/dist/assets/wasm/toolkit_bg.wasm` to `public/c2pa.wasm`

These files are needed by the browser-side analyzer in `src/utils/analyze.ts`.

## Project Structure

```text
.
├── public/
│   ├── c2pa.wasm
│   ├── c2pa.worker.js
│   ├── sample-verified.jpg
│   ├── sample-unverified.jpg
│   └── static image/svg assets
├── src/
│   ├── app/
│   │   ├── api/verify/route.ts
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── C2PACompare.tsx
│   │   ├── Dashboard.tsx
│   │   ├── ParticleNetwork.tsx
│   │   ├── ScanningSequence.tsx
│   │   ├── UploadZone.tsx
│   │   └── icons.ts
│   ├── store/
│   │   └── useStore.ts
│   └── utils/
│       ├── analyze.ts
│       └── c2pa-transformer.ts
├── eslint.config.mjs
├── next.config.ts
├── package.json
├── postcss.config.mjs
└── tsconfig.json
```

## Application Flow

### 1. Landing and Upload

The main app lives in `src/app/page.tsx`.

The default view is the landing verifier. Users can:

- Drag and drop an image.
- Click the upload zone to choose a file.
- Try `sample-verified.jpg`.
- Try `sample-unverified.jpg`.
- Switch between dark and light theme.
- Navigate to the compare view.

The upload component is `src/components/UploadZone.tsx`.

Supported extensions in the UI:

- JPEG / JPG
- PNG
- WebP
- HEIC / HEIF

### 2. Analysis Request

When a file is selected, the UI creates a `FormData` payload and posts it to:

```text
POST /api/verify
```

The file field name is:

```text
file
```

### 3. Server-side Verification

The API route is `src/app/api/verify/route.ts`.

It performs three major steps:

1. Reads the uploaded file into a `Buffer`.
2. Detects MIME type from magic bytes for JPEG, PNG, WebP, and HEIC-like files.
3. Runs C2PA parsing and forensic metadata analysis in parallel.

C2PA parsing uses:

```ts
Reader.fromAsset({ buffer: rawBuffer, mimeType })
```

Forensic scanning uses:

- `exifr.parse(...)` for structured EXIF, XMP, and IPTC metadata.
- Raw binary string scanning for XMP packets.
- Keyword checks for AI tools and C2PA/JUMBF/CBOR remnants.

### 4. C2PA Transformation

Raw C2PA reader output is converted into a UI-friendly report by:

```text
src/utils/c2pa-transformer.ts
```

This transformer:

- Converts raw action labels into readable timeline steps.
- Maps assertion labels to readable names.
- Extracts embedded thumbnails when available.
- Normalizes claim generator names.
- Determines whether the claim generator appears AI-related.
- Summarizes signature information.
- Produces a trust level.

### 5. Dashboard

The report is stored in Zustand and displayed by:

```text
src/components/Dashboard.tsx
```

The dashboard includes:

- Trust badge.
- Image or embedded C2PA thumbnail preview.
- Trust reason.
- Verified origin.
- Signing date.
- AI-generated indicator.
- Provenance timeline.
- Assertion accordions.
- Raw manifest JSON tab.
- Certificate/signature tab.
- JSON report export button.

### 6. Compare View

The compare flow is implemented in:

```text
src/components/C2PACompare.tsx
```

It lets the user upload two images and compare:

- Credential presence.
- Trust level.
- Claim generator.
- AI-generated status.
- Signature algorithm.
- Issuer certificate.
- Signing date.
- Number of timeline steps.
- Timeline details for both files.

## API Response Shape

The `/api/verify` route returns a provenance report shaped like this:

```ts
interface ProvenanceReport {
  hasCredentials: boolean;
  trustLevel: "VERIFIED" | "PARTIAL" | "UNVERIFIED";
  trustReason: string;
  activeManifest: TransformedManifest | null;
  allManifests: Record<string, unknown>;
  validationStatus: unknown[];
  validationState: string;
  forensic?: ForensicReport | null;
}
```

The active manifest contains normalized display data:

```ts
interface TransformedManifest {
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
```

The forensic report contains metadata-based classification:

```ts
interface ForensicReport {
  classification: "AI_GENERATED" | "AI_EDITED" | "HUMAN_ORIGIN" | "UNKNOWN";
  confidence: number;
  generator: string | null;
  signals: ForensicSignal[];
  exifFields: Record<string, unknown>;
  xmpFields: Record<string, unknown>;
  iptcFields: Record<string, unknown>;
  summary: string;
  reasons: string[];
  possiblyStripped: boolean;
  strippedEvidence: string[];
}
```

## Trust Levels

### `VERIFIED`

C2PA credentials were found and the validation state is valid. The transformer treats valid signatures as verified even when the signing certificate is internal, test, or not recognized by a public trust store.

### `PARTIAL`

The app found useful provenance signals, but not a fully trusted C2PA result. Common cases:

- C2PA data exists but validation state is unclear.
- No C2PA manifest exists, but forensic metadata strongly indicates AI generation.
- AI-generation clues are present in EXIF/XMP/IPTC or binary markers.

### `UNVERIFIED`

No usable C2PA credentials or AI-generation metadata were detected, or verification failed. This does not prove the image is authentic. It can also mean metadata was removed before upload.

## Forensic Signals

The forensic scanner checks for signals such as:

- `EXIF:Software`
- `EXIF:Make/Model`
- `XMP:CreatorTool`
- `XMP:DigitalSourceType`
- `XMP:Creator`
- `IPTC:Keywords`
- raw XMP packet references
- C2PA/JUMBF/CBOR binary remnants
- Photoshop resource blocks

Recognized AI and editing markers include:

- Google
- Gemini
- Imagen
- Midjourney
- DALL-E
- OpenAI
- Stable Diffusion
- Automatic1111
- ComfyUI
- Adobe Firefly
- Photoshop
- Lightroom
- Affinity
- GIMP

## Sample Assets

The `public/` directory contains:

- `sample-verified.jpg`: used by the "Verified C2PA Image" quick test button.
- `sample-unverified.jpg`: used by the "Unverified Image" quick test button.

These are loaded from the app, wrapped in a `File`, and sent through the same `/api/verify` flow as manual uploads.

## Configuration Notes

### `next.config.ts`

The Next.js config:

- Keeps `@contentauth/c2pa-node` in `serverExternalPackages`.
- Serves `/c2pa.wasm` with `Content-Type: application/wasm`.
- Adds long-term cache headers for the C2PA WASM and worker files.

### TypeScript

The project uses strict TypeScript with the path alias:

```ts
@/* -> ./src/*
```

### Styling

Global design tokens, layout styling, animation helpers, and theme classes live in:

```text
src/app/globals.css
```

The app defaults to dark mode. The Zustand store toggles a `light-theme` class on the document root.

## Deployment

The project can be deployed as a standard Next.js app.

For Vercel:

1. Push the repository to GitHub.
2. Import the repository in Vercel.
3. Use the default Next.js build settings.
4. Ensure `npm install` runs so the `postinstall` script can copy the C2PA WASM assets.

Typical production commands:

```bash
npm install
npm run build
npm run start
```

## Known Limitations

- Metadata-based AI detection is not proof. It is a confidence signal.
- Missing metadata does not prove an image is human-made.
- Some tools strip all metadata during export.
- Some AI platforms do not embed detectable metadata.
- A valid C2PA signature proves the signed asset has not changed since signing; it does not automatically prove the original scene was real.
- The active UI currently uses the server API route for analysis, despite the presence of browser-side C2PA utilities.
- The project does not currently include automated tests.

## Development Tips

- Start with `src/app/page.tsx` to understand the app shell and view switching.
- Read `src/components/UploadZone.tsx` for the single-image upload flow.
- Read `src/app/api/verify/route.ts` for the active analysis logic.
- Read `src/utils/c2pa-transformer.ts` for C2PA normalization.
- Read `src/components/Dashboard.tsx` for report rendering.
- Read `src/components/C2PACompare.tsx` for side-by-side comparison behavior.

## License

No license file is currently included in this repository. Add one before distributing or publishing the project publicly.
