/** S09: container liveness. Says nothing about the database (that is the API's /ready). */
export function GET() {
  return Response.json({ ok: true }, { headers: { 'cache-control': 'no-store' } });
}
