// Health check endpoint
export async function GET() {
  return Response.json({ ok: true });
}