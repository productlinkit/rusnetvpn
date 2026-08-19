# RusVPN — website redesign concept

Konsep desain ulang halaman utama RusVPN, dibangun dengan **React + Vite**.

Sebelumnya proyek ini satu file `index.html` statis. Sekarang markup, style,
dan interaksinya dipecah menjadi komponen React, dan seluruh gambar yang dulu
ditanam sebagai base64 sudah menjadi file asli di `public/`.

## Menjalankan

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # hasil build ke dist/
npm run preview    # cek hasil build secara lokal
```

## Struktur

```
public/
  fonts/           Host Grotesk (woff2, self-hosted)
  images/          foto hero, kartu benefit, foto region
  images/shots/    12 screenshot aplikasi untuk mockup ponsel
  images/pay/      logo pembayaran (Visa/Mastercard, PayPal, Apple, Google, Stripe)
src/
  main.jsx         entry point
  App.jsx          susunan halaman
  config/env.js    API base URL, timeout, Google client id
  shared/api/      client, envelope, error, token store, resolver pesan field
  features/auth/   endpoint auth + Google Sign-In
  data/content.js  seluruh copy dan daftar berulang (plan, FAQ, region, tile)
  hooks/           reveal, count-up, scroll progress, magnetic button, dsb.
  state/session.jsx  sesi login + URL untuk halaman auth & akun
  components/      header, sheet, footer, FAB, halaman auth, halaman akun
  sections/        hero, marquee, benefit, fitur, server, apps, harga, FAQ, CTA
  styles/          stylesheet asli, dipecah per bagian
```

## Backend

Login dan register memakai backend Go di `../backend`, mengikuti aturan yang
sama dengan aplikasi mobile (`mobile/rusnetvpn/src/shared/api/`): envelope
BRD §12.3 dibuka sekali di `shared/api/client.js`, respons divalidasi zod di
batas, `ACC_001` dan `AUTH_004` ditangani sekali di interceptor, dan refresh
token dirotasi dua-duanya sekaligus (BR-11).

```bash
cd ../backend && make up && make run      # postgres, redis, mailhog + API :8090
cp .env.example .env.local                # arahkan VITE_API_BASE_URL bila perlu
npm run dev
```

Email di development tertahan di MailHog — buka http://localhost:8025 untuk
mengambil kode OTP-nya.

### Alur yang tersambung

**Auth**

| Layar | Endpoint |
|---|---|
| Login | `POST /auth/login` |
| Register | `POST /auth/register` → layar kode → `POST /auth/otp/verify` |
| Lupa password | `POST /auth/forgot-password` → layar kode → `POST /auth/reset-password` |
| Kirim ulang kode | `POST /auth/otp/resend` (cooldown 60 detik dari server) |
| Google | `POST /auth/google` (hanya bila `VITE_GOOGLE_CLIENT_ID` diisi) |
| Muat ulang halaman | `GET /me` |
| Logout | `POST /auth/logout` |

**My Account**

| Panel | Endpoint |
|---|---|
| Overview | `GET /subscriptions/current`, `GET /me/devices`, `GET /notifications` |
| Subscription | `GET /subscriptions/current`, `GET /cancel-reasons`, `POST /subscriptions/cancel`, `POST /subscriptions/reactivate` |
| Billing | `GET /transactions`, `GET /transactions/:id/invoice` |
| Devices | `GET /me/devices`, `DELETE /me/devices/:id` |
| Security | `PATCH /me/password` |
| Notifications | `GET /me/settings`, `PUT /me/settings` |
| Support | `DELETE /me` (konfirmasi dengan password) |

Mematikan switch **Auto-renewal** sama dengan membatalkan langganan — backend
tidak punya saklar terpisah, jadi switch itu membuka pemilihan alasan yang
sama dengan tombol Cancel. Setiap tulis diikuti baca ulang, bukan tebakan
lokal: server yang menentukan apa yang berubah pada `expires_at`.

Akun **free** adalah keadaan normal, bukan kasus pinggiran — semua panel harus
terbaca benar saat `plan` null, belum ada transaksi, dan belum ada perangkat.
Itu persis wajah akun yang baru daftar.

Register **tidak** langsung membuat sesi: backend menahan sesi sampai kode
enam digit dari email diverifikasi. Reset password juga berbasis kode, bukan
link — desain awal halaman ini menjanjikan link, dan itu sudah disesuaikan.

### Dua keputusan yang beda dari mobile

1. **Header `X-Device-Id` / `X-Platform` / `X-App-Version` tidak dikirim.**
   `X-Device-Id` adalah yang dihitung server sebagai slot perangkat (BRD §5.7)
   — browser bukan klien VPN, dan mengirimnya akan memakan satu dari lima slot
   milik akun hanya karena seseorang membuka invoice. Backend memang
   mendukung ini: `Service.registerDevice` berhenti lebih awal saat header
   kosong dan membiarkan sesi tanpa perangkat. `X-Platform` dilewati karena
   situs ini tidak punya baris di `app_versions`, dan mengaku `windows` akan
   mengukurnya dengan `min_supported_version` aplikasi desktop.
2. **Token disimpan di `localStorage`.** Mobile memakai Keychain/Keystore;
   browser tidak punya padanannya selama backend masih mengirim bearer token
   lewat body JSON. Konsekuensinya ditulis apa adanya di
   `shared/api/tokens.js`.

### Catatan kontrak

`error[].msg` pada envelope 422 adalah **kunci terjemahan**, bukan kalimat —
server mengirim `error.validation.passwordWeak`. Mobile melewatkannya ke
i18next; halaman ini memakai `shared/api/messages.js`, yang juga menerapkan
fallback `error.validation.<field><Rule>` → `error.validation.<Rule>` yang
didokumentasikan `validatorx.keyFor`. Fallback itu wajib: backend memancarkan
kunci seperti `error.validation.nameTooShort` yang tidak ada di locale-nya
sendiri.

### Style

`src/styles/index.css` meng-import semua file style **berurutan**, dan urutan
itu penting: `responsive.css` berisi override layar sempit dan aturan reveal,
jadi harus tetap paling akhir. Isi tiap file adalah CSS asli, tidak diubah.

## Aset

Semua foto sudah ada di repo. Satu file masih kosong dan bersifat opsional:

| File | Ukuran | Catatan |
|---|---|---|
| `public/images/cta.jpg` | 1600×900 | Latar blok CTA penutup, diredupkan ke 45%. Kalau belum ada, blok itu memakai latar navy + glow merah yang sudah rapi sendiri. |

Font Host Grotesk di-host sendiri di `public/fonts/`, jadi halaman tidak lagi
memanggil `fonts.googleapis.com`.

## Publish

Build menghasilkan folder `dist/` yang bisa dilempar ke static host mana pun
(Vercel, Netlify, Cloudflare Pages, nginx).

Untuk GitHub Pages di repo proyek (URL-nya `/<nama-repo>/`), set base-nya:

```bash
BASE_URL=/nama-repo/ npm run build
```

## Catatan

Ini konsep desain, bukan produk resmi RusVPN. Harga di blok pricing masih
placeholder.

Halaman auth dan halaman akun sudah tersambung ke backend. Yang masih belum:

- **Checkout.** Tombol harga dan "Change plan" masih mengarah ke blok pricing,
  belum memanggil `POST /subscriptions/checkout` — itu perlu redirect ke
  gateway pembayaran dan halaman balik.
- **Live chat.** Tombolnya membuka FAB WhatsApp/Telegram; endpoint tiket
  (`/support/tickets`) belum dipakai.
- **Google Sign-In** sudah ditulis tapi belum diuji — butuh client id asli.

Semua nama dan logo pihak ketiga milik pemiliknya masing-masing.
