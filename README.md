# 🤖 Bot Capy

![NodeJS](https://img.shields.io/badge/Node.js-18.x-green?style=flat-square&logo=nodedotjs)
![Baileys](https://img.shields.io/badge/Engine-Baileys-blue?style=flat-square)
![Status](https://img.shields.io/badge/Status-Active-success?style=flat-square)

> **Bot Capy** WhatsApp Bot ringan.

---

##  Daftar Fitur

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

## # Persyaratan Sistem

* **OS:** Linux (Ubuntu/Debian) atau Windows
* **Engine:** Node.js (Versi 18.x ke atas)
* **Dependensi:** FFmpeg (Wajib untuk fitur pembuatan stiker)
* **RAM:** Minimal 1 GB

---

##  Panduan Penggunaan

Panduan ini ditujukan saat bot akan di-deploy ke VPS atau mesin baru:

**1. Clone Repositori:**
```bash
git clone https://github.com/Kiano-Ksl/bot-capy.git
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

## 📝 Kredit & Lisensi
Struktur dasar bot ini diadaptasi dari **Ourin & Rimuru**, kemudian dimodifikasi dan dioptimasi secara mandiri. Engine WhatsApp Web API didukung oleh [Baileys](https://github.com/WhiskeySockets/Baileys).
