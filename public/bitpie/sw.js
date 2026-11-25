// 离线缓存：先走缓存，后台更新
const CACHE = 'bitpie-27e8ffd0'
async function precache() {
  const cache = await caches.open(CACHE)
  let list = ['./index.html']
  try {
    const res = await fetch('./precache.json', { cache: 'no-store' })
    if (res.ok) list = await res.json()
  } catch (_) { /* 拿不到清单就用最小集 */ }

  // 逐个缓存：单个资源失败（404 / 重定向）不影响整体安装
  await Promise.allSettled(
    list.map(async url => {
      try {
        const req = new Request(url, { cache: 'reload' })
        const res = await fetch(req)
        if (res.ok) await cache.put(req, res)
      } catch (_) { /* 忽略单个失败 */ }
    })
  )
}

self.addEventListener('install', e => {
  e.waitUntil(precache().then(() => self.skipWaiting()))
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', e => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== location.origin) return

  e.respondWith(
    // ignoreSearch：index.html?embed=1 也要能命中缓存的 index.html
    caches.match(req, { ignoreSearch: true }).then(hit => {
      if (hit) {
        fetch(req).then(res => {
          if (res.ok) caches.open(CACHE).then(c => c.put(req, res.clone()))
        }).catch(() => {})
        return hit
      }
      return fetch(req)
        .then(res => {
          if (res.ok) caches.open(CACHE).then(c => c.put(req, res.clone()))
          return res
        })
        .catch(() => caches.match('./index.html', { ignoreSearch: true }))
    })
  )
})
