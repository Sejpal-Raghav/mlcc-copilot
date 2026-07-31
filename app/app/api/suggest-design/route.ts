import { NextRequest, NextResponse } from 'next/server';
import { batchPredictCapacitance } from '@/lib/models';

const EPSILON_0 = 8.854e-12;
const NUM_CANDIDATES = 10000;

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { targetCapacitance, tolerancePct } = body;

        if (typeof targetCapacitance !== 'number' || targetCapacitance <= 0 ||
            typeof tolerancePct !== 'number' || tolerancePct <= 0) {
            return NextResponse.json({ error: "Invalid target parameters" }, { status: 400 });
        }

        // Phase 1: Generate all candidates using physics-guided sampling
        const inputs: Array<[number, number, number, number]> = [];
        const params: Array<{ epsilon_r: number; layers: number; area: number; thickness: number }> = [];

        for (let i = 0; i < NUM_CANDIDATES; i++) {
            const epsilon_r = 500 + Math.random() * 9500;
            const layers = Math.floor(10 + Math.random() * 490);
            const area = (1 + Math.random() * 24) * 1e-6;

            // Derive thickness from physics: d = ε₀ × εᵣ × A × N / C_target
            const idealThickness = (EPSILON_0 * epsilon_r * area * layers) / targetCapacitance;
            const noisy = idealThickness * (0.8 + Math.random() * 0.4);
            const thickness = Math.max(1e-6, Math.min(50e-6, noisy));

            inputs.push([epsilon_r, layers, area, thickness]);
            params.push({ epsilon_r, layers, area, thickness });
        }

        // Phase 2: Single batched ONNX forward pass (replaces 10,000 sequential calls)
        const capacitances = await batchPredictCapacitance(inputs);

        // Phase 3: Rank by distance to target
        const ranked = params.map((p, i) => ({
            ...p,
            predictedCapacitance: capacitances[i],
            distanceToTarget: Math.abs(capacitances[i] - targetCapacitance) / targetCapacitance
        }));

        ranked.sort((a, b) => a.distanceToTarget - b.distanceToTarget);
        const topCandidates = ranked.slice(0, 3);

        if (topCandidates[0].distanceToTarget > (tolerancePct / 100)) {
            return NextResponse.json({ error: "No candidate found within tolerance" }, { status: 400 });
        }

        return NextResponse.json({ candidates: topCandidates });
    } catch (err) {
        console.error("Suggest Error:", err);
        return NextResponse.json({ error: "Search failed" }, { status: 500 });
    }
}
