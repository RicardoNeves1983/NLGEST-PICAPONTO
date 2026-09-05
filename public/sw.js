// NLGest Ponto - service worker mínimo.
// Único objetivo: permitir a instalação da app no telemóvel (ecrã principal) e
// mostrar a app já carregada quando o telemóvel fica sem rede.
// Não intercepta pedidos à API/Supabase nem ficheiros da aplicação — só a
// navegação principal (abrir/atualizar a página), e mesmo essa tenta sempre a
// rede primeiro, só usando a cópia guardada quando não há ligação.
const SHELL_CACHE = 'nlg-ponto-shell-v1'
const SHELL_URLS = ['/', '/manifest.webmanifest']

self.addEventListener('install', event => {
 self.skipWaiting()
 event.waitUntil(caches.open(SHELL_CACHE).then(cache => cache.addAll(SHELL_URLS)).catch(() => {}))
})

self.addEventListener('activate', event => {
 event.waitUntil(
  caches.keys().then(keys => Promise.all(keys.filter(k => k !== SHELL_CACHE).map(k => caches.delete(k))))
 )
 self.clients.claim()
})

self.addEventListener('fetch', event => {
 if (event.request.method !== 'GET') return
 if (event.request.mode !== 'navigate') return
 event.respondWith(
  fetch(event.request).catch(() => caches.match('/').then(res => res || caches.match(event.request)))
 )
})
