/*************************************************************
 *  Service Worker — ระบบประปาหมู่บ้านชุกหว้า
 *  ─────────────────────────────────────────────────────────
 *  วางไฟล์นี้ไว้ "โฟลเดอร์เดียวกับ index.html" บน GitHub Pages
 *  (เช่น ถ้า index.html อยู่ที่ราก repo ก็วาง sw.js ที่รากด้วย)
 *
 *  กลยุทธ์: network-first สำหรับตัวหน้าเว็บ
 *   → เมื่อมีเน็ต ผู้ใช้จะได้เวอร์ชันล่าสุดเสมอ (อัปเดตในอนาคตถึงผู้ใช้แน่นอน)
 *   → เมื่อออฟไลน์ ค่อยใช้ของที่ cache ไว้ (เปิดแอปได้แม้ไม่มีสัญญาณ)
 *
 *  เมื่อแก้ไขแอปครั้งใหญ่ ให้เปลี่ยนเลข VERSION ด้านล่าง
 *  เพื่อล้าง cache เก่าทิ้งให้สะอาด
 *************************************************************/
const VERSION = 'prapa-v4-2026-06-26';
const CORE = ['./', './index.html'];

self.addEventListener('install', (e) => {
  self.skipWaiting(); // ใช้เวอร์ชันใหม่ทันที ไม่ต้องรอปิดแท็บ
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(CORE).catch(() => {})));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return; // POST ไป Apps Script ปล่อยผ่านตามปกติ

  const url = req.url;
  // ข้อมูลสดจาก Google — ห้าม cache เพื่อให้ได้ข้อมูลล่าสุดเสมอ
  if (url.includes('script.google.com') ||
      url.includes('script.googleusercontent.com') ||
      url.includes('googleapis.com')) {
    return; // ปล่อยให้เบราว์เซอร์จัดการเอง (network ตรง)
  }

  // ตัวหน้าเว็บ (เปิดหน้า/ไฟล์ HTML): network-first
  const accept = req.headers.get('accept') || '';
  if (req.mode === 'navigate' || accept.includes('text/html')) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('./')))
    );
    return;
  }

  // ไฟล์ static อื่น ๆ (เช่นไลบรารีจาก CDN): cache-first พอ — โหลดเร็ว ประหยัดเน็ต
  e.respondWith(
    caches.match(req).then((cached) =>
      cached ||
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => cached)
    )
  );
});
