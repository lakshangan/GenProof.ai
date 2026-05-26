# GenProof.ai

## Provenance Intelligence Platform

Verify and decode cryptographic provenance from any image — using C2PA Content Credentials, EXIF, XMP, and IPTC forensic metadata analysis. **Runs 100% in the browser using WebAssembly. No server required.**

## Tech Stack

- **Next.js 16** — React framework
- **c2pa (WebAssembly)** — Browser-native C2PA parsing (no backend)
- **exifr** — Deep EXIF/XMP/IPTC metadata extraction
- **Framer Motion** — Cinematic UI animations
- **Zustand** — State management
- **Tailwind CSS v4** — Styling

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/lakshangan/GenProof.ai)

Or push to GitHub and connect to Vercel — zero configuration needed.

## Architecture

All analysis runs **client-side in the browser**:

1. **C2PA WASM** — `/public/c2pa.wasm` + `/public/c2pa.worker.js` — Cryptographic C2PA manifest parsing
2. **EXIF/XMP/IPTC** — `exifr` library reads all metadata layers directly from the file
3. **Binary scanner** — Scans raw bytes for AI generator signatures and C2PA remnants (badge-stripping detection)

No image data ever leaves the user's browser.

## What It Detects

- **C2PA Content Credentials** — Adobe Firefly, Leica cameras, CAI-certified tools
- **Google Gemini / Imagen** — XMP DigitalSourceType, EXIF Software, binary markers
- **Midjourney, DALL-E, Stable Diffusion** — EXIF/XMP signatures
- **Badge stripping** — Detects when C2PA credentials were removed via Photoshop/editors
- **Human-taken photos** — Camera Make/Model verification
