# ToolBox Pro

Powerful online tools. Fast, private, and free. A static, backend-free website with 25 browser-based tools (HTML5, CSS3, vanilla JavaScript).

## Features
- 25 working tools in 5 categories, opened in an accessible modal (ESC, close button, browser Back, focus management)
- Global search (name, description, category), category filters, favorites and recently used tools (tool IDs only, in localStorage)
- Light and dark themes (saved in localStorage, respects system preference), `prefers-reduced-motion` support
- Real clipboard copy (with fallback) and real file downloads via Blob
- Three AdSense-ready ad slots, no analytics, no backend

## Tools
- **Calculators:** Age, Percentage, CGPA, BMI, Discount
- **Text:** Word Counter, Character Counter, Case Converter, Duplicate Line Remover, Text Sorter
- **Developer:** JSON Formatter, Base64, URL Encoder/Decoder, UUID v4 Generator, Hash Generator (SHA-256/384/512)
- **Image:** Compressor, Resizer, JPG/PNG Converter, Image to WebP, Image to Base64
- **Utilities:** QR Code Generator, Unit Converter, Timestamp Converter, Color Converter (HEX/RGB/HSL), Password Generator

## Run locally
Open `index.html` in a browser. For the Web Crypto features (Hash Generator) use a secure context, e.g. `python3 -m http.server` then visit `http://localhost:8000`.

## Deploy on GitHub Pages
1. Create a repository and upload `index.html`, `style.css`, `app.js`, `README.md` and the `assets/` folder to the root.
2. Go to Settings > Pages, choose the `main` branch and `/ (root)`, and save.
3. Replace the canonical/Open Graph URLs in `index.html` (`https://s-kadam-9696.github.io/YouTube-videos-downloader-/`).

## Google AdSense
1. In `index.html`, uncomment the AdSense `<script>` in `<head>` and replace `ca-pub-3776846934936900` (marked REPLACE WITH REAL ADSENSE PUBLISHER ID) with your publisher ID.
2. Paste your ad unit code at `<!-- ADSENSE SLOT 1 -->` (hero), `<!-- ADSENSE SLOT 2 -->` (content) and `<!-- ADSENSE SLOT 3 -->` (footer). Empty slots are hidden automatically.
3. Do not ask users to click ads.
4. Replace the Contact placeholder with your real email, and update the Privacy Policy to describe your ad provider.

## Privacy
Files are processed directly in your browser whenever possible. Files used by the image tools are not uploaded to any server. No personal data is collected. Only theme, favorite tool IDs and recent tool IDs are stored locally. The only network request is the QR generator loading `qrcode-generator` from cdnjs on first use; if it fails, a clear error is shown.

## Browser compatibility
Current Chrome, Edge, Firefox and Safari. Needs `<dialog>`, Canvas, Web Crypto and Clipboard APIs. WebP export is unavailable in some browsers (an error is shown). Images are limited to 25 MB (5 MB for Image to Base64).

## Structure
```
ToolBox-Pro/
├── index.html
├── style.css
├── app.js
├── README.md
└── assets/
    └── favicon.svg
```
