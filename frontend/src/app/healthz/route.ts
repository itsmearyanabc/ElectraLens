export function GET() {
  return Response.json({ ok: true, service: "electralens-frontend" }, { headers: { "cache-control": "no-store" } });
}
