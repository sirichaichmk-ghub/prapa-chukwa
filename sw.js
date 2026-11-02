/*************************************************************
 *  Service Worker — ประปาหมู่บ้านชุกหว้า V.5
 *  วางไว้โฟลเดอร์เดียวกับ index.html บน GitHub Pages
 *
 *  - ตัวแอป: ใช้เน็ตก่อน (ได้รุ่นล่าสุดเสมอ) แต่ถ้าสัญญาณอ่อน
 *    รอเกิน 4 วินาที → เปิดจากเครื่องทันที (ไม่ต้องยืนรอกลางทุ่ง)
 *  - ฟอนต์/ไอคอน: เก็บในเครื่อง ใช้ได้แม้ออฟไลน์
 *  - ข้อมูลจาก Google Apps Script: ไม่เก็บ ส่งตรงเสมอ
 *  แก้แอปครั้งใหญ่ → เปลี่ยนเลข VERSION เพื่อล้างของเก่า
 *************************************************************/
const VERSION = 'prapa-v5.0.0';
const CORE = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(CORE)).catch(() => {}));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function putCache(req, res) {
  if (res && (res.ok || res.type === 'opaque')) {
    const copy = res.clone();
    caches.open(VERSION).then((c) => c.put(req, copy)).catch(() => {});
  }
  return res;
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = req.url;
  if (url.includes('script.google.com') || url.includes('script.googleusercontent.com')) return;

  // หน้าแอป: network-first พร้อมหมดเวลา 4 วินาที
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    e.respondWith((async () => {
      const cached = await caches.match(req, { ignoreSearch: true }) || await caches.match('./');
      const net = fetch(req).then((res) => putCache(req, res));
      if (!cached) return net.catch(() => new Response('ออฟไลน์ — กรุณาเชื่อมต่ออินเทอร์เน็ตแล้วเปิดใหม่', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }));
      const timeout = new Promise((r) => setTimeout(() => r(cached), 4000));
      return Promise.race([net.catch(() => cached), timeout]);
    })());
    return;
  }

  // ไฟล์อื่น (ฟอนต์ ไอคอน): ใช้ของในเครื่องก่อน แล้วอัปเดตเบื้องหลัง
  e.respondWith(
    caches.match(req).then((cached) => {
      const net = fetch(req).then((res) => putCache(req, res)).catch(() => cached);
      return cached || net;
    })
  );
});
