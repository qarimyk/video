# VORTEX · Universal Media Engine & Offline Library

> A high-performance, offline-first media management and download ecosystem crafted in a refined Nothing OS / CMF industrial minimalist monochrome design.

---

## ⚡ Overview

**VORTEX** is an ultra-fast, offline-capable progressive media engine built with modern React, TypeScript, Tailwind CSS, and IndexedDB storage. It provides seamless media acquisition, multi-threaded background queues, intelligent hardware transcoding, zero-knowledge encrypted vaulting, and an offline-first library designed around maximum capability with minimal visual complexity.

---

## ✨ Key Features

### 1. 📥 High-Speed Media Downloader & YouTube Engine
- **Universal Link Parsing**: Paste any web stream or video URL to fetch all available video and audio streams.
- **YouTube Browser / Downloader**: In-app YouTube explorer with automatic stream detection, stream preview, and 1-tap quality presets.
- **Adaptive Quality Control**: Supports 4K Ultra HD (2160p), 1440p QHD, 1080p Full HD, 720p HD, and 480p/360p mobile formats.
- **Audio Extraction**: Direct extraction to 320kbps MP3, AAC, and WAV containers.

### 2. 🗄️ Universal Media Library
- **Categorized Views**: Filter instantly between All, Videos, Audio, Music, Favorites, and Custom Folders.
- **Folder Management**: Organize media into custom folders with live storage allocation counters.
- **Batch Processing**: Multi-select support for bulk exports, folder transfers, playlist additions, and secure deletions.
- **Smart Sorting**: Sort dynamically by date added, title, file size, duration, or play count.
- **Direct Local File Import**: Import any local video/audio files directly into the sandboxed IndexedDB storage.

### 3. 🎬 Hardware Transcoder & Video Studio
- **Format Converter**: Lossless or customized transcoding between MP4, MKV, WebM, MOV, AVI, MP3, and WAV.
- **Precision Trimmer**: Frame-accurate start/end clipping with live scrubbing.
- **Intelligent Compressor**: Reduce file sizes with low, balanced, or aggressive CRF compression curves.
- **Aspect Ratio & Rotation**: Seamless transforms for 16:9 widescreen, 9:16 vertical shorts, 1:1 square, and 4:3 cinema.
- **Frame Extraction**: Export high-resolution PNG image sequences from video timestamps.

### 4. 🔒 Zero-Knowledge Privacy Vault
- **Military-Grade Encryption**: AES-GCM 256-bit encryption with PBKDF2 key derivation (100,000 iterations).
- **Stealth Access**: Hidden 3-tap gesture trigger on the Dot Matrix logo.
- **Dual Profile Security**: Master PIN unlocks private media; Decoy PIN displays an isolated safe space.
- **Auto-Lock & Panic Trigger**: Automatically locks on window blur or after custom inactivity timeouts.

### 5. 🎧 Media Player & Sleep Timer
- **Gesture-Friendly Player**: Double-tap for 10s seek, swipe brightness/volume, and responsive aspect ratio toggles.
- **Custom Sleep Timer**: Set timers for 15m, 30m, 45m, 60m, or end-of-media with optional volume fade-out.
- **Queue & Repeat Controls**: Shuffle, repeat one, repeat all, and mini-player background docking.

---

## 🛠️ Tech Stack & Architecture

- **Frontend**: React 18, TypeScript, Tailwind CSS, Lucide Icons, Framer Motion
- **Backend & Proxy**: Node.js, Express, `@distube/ytdl-core`
- **Storage Layer**: IndexedDB via `idb` for durable client-side offline blob persistence
- **Transcoder**: Client-side canvas/audio Web APIs and FFmpeg WASM-ready pipeline
- **Security**: Web Crypto API (`crypto.subtle`) for client-side zero-knowledge encryption

---

## 🚀 Getting Started

### Prerequisites
- Node.js >= 18.0.0
- npm >= 9.0.0

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-org/vortex-media.git
   cd vortex-media
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Copy the example environment template:
   ```bash
   cp .env.example .env
   ```

4. **Start the Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📦 Build & Production

### Production Web Build
Compile the client application and bundle the backend server:
```bash
npm run build
```

Launch the production server:
```bash
npm start
```

### Packaging for Mobile (Android APK / PWA)

#### Method 1: PWA / WebAPK (Recommended)
1. The app includes a responsive Web App Manifest and offline Service Worker support.
2. Open the URL on Google Chrome (Android) or Safari (iOS).
3. Select **Add to Home Screen** / **Install App** for a native standalone experience.

#### Method 2: Capacitor Android APK
```bash
# Install Capacitor
npm install @capacitor/core @capacitor/cli @capacitor/android

# Initialize Capacitor configuration
npx cap init "Vortex Media" "app.vortex.media"

# Build production assets
npm run build

# Add Android platform and copy web assets
npx cap add android
npx cap copy

# Open Android Studio to build APK
npx cap open android
```

---

## 🤝 Contribution Guidelines

We welcome community contributions. Please follow these guidelines:

1. **Fork the Repository** and create a feature branch (`git checkout -b feature/amazing-feature`).
2. **Follow Design Principles**: Keep all UI strictly aligned with the monochrome Nothing OS / CMF minimalist design language.
3. **Ensure Code Quality**: Run `npm run lint` and verify types before submitting a PR.
4. **Submit a Pull Request** with a concise description of your changes.

---

## 📄 License
Licensed under the Apache 2.0 License.
