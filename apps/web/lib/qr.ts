import 'server-only';

import QRCode from 'qrcode';

import { env } from './env';

/** B13.05: a booth QR code encodes only https://<host>/b/<code>. Nothing about any person. */
export function boothUrl(code: string): string {
  return `${env.appOrigin()}/b/${code}`;
}

export async function boothQrSvg(code: string): Promise<string> {
  return QRCode.toString(boothUrl(code), {
    type: 'svg',
    errorCorrectionLevel: 'M',
    margin: 1,
    color: { dark: '#172033', light: '#ffffff' },
  });
}

/** The SVG as a data URI for an <img>, so no markup is injected into the page. */
export async function boothQrDataUri(code: string): Promise<string> {
  return `data:image/svg+xml;base64,${Buffer.from(await boothQrSvg(code)).toString('base64')}`;
}
