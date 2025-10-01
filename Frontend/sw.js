// Service Worker for CrowdShield PWA
const CACHE_NAME = 'crowdshield-v1.0.0';
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/mobile-responsive.css',
  '/modal-fixes.css',
  '/risk-forecast.css',
  '/script.js',
  '/manifest.json',
  // External CDN resources
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://unpkg.com/leaflet-routing-machine@latest/dist/leaflet-routing-machine.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://unpkg.com/leaflet-routing-machine@latest/dist/leaflet-routing-machine.js',
  'https://cdn.jsdelivr.net/npm/chart.js'
];

// Install event - cache resources
self.addEventListener('install', event => {
  console.log('CrowdShield Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('CrowdShield Service Worker: Caching app shell');
        return cache.addAll(urlsToCache.map(url => {
          return new Request(url, { mode: 'no-cors' });
        })).catch(error => {
          console.log('CrowdShield Service Worker: Cache failed for some resources', error);
          // Cache what we can
          return Promise.allSettled(
            urlsToCache.map(url => cache.add(new Request(url, { mode: 'no-cors' })))
          );
        });
      })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('CrowdShield Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('CrowdShield Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip API requests - always go to network
  if (event.request.url.includes('/api/') || 
      event.request.url.includes('localhost:8080')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version or fetch from network
        if (response) {
          console.log('CrowdShield Service Worker: Serving from cache:', event.request.url);
          return response;
        }

        console.log('CrowdShield Service Worker: Fetching from network:', event.request.url);
        return fetch(event.request).then(response => {
          // Don't cache if not a valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone the response
          const responseToCache = response.clone();

          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });

          return response;
        }).catch(error => {
          console.log('CrowdShield Service Worker: Network fetch failed:', error);
          
          // Return offline page for navigation requests
          if (event.request.destination === 'document') {
            return caches.match('/index.html');
          }
          
          // Return a generic offline response for other requests
          return new Response('Offline - CrowdShield requires internet connection for full functionality', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
              'Content-Type': 'text/plain'
            })
          });
        });
      })
  );
});

// Background sync for offline data
self.addEventListener('sync', event => {
  console.log('CrowdShield Service Worker: Background sync triggered');
  
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Sync offline data when connection is restored
      syncOfflineData()
    );
  }
});

// Push notifications
self.addEventListener('push', event => {
  console.log('CrowdShield Service Worker: Push notification received');
  
  const options = {
    body: event.data ? event.data.text() : 'CrowdShield Alert',
    icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iOTYiIGhlaWdodD0iOTYiIHZpZXdCb3g9IjAgMCA5NiA5NiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9Ijk2IiBoZWlnaHQ9Ijk2IiByeD0iMjQiIGZpbGw9IiMwZjE3MmEiLz4KPHN2ZyB4PSIyNCIgeT0iMjQiIHdpZHRoPSI0OCIgaGVpZ2h0PSI0OCIgdmlld0JveD0iMCAwIDUxMiA1MTIiIGZpbGw9IiMwMEZGODgiPgo8cGF0aCBkPSJNNDY2LjUgODMuN2wtMTkyLTE2YS0xOC41IDE4LjUgMCAwIDAtMTkgMGwtMTkyIDE2QTEyIDEyIDAgMCAwIDUyIDk1LjJ2MjA5LjFjMCA5OS4yIDUwLjggMTg3LjQgMTI5LjMgMjM5LjNhMTIgMTIgMCAwIDAgMTMuNCAwQzI3My4yIDQ5MS43IDMyNCA0MDMuNSAzMjQgMzA0LjNWOTUuMmExMiAxMiAwIDAgMC0xMC41LTExLjV6Ii8+Cjwvc3ZnPgo8L3N2Zz4K',
    badge: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNzIiIGhlaWdodD0iNzIiIHZpZXdCb3g9IjAgMCA3MiA3MiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjcyIiBoZWlnaHQ9IjcyIiByeD0iMTgiIGZpbGw9IiMwZjE3MmEiLz4KPHN2ZyB4PSIxMiIgeT0iMTIiIHdpZHRoPSI0OCIgaGVpZ2h0PSI0OCIgdmlld0JveD0iMCAwIDUxMiA1MTIiIGZpbGw9IiMwMEZGODgiPgo8cGF0aCBkPSJNNDY2LjUgODMuN2wtMTkyLTE2YS0xOC41IDE4LjUgMCAwIDAtMTkgMGwtMTkyIDE2QTEyIDEyIDAgMCAwIDUyIDk1LjJ2MjA5LjFjMCA5OS4yIDUwLjggMTg3LjQgMTI5LjMgMjM5LjNhMTIgMTIgMCAwIDAgMTMuNCAwQzI3My4yIDQ5MS43IDMyNCA0MDMuNSAzMjQgMzA0LjNWOTUuMmExMiAxMiAwIDAgMC0xMC41LTExLjV6Ii8+Cjwvc3ZnPgo8L3N2Zz4K',
    vibrate: [200, 100, 200],
    tag: 'crowdshield-alert',
    requireInteraction: true,
    actions: [
      {
        action: 'view',
        title: 'View Dashboard',
        icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMTMuMDkgOC4yNkwyMCA5TDEzLjA5IDE1Ljc0TDEyIDIyTDEwLjkxIDE1Ljc0TDQgOUwxMC45MSA4LjI2TDEyIDJaIiBmaWxsPSIjMDBGRjg4Ii8+Cjwvc3ZnPgo='
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTE4IDZMNiAxOE02IDZMMTggMTgiIHN0cm9rZT0iIzZiNzI4MCIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPC9zdmc+'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('CrowdShield Alert', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', event => {
  console.log('CrowdShield Service Worker: Notification clicked');
  
  event.notification.close();

  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/')
    );
  } else if (event.action === 'dismiss') {
    // Just close the notification
    return;
  } else {
    // Default action - open the app
    event.waitUntil(
      clients.matchAll().then(clientList => {
        if (clientList.length > 0) {
          return clientList[0].focus();
        }
        return clients.openWindow('/');
      })
    );
  }
});

// Message handler for communication with main thread
self.addEventListener('message', event => {
  console.log('CrowdShield Service Worker: Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

// Sync offline data function
async function syncOfflineData() {
  try {
    console.log('CrowdShield Service Worker: Syncing offline data...');
    
    // Get offline data from IndexedDB or localStorage
    const offlineData = await getOfflineData();
    
    if (offlineData && offlineData.length > 0) {
      // Send offline data to server
      const response = await fetch('/api/sync-offline-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(offlineData)
      });
      
      if (response.ok) {
        console.log('CrowdShield Service Worker: Offline data synced successfully');
        await clearOfflineData();
      }
    }
  } catch (error) {
    console.error('CrowdShield Service Worker: Sync failed:', error);
  }
}

// Helper functions for offline data management
async function getOfflineData() {
  // Implementation would depend on your offline storage strategy
  return [];
}

async function clearOfflineData() {
  // Implementation would depend on your offline storage strategy
  console.log('CrowdShield Service Worker: Offline data cleared');
}

// Error handler
self.addEventListener('error', event => {
  console.error('CrowdShield Service Worker: Error occurred:', event.error);
});

// Unhandled rejection handler
self.addEventListener('unhandledrejection', event => {
  console.error('CrowdShield Service Worker: Unhandled promise rejection:', event.reason);
});

console.log('CrowdShield Service Worker: Loaded successfully');