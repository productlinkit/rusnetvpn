# RusVPN — website redesign concept

Konsep desain ulang halaman utama RusVPN. Satu file statis, tanpa build step:
seluruh markup, CSS, dan JavaScript ada di dalam [`index.html`](index.html).

## Menjalankan secara lokal

Buka `index.html` langsung di browser, atau jalankan server statis apa pun:

```bash
npx serve .
# atau
python -m http.server 8000
```

## Publish ke GitHub Pages

Karena `index.html` sudah berada di root, cukup aktifkan Pages di
**Settings → Pages → Source: Deploy from a branch → `main` / `(root)`**.
Halaman akan tersedia di `https://<username>.github.io/<nama-repo>/`.

## Catatan

Ini adalah konsep desain, bukan produk resmi RusVPN. Semua nama dan logo pihak
ketiga adalah milik pemiliknya masing-masing.
