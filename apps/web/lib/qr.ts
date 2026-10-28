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

/** A demo voter card's QR: https://<host>/v/<random code>, never a card number. */
export async function voterCardQrDataUri(code: string): Promise<string> {
  const svg = await QRCode.toString(`${env.appOrigin()}/v/${code}`, {
    type: 'svg',
    errorCorrectionLevel: 'M',
    margin: 1,
    color: { dark: '#172033', light: '#ffffff' },
  });
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

/** The SVG as a data URI for an <img>, so no markup is injected into the page. */
export async function boothQrDataUri(code: string): Promise<string> {
  return `data:image/svg+xml;base64,${Buffer.from(await boothQrSvg(code)).toString('base64')}`;
}
