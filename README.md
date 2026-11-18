# PDF Merger & Page Numberer (Web Application)

A modern, fast, and 100% private client-side web application to merge multiple PDF documents and stamp customizable page numbers.

---

## 🌟 Highlights

- **🔒 100% Private & Secure**: All PDF processing happens directly inside your web browser. No files are ever uploaded to any third-party server or cloud.
- **📑 Multiple PDF Merging**: Upload as many PDF files as you need, in any order.
- **🔄 Drag & Drop Reordering**: Rearrange files using drag handles or Move Up / Move Down buttons.
- **🔢 Flexible Page Numbering**:
  - **Positions**: Bottom-Center (Standard), Bottom-Right, Bottom-Left, Top-Center, Top-Right, Top-Left.
  - **Formats**: `Page {n} of {total}`, `{n} of {total}`, `{n} / {total}`, `{n}`, `Page {n}`, `- {n} -`, or any custom template.
  - **Start Counting At**: Any starting number (e.g., start at 1, 5, etc.).
  - **Skip Cover Pages**: Skip page numbering on the first $N$ pages (e.g., title/cover page).
  - **Include/Exclude from Total**: Choose whether skipped pages count toward the total page count.
  - **Typography & Styling**: Choose fonts (*Helvetica*, *Times-Roman*, *Courier*), font size ($8\text{pt} - 24\text{pt}$), font color (picker + presets), and edge margins.
  - **Auto-Rotation Aware**: Accurately computes coordinates for landscape, portrait, and rotated PDF pages ($0^\circ, 90^\circ, 180^\circ, 270^\circ$).
- **👁️ Live Visual Preview**: Miniature page simulator updates in real-time as you customize settings.
- **🖼️ PDF Page Thumbnails**: Live visual thumbnail previews of uploaded documents.
- **🌓 Dark & Light Modes**: Seamless theme switching with saved preference.
- **📦 Sample Files Included**: 3 pre-generated sample PDFs included in `sample-pdfs/`, plus a "Load Sample PDFs" one-click button in the UI.

---

## 🚀 Quick Start

You can run this application in either of two ways:

### Option 1: Open Directly in Browser (No Server Needed)
Simply double-click or open `index.html` in any modern web browser (Google Chrome, Microsoft Edge, Mozilla Firefox, Brave, Safari):
```
file:///C:/Users/yash/.gemini/antigravity/scratch/pdf-merger-web/index.html
```

### Option 2: Run with Node.js
If you prefer running a local HTTP server:
```bash
cd "C:\Users\yash\.gemini\antigravity\scratch\pdf-merger-web"
node server.js
```
Then navigate to:
```
http://localhost:3000
```

---

## 📁 Project Structure

```
pdf-merger-web/
├── index.html           # Main application web interface
├── styles.css           # Modern responsive design & themes
├── app.js               # Client-side PDF engine (PDF-Lib & PDF.js)
├── server.js            # Zero-dependency local Node.js web server
├── package.json         # Project metadata and start script
├── generate-samples.js  # Generator for sample PDF test files
├── sample-pdfs/         # Ready-to-use sample PDF documents
│   ├── DocA-Introduction.pdf
│   ├── DocB-Technical-Report.pdf
│   └── DocC-Appendix.pdf
└── README.md            # Documentation
```

---

## 🛠️ How It Works

1. **Client-Side Loading**: When PDF files are selected or dropped, `PDFLib.PDFDocument.load()` reads the binary buffers in memory without uploading.
2. **Page Assembly**: A fresh master document is instantiated (`PDFLib.PDFDocument.create()`), and pages from each source document are sequentially copied.
3. **Stamping Page Numbers**:
   - The selected standard font (`Helvetica`, `TimesRoman`, or `Courier`) is embedded.
   - For each page, rotation and dimensions are retrieved (`page.getSize()`, `page.getRotation()`).
   - Page coordinates ($X, Y$) are calculated dynamically based on chosen position, margins, and text bounds.
   - `page.drawText()` stamps the calculated string onto the document.
4. **Binary Export & Download**: The final document is serialized to a `Uint8Array`, converted to an in-memory `Blob`, and downloaded directly.

---

## 💰 Google AdSense Monetization Setup

The website has been pre-configured with **3 maximum-profit ad placements**:
1. **Top Leaderboard Banner** (High viewability above the fold)
2. **Settings Sidebar Unit** (300x250 rectangle unit)
3. **High-CTR Download Modal Unit** (Viewed right when the merged PDF is ready)

### How to Activate Your Ads:
1. Sign in to your [Google AdSense Dashboard](https://adsense.google.com).
2. Copy your Publisher ID (format: `ca-pub-XXXXXXXXXXXXXXXX`).
3. In [index.html](file:///C:/Users/yash/.gemini/antigravity/scratch/pdf-merger-web/index.html), search for `ca-pub-XXXXXXXXXXXXXXXX` and replace it with your real ID in:
   - The `<script>` tag in the `<head>`
   - The 3 `<ins class="adsbygoogle">` tags
4. Once your site domain is approved, Google will automatically start serving real ads in these slots!

