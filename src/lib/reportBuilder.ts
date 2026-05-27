/**
 * Builds a self-contained branded HTML provenance report string.
 * Opens in a new tab so the user can Save as PDF via the browser print dialog.
 */
export function buildPdfReportHtml(data: {
  title: string;
  trustLevel: string;
  trustTitle: string;
  trustReason: string;
  isAiGenerated: boolean;
  origin: string;
  signatureTime: string;
  format: string;
  dimensions: string | null;
  editingSoftware: string;
  aiTraining: string;
  thumbnailBase64?: string;
  confidence?: number;
  history: Array<{ display: string; software?: string; timestamp?: string }>;
  signals: Array<{ source: string; field: string; value: string; meaning: string }>;
  signature?: { issuer?: string; commonName?: string; alg?: string; serialNumber?: string };
  cameraInfo?: {
    make: string; model: string;
    aperture?: string | null; exposure?: string | null; iso?: string | number | null;
  } | null;
  reportDate: string;
}): string {
  const {
    title, trustLevel, trustTitle, trustReason, isAiGenerated, origin,
    signatureTime, format, dimensions, editingSoftware, aiTraining,
    thumbnailBase64, confidence, history, signals, signature, cameraInfo, reportDate,
  } = data;

  const trustColor =
    trustLevel === "VERIFIED" ? "#10b981" :
    trustLevel === "PARTIAL"  ? "#f59e0b" : "#ef4444";
  const trustBg =
    trustLevel === "VERIFIED" ? "#052e1a" :
    trustLevel === "PARTIAL"  ? "#2d1e00" : "#2d0a0a";

  const historyRows = history.map((h, i) =>
    `<tr>
      <td style="padding:10px 14px;border-bottom:1px solid #1a2a2a;font-family:monospace;font-size:11px;color:#6ee7e7;">${i + 1}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #1a2a2a;font-weight:600;font-size:12px;color:#eef2f5;">${h.display || "—"}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #1a2a2a;font-size:11px;color:#94a3b8;">${h.software || "—"}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #1a2a2a;font-size:11px;color:#94a3b8;">${h.timestamp ? new Date(h.timestamp).toLocaleString() : "—"}</td>
    </tr>`
  ).join("");

  const forensicRows = signals.map((s) =>
    `<tr>
      <td style="padding:9px 14px;border-bottom:1px solid #1a2a2a;font-family:monospace;font-size:10px;color:#0ea5a0;background:rgba(14,165,160,0.06);">${s.source}</td>
      <td style="padding:9px 14px;border-bottom:1px solid #1a2a2a;font-family:monospace;font-size:11px;color:#94a3b8;">${s.field}</td>
      <td style="padding:9px 14px;border-bottom:1px solid #1a2a2a;font-weight:600;font-size:11px;color:#eef2f5;">${s.value}</td>
      <td style="padding:9px 14px;border-bottom:1px solid #1a2a2a;font-size:11px;color:#94a3b8;">${s.meaning}</td>
    </tr>`
  ).join("");

  const thumbnailSection = thumbnailBase64
    ? `<img src="${thumbnailBase64}" style="max-width:100%;max-height:260px;object-fit:contain;border-radius:10px;border:1px solid #1a2a2a;display:block;" alt="Image Thumbnail" />`
    : `<div style="height:160px;background:#0a1214;border-radius:10px;border:1px solid #1a2a2a;display:flex;align-items:center;justify-content:center;color:#2a4a4a;font-size:12px;">No embedded thumbnail</div>`;

  const exposureStr = cameraInfo
    ? [cameraInfo.aperture, cameraInfo.exposure, cameraInfo.iso ? `ISO ${cameraInfo.iso}` : null].filter(Boolean).join(" · ") || "—"
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>GenProof.ai — Provenance Report · ${title}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
      background: linear-gradient(135deg, #000000 0%, #040d10 40%, #071114 100%);
      color: #e2e8f0;
      min-height: 100vh;
      padding: 40px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    @media print {
      body { padding: 20px; }
      .no-print { display: none !important; }
      @page { margin: 12mm; size: A4; }
    }
    .page { max-width: 860px; margin: 0 auto; }
    .report-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 24px 28px; border-radius: 16px;
      background: rgba(4,14,17,0.95);
      border: 1px solid rgba(14,165,160,0.18);
      margin-bottom: 24px; gap: 16px;
    }
    .logo-group { display: flex; align-items: center; gap: 12px; }
    .logo-svg { width: 34px; height: 34px; color: #0ea5a0; flex-shrink: 0; }
    .logo-text { font-size: 17px; font-weight: 800; color: #eef2f5; letter-spacing: -0.02em; }
    .logo-text span { color: #0ea5a0; }
    .report-meta { text-align: right; font-size: 11px; color: #4a7070; line-height: 1.9; }
    .report-meta strong { color: #6ee7e7; display: block; font-size: 13px; }
    .trust-banner {
      border-radius: 14px; border: 1px solid ${trustColor}33;
      background: ${trustBg}; padding: 22px 24px; margin-bottom: 22px;
      display: flex; align-items: flex-start; justify-content: space-between; gap: 20px;
    }
    .trust-badge {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 4px 12px; border-radius: 999px;
      border: 1px solid ${trustColor}44; background: ${trustColor}18;
      font-size: 10px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.08em; color: ${trustColor}; margin-bottom: 10px;
    }
    .trust-title { font-size: 20px; font-weight: 800; color: #eef2f5; letter-spacing: -0.02em; margin-bottom: 6px; }
    .trust-reason { font-size: 12px; color: #94a3b8; line-height: 1.7; max-width: 500px; }
    .trust-score { text-align: right; flex-shrink: 0; }
    .trust-score .score-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #4a7070; }
    .trust-score .score-value { font-size: 38px; font-weight: 800; color: ${trustColor}; line-height: 1; }
    .trust-score .score-unit { font-size: 11px; color: #4a7070; }
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-bottom: 22px; }
    .card { background: rgba(4,14,17,0.75); border: 1px solid #1a2a2a; border-radius: 14px; padding: 18px; overflow: hidden; }
    .card-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #0ea5a0; margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid #1a2a2a; }
    .kv { display: flex; flex-direction: column; gap: 10px; }
    .kv-item { display: flex; flex-direction: column; gap: 2px; }
    .kv-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #4a7070; }
    .kv-value { font-size: 12px; font-weight: 600; color: #eef2f5; }
    .section { margin-bottom: 22px; }
    .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #0ea5a0; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
    .section-title::after { content: ""; flex: 1; height: 1px; background: #1a2a2a; }
    table { width: 100%; border-collapse: collapse; background: rgba(4,14,17,0.75); border-radius: 12px; overflow: hidden; border: 1px solid #1a2a2a; }
    thead tr { background: rgba(14,165,160,0.06); }
    th { padding: 10px 14px; text-align: left; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #4a7070; }
    td { font-size: 12px; color: #94a3b8; vertical-align: top; }
    tr:last-child td { border-bottom: none !important; }
    .sig-box { background: rgba(4,14,17,0.75); border: 1px solid #1a2a2a; border-radius: 12px; overflow: hidden; }
    .sig-row { display: flex; justify-content: space-between; padding: 10px 16px; border-bottom: 1px solid #1a2a2a; font-size: 12px; }
    .sig-row:last-child { border-bottom: none; }
    .sig-key { color: #4a7070; }
    .sig-val { color: #eef2f5; font-weight: 600; text-align: right; max-width: 60%; word-break: break-all; }
    .report-footer { margin-top: 40px; padding: 18px 0; border-top: 1px solid #1a2a2a; display: flex; justify-content: space-between; align-items: center; font-size: 10px; color: #2a4a4a; flex-wrap: wrap; gap: 8px; }
    .watermark { font-weight: 800; color: #0ea5a0; letter-spacing: -0.01em; }
    .print-btn { display: block; margin: 0 auto 28px; padding: 12px 32px; background: #0ea5a0; color: #000; border: none; border-radius: 999px; font-size: 13px; font-weight: 700; cursor: pointer; font-family: inherit; letter-spacing: -0.01em; }
    .print-btn:hover { background: #0d9488; }
  </style>
</head>
<body>
  <div class="page">
    <button class="print-btn no-print" onclick="window.print()">⬇ Save as PDF</button>
    <div class="report-header">
      <div class="logo-group">
        <svg class="logo-svg" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <line x1="60" y1="60" x2="88" y2="88" stroke="currentColor" stroke-width="10" stroke-linecap="round"/>
          <circle cx="42" cy="42" r="28" stroke="currentColor" stroke-width="8" stroke-linecap="round" stroke-dasharray="22 9" stroke-dashoffset="4" fill="none"/>
          <circle cx="42" cy="42" r="20" stroke="currentColor" stroke-width="2" stroke-opacity="0.3" fill="none"/>
          <g transform="translate(33,33)"><path d="M0 -9 L2.5 -2.5 L9 0 L2.5 2.5 L0 9 L-2.5 2.5 L-9 0 L-2.5 -2.5 Z" fill="currentColor"/></g>
          <g transform="translate(49,41)"><path d="M0 -6.5 L1.8 -1.8 L6.5 0 L1.8 1.8 L0 6.5 L-1.8 1.8 L-6.5 0 L-1.8 -1.8 Z" fill="currentColor"/></g>
          <g transform="translate(37,53)"><path d="M0 -4.5 L1.2 -1.2 L4.5 0 L1.2 1.2 L0 4.5 L-1.2 1.2 L-4.5 0 L-1.2 -1.2 Z" fill="currentColor"/></g>
        </svg>
        <span class="logo-text">GenProof<span>.ai</span></span>
      </div>
      <div class="report-meta">
        <div>Provenance Intelligence Report</div>
        <strong>${title}</strong>
        <div>Generated ${reportDate}</div>
      </div>
    </div>

    <div class="trust-banner">
      <div>
        <div class="trust-badge">${trustTitle}</div>
        <div class="trust-title">${isAiGenerated ? "AI Generated Media" : "Authentic Physical Origin"}</div>
        <div class="trust-reason">${trustReason}</div>
      </div>
      ${confidence !== undefined ? `<div class="trust-score"><div class="score-label">Confidence</div><div class="score-value">${confidence}</div><div class="score-unit">%</div></div>` : ""}
    </div>

    <div class="two-col">
      <div class="card">
        <div class="card-title">Image Thumbnail</div>
        ${thumbnailSection}
      </div>
      <div class="card">
        <div class="card-title">Provenance Summary</div>
        <div class="kv">
          <div class="kv-item"><span class="kv-label">Creator / Source Tool</span><span class="kv-value">${origin}</span></div>
          <div class="kv-item"><span class="kv-label">Signature Date</span><span class="kv-value">${signatureTime}</span></div>
          <div class="kv-item"><span class="kv-label">Format &amp; Resolution</span><span class="kv-value">${format}${dimensions ? " · " + dimensions : ""}</span></div>
          <div class="kv-item"><span class="kv-label">Editing Software</span><span class="kv-value">${editingSoftware}</span></div>
          <div class="kv-item"><span class="kv-label">AI Training Rights</span><span class="kv-value">${aiTraining}</span></div>
          ${cameraInfo ? `
          <div class="kv-item"><span class="kv-label">Camera Device</span><span class="kv-value">${cameraInfo.make} ${cameraInfo.model}</span></div>
          <div class="kv-item"><span class="kv-label">Exposure Settings</span><span class="kv-value">${exposureStr}</span></div>` : ""}
        </div>
      </div>
    </div>

    ${history.length > 0 ? `
    <div class="section">
      <div class="section-title">Provenance History Log</div>
      <table>
        <thead><tr><th>#</th><th>Event</th><th>Software</th><th>Timestamp</th></tr></thead>
        <tbody>${historyRows}</tbody>
      </table>
    </div>` : ""}

    ${signals.length > 0 ? `
    <div class="section">
      <div class="section-title">Forensic Metadata Signals</div>
      <table>
        <thead><tr><th>Source</th><th>Tag</th><th>Value</th><th>Meaning</th></tr></thead>
        <tbody>${forensicRows}</tbody>
      </table>
    </div>` : ""}

    ${signature ? `
    <div class="section">
      <div class="section-title">Digital Certificate</div>
      <div class="sig-box">
        <div class="sig-row"><span class="sig-key">Issuer CA</span><span class="sig-val">${signature.issuer || "Unknown"}</span></div>
        <div class="sig-row"><span class="sig-key">Common Name</span><span class="sig-val">${signature.commonName || "Unknown"}</span></div>
        <div class="sig-row"><span class="sig-key">Algorithm</span><span class="sig-val">${signature.alg || "Unknown"}</span></div>
        <div class="sig-row"><span class="sig-key">Serial Number</span><span class="sig-val" style="font-family:monospace;font-size:11px;">${signature.serialNumber || "None"}</span></div>
      </div>
    </div>` : ""}

    <div class="report-footer">
      <span class="watermark">GenProof.ai</span>
      <span>Provenance Intelligence · C2PA Standard · ${reportDate}</span>
      <span>Files processed in-memory. No data stored.</span>
    </div>
  </div>
</body>
</html>`;
}
