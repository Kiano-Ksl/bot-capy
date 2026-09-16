# 🤖 Bot Capy

![NodeJS](https://img.shields.io/badge/Node.js-18.x-green?style=flat-square&logo=nodedotjs)
![Baileys](https://img.shields.io/badge/Engine-Baileys-blue?style=flat-square)
![Status](https://img.shields.io/badge/Status-Active-success?style=flat-square)

> **Bot Capy** WhatsApp Bot ringan.

---

## Daftar Fitur

| Kategori | Perintah / Command | Status | Deskripsi |
| :--- | :--- | :---: | :--- |
| **Media Downloader** | `.ig`, `.tt`, `.fb` | ✔️ | Mengunduh media dari Instagram, TikTok, dan Facebook. |
| **Audio Utility** | `.spotify` | ✔️ | Mengunduh lagu dari Spotify via tautan atau kata kunci. |
| **AI Integration** | `.ai` | ✔️ | Asisten cerdas dengan kemampuan pemformatan data tabel. |
| **Image Generator** | `.flux` | ✔️ | Menghasilkan gambar (*Prompt-to-Image*) menggunakan Flux AI. |
| **Mini Games** | `.ttt` | ✔️ | Permainan Tic-Tac-Toe interaktif multi-pemain dalam grup. |
| **Media Tools** | `.s` | ✔️ | Konversi gambar atau video pendek menjadi Stiker WhatsApp. |
| **Group System** | *(Otomatis)* | ✔️ | Radar *Welcome* & *Goodbye* grup tanpa beban database. |

---

## 💻 Persyaratan Sistem

* **OS:** Linux (Ubuntu/Debian), Windows, atau Android (via Termux)
* **Engine:** Node.js (Versi 18.x ke atas)
* **Dependensi:** FFmpeg (Wajib untuk fitur pembuatan stiker)
* **RAM:** Minimal 1 GB

---

## Panduan Penggunaan (PC / VPS / Windows)

Panduan ini ditujukan saat bot akan di-deploy ke PC, Windows, atau VPS. *(Catatan untuk Windows: Pastikan Anda sudah menginstal Git dan Node.js dari situs resminya).*

**1. Clone Repositori:**
```bash
git clone [https://github.com/Kiano-Ksl/bot-capy.git](https://github.com/Kiano-Ksl/bot-capy.git)
cd bot-capy
```

**2. Instalasi Modul:**
```bash
npm install
```

**3. Jalankan Bot:**
Jalankan perintah ini di terminal, lalu segera buka WhatsApp di HP Anda (Tautkan Perangkat) untuk memindai *QR Code* yang muncul:
```bash
node index.js
```

---

## # Panduan Instalasi (HP Android / Termux)

Bagi pengguna Android yang ingin menjalankan bot ini melalui aplikasi Termux, ikuti langkah-langkah berikut secara berurutan:

**1. Update & Install Bahan Dasar:**
```bash
pkg update && pkg upgrade -y
pkg install git nodejs ffmpeg imagemagick -y
```

**2. Clone Repositori:**
```bash
git clone https://github.com/Kiano-Ksl/bot-capy.git
cd bot-capy
```

**3. Instalasi Modul Utama:**
```bash
npm install
```

**4. Fix Error Sharp (Wajib untuk pengguna Termux):**
Agar bot bisa merender gambar (thumbnail) tanpa error di sistem operasi HP, jalankan perintah ini:
```bash
npm install sharp @img/sharp-wasm32
```

**5. Jalankan Bot & Scan QR:**
```bash
node index.js

```
## # Kredit & Lisensi
Struktur dasar bot ini diadaptasi dari **Ourin & Rimuru**, kemudian dimodifikasi dan dioptimasi secara mandiri. Engine WhatsApp Web API didukung oleh [Baileys](https://github.com/WhiskeySockets/Baileys).
