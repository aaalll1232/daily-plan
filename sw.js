/* 定选每日计划 - Service Worker
 * 策略：缓存优先 + 后台更新（stale-while-revalidate）
 * 核心文件全部本地缓存，保证手机端离线可用（打卡状态本就存 localStorage）。 */
const CACHE = 'daily-plan-v9';
/* plan.md 不进预缓存：install 时缓存一份，之后页面拿到的一定是当天的旧版 */
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-180.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  /* plan.md 和 read/ 晨读包必须「网络优先」：
     旧策略（stale-while-revalidate + ignoreSearch）会先返回缓存里的旧内容，
     导致当天第一次打开看到的是昨天的计划（9.24 早上看到 9.23 的 bug）。
     晨读包同理——早上读到的必须是当天那份。断网时才回退缓存。 */
  if (url.pathname.endsWith('plan.md') || url.pathname.indexOf('/read/') >= 0) {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          if (res && res.ok && url.origin === self.location.origin) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, copy));
          }
          return res;
        })
        .catch(() => caches.match(e.request, { ignoreSearch: true }))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((hit) => {
      const fetching = fetch(e.request)
        .then((res) => {
          if (res && res.ok && url.origin === self.location.origin) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, copy));
          }
          return res;
        })
        .catch(() => hit);
      return hit || fetching;
    })
  );
});

/* 收到页面消息：预弹一条通知（部分国产浏览器要求先有一次通知授权交互） */
self.addEventListener('message', (e) => {
  const d = e.data || {};
  if (d.type === 'SKIP_WAITING') { self.skipWaiting(); return; }   // 页面点了「刷新计划」→ 立刻换新版
  if (d.type === 'NOTIFY_TEST') {
    self.registration.showNotification('每日计划 · 通知已开启', {
      body: '之后锁屏会常驻显示当前任务。',
      icon: './icon-192.png',
      tag: 'dp-test'
    });
  }
});

/* 点击通知 → 聚焦或打开页面 */
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ('focus' in c) return c.focus();
      }
      return self.clients.openWindow('./index.html');
    })
  );
});
