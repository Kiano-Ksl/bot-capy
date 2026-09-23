# 🤖 Bot Capy

![NodeJS](https://img.shields.io/badge/Node.js-18.x%20%7C%2020.x-green?style=flat-square&logo=nodedotjs)
![Baileys](https://img.shields.io/badge/Engine-Baileys-blue?style=flat-square)
![Status](https://img.shields.io/badge/Status-Active-success?style=flat-square)
![Server](https://img.shields.io/badge/Deployed_on-Azure_Cloud-0089D6?style=flat-square&logo=microsoft-azure&logoColor=white)

> **Bot Capy** WhatsApp Bot ringan, cepat, dan siap tempur 24/7.

---

## = Daftar Fitur

| Kategori | Perintah / Command | Status | Deskripsi |
| :--- | :--- | :---: | :--- |
| **Media Downloader** | `.ig`, `.tt`, `.fb` | ✔️ | Mengunduh media dari Instagram, TikTok, dan Facebook secara instan. |
| **Audio Utility** | `.spotify` | ✔️ | Mengunduh lagu dari Spotify via tautan atau kata kunci. |
| **AI Integration** | `.ai` | ✔️ | Asisten cerdas dengan kemampuan pemformatan data tabel. |
| **Image Generator** | `.flux` | ✔️ | Menghasilkan gambar (*Prompt-to-Image*) menggunakan Flux AI. |
| **Mini Games** | `.ttt` | ✔️ | Permainan Tic-Tac-Toe interaktif multi-pemain dalam grup. |
| **Media Tools** | `.s` | ✔️ | Konversi gambar atau video pendek menjadi Stiker WhatsApp. |
| **Group System** | *(Otomatis)* | ✔️ | Radar *Welcome* & *Goodbye* grup tanpa beban database. |

---

## Persyaratan Sistem

* **OS:** Linux (Ubuntu/Debian direkomendasikan), Windows, atau Android (via Termux)
* **Engine:** Node.js (Versi 18.x atau 20.x)
* **Dependensi:** FFmpeg (Wajib untuk fitur pembuatan stiker)
* **RAM:** Minimal 1 GB (Aman dijalankan pada spesifikasi *Standard_B1s* atau *B2ats_v2*)

---

## ☁️ Panduan Deployment (VPS / Cloud Server 24/7)

Panduan ini direkomendasikan jika Anda ingin menjalankan bot secara permanen (24 jam nonstop) di layanan Cloud seperti Microsoft Azure, DigitalOcean, atau AWS menggunakan OS **Ubuntu/Linux**.

**1. Persiapan Server & Update:**
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y nodejs git ffmpeg
```

**2. Instalasi PM2 (Process Manager):**
PM2 digunakan agar bot tetap hidup di latar belakang meskipun terminal SSH ditutup.
```bash
sudo npm install -g pm2
```

**3. Clone Repositori:**
```bash
git clone https://github.com/Kiano-Ksl/bot-capy.git
cd bot-capy
```

**4. Instalasi Modul:**
```bash
npm install
```

**5. Jalankan Bot & Scan QR:**
```bash
pm2 start index.js --name "capy"
pm2 logs capy
```
*(Segera tautkan WhatsApp Anda dengan memindai QR Code. Setelah terhubung, tekan `Ctrl + C` untuk keluar dari logs).*

**6. Kunci Auto-Restart (Opsional tapi Penting):**
Agar bot otomatis menyala jika server mengalami *reboot*:
```bash
pm2 save
pm2 startup
```

---

## 💻 Panduan Penggunaan (Lokal / Windows PC)

*(Pastikan Anda sudah menginstal Git dan Node.js dari situs resminya).*

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
```bash
node index.js
```
*(Segera buka WhatsApp di HP Anda (Tautkan Perangkat) untuk memindai QR Code yang muncul).*

---

## 📱 Panduan Instalasi (HP Android / Termux)

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

---

## 📜 Kredit & Lisensi
Struktur dasar bot ini diadaptasi dari **Ourin & Rimuru**, kemudian dimodifikasi dan dioptimasi secara mandiri untuk performa yang lebih baik. Engine WhatsApp Web API didukung oleh [Baileys](https://github.com/WhiskeySockets/Baileys).
