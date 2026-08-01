import { NextResponse } from 'next/server';
import { modelsReady } from '@/lib/models';

export async function GET() {
  try {
    await modelsReady;
    return NextResponse.json({ status: 'ok', message: 'ONNX models are loaded and ready.' });
  } catch (err) {
    console.error('Health check failed:', err);
    return NextResponse.json(
      { status: 'error', message: 'Models failed to load.' },
      { status: 503 },
    );
  }
}
