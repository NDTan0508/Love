import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Love Mission',
    short_name: 'Love',
    description: 'Không gian riêng cho hai người lưu kỷ niệm, đồng bộ nhiệm vụ và quay về với nhau mỗi ngày.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#fff5f8',
    theme_color: '#ff6b9d',
    orientation: 'portrait',
    icons: [
      {
        src: '/icons/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'maskable'
      },
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: '/icons/maskable-icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable'
      }
    ]
  }
}
