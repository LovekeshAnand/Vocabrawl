import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const BACKEND_URL =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:3001';

export async function GET() {
  const startedAt = Date.now();

  try {
    const response = await fetch(`${BACKEND_URL}/health`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });

    const backend = await response.json().catch(() => null);

    return NextResponse.json(
      {
        status: response.ok ? 'ok' : 'degraded',
        frontend: 'ok',
        backend,
        backendStatus: response.status,
        latencyMs: Date.now() - startedAt,
      },
      { status: response.ok ? 200 : 502 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: 'down',
        frontend: 'ok',
        backend: null,
        error: error instanceof Error ? error.message : 'Backend health check failed',
        latencyMs: Date.now() - startedAt,
      },
      { status: 502 }
    );
  }
}
