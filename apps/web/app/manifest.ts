import type { MetadataRoute } from 'next';

/** S08 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ElectraLens',
    short_name: 'ElectraLens',
    description:
      'Open, checkable analysis of electoral-roll revisions. Independent; not affiliated with the Election Commission of India.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#172033',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
  };
}
