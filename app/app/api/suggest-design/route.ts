import { NextRequest, NextResponse } from 'next/server';
import { batchPredictCapacitance } from '@/lib/models';

const EPSILON_0 = 8.854e-12;
const NUM_CANDIDATES = 20000;

// Parameter bounds (must match training data ranges)
const BOUNDS = {
    epsilon_r: { min: 500, max: 10000 },
    layers:    { min: 10,  max: 500 },
    area:      { min: 1e-6, max: 25e-6 },
    thickness: { min: 1e-6, max: 50e-6 },
};

function randLog(min: number, max: number) {
    return Math.exp(Math.log(min) + Math.random() * (Math.log(max) - Math.log(min)));
}

function randRange(min: number, max: number) {
    return min + Math.random() * (max - min);
}

function clamp(val: number, min: number, max: number) {
    return Math.max(min, Math.min(max, val));
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { targetCapacitance, tolerancePct, v_bias = 0, temperature = 25 } = body;

        if (typeof targetCapacitance !== 'number' || targetCapacitance <= 0 ||
            typeof tolerancePct !== 'number' || tolerancePct <= 0 ||
            typeof v_bias !== 'number' || v_bias < 0 ||
            typeof temperature !== 'number') {
            return NextResponse.json({ error: "Invalid target parameters" }, { status: 400 });
        }

        // Physics-guided sampling using 3 different derivation strategies.
        // For any given target C, at least one strategy will produce 
        // parameters that land within the valid training bounds.
        // We sample in LOG SPACE because the parameter combinations span
        // 3 orders of magnitude. Linear sampling misses extreme targets.

        const inputs: Array<[number, number, number, number, number, number]> = [];
        const params: Array<{ epsilon_r: number; layers: number; area: number; thickness: number }> = [];
        const perStrategy = Math.floor(NUM_CANDIDATES / 3);

        // Strategy A: fix εᵣ, N, A → derive d
        for (let i = 0; i < perStrategy; i++) {
            const epsilon_r = randLog(BOUNDS.epsilon_r.min, BOUNDS.epsilon_r.max);
            const layers = Math.floor(randLog(BOUNDS.layers.min, BOUNDS.layers.max));
            const area = randLog(BOUNDS.area.min, BOUNDS.area.max);
            const idealD = (EPSILON_0 * epsilon_r * area * layers) / targetCapacitance;
            const d = clamp(idealD * randRange(0.85, 1.15), BOUNDS.thickness.min, BOUNDS.thickness.max);

            if (Math.abs(d - idealD) / idealD > 0.5) continue;
            inputs.push([epsilon_r, layers, area, d, v_bias, temperature]);
            params.push({ epsilon_r, layers, area, thickness: d });
        }

        // Strategy B: fix εᵣ, N, d → derive A
        for (let i = 0; i < perStrategy; i++) {
            const epsilon_r = randLog(BOUNDS.epsilon_r.min, BOUNDS.epsilon_r.max);
            const layers = Math.floor(randLog(BOUNDS.layers.min, BOUNDS.layers.max));
            const thickness = randLog(BOUNDS.thickness.min, BOUNDS.thickness.max);
            const idealA = (targetCapacitance * thickness) / (EPSILON_0 * epsilon_r * layers);
            const area = clamp(idealA * randRange(0.85, 1.15), BOUNDS.area.min, BOUNDS.area.max);

            if (Math.abs(area - idealA) / idealA > 0.5) continue;
            inputs.push([epsilon_r, layers, area, thickness, v_bias, temperature]);
            params.push({ epsilon_r, layers, area, thickness });
        }

        // Strategy C: fix εᵣ, A, d → derive N
        for (let i = 0; i < perStrategy; i++) {
            const epsilon_r = randLog(BOUNDS.epsilon_r.min, BOUNDS.epsilon_r.max);
            const area = randLog(BOUNDS.area.min, BOUNDS.area.max);
            const thickness = randLog(BOUNDS.thickness.min, BOUNDS.thickness.max);
            const idealN = (targetCapacitance * thickness) / (EPSILON_0 * epsilon_r * area);
            const layers = Math.floor(clamp(idealN * randRange(0.85, 1.15), BOUNDS.layers.min, BOUNDS.layers.max));

            if (Math.abs(layers - idealN) / idealN > 0.5) continue;
            inputs.push([epsilon_r, layers, area, thickness, v_bias, temperature]);
            params.push({ epsilon_r, layers, area, thickness });
        }

        if (inputs.length === 0) {
            return NextResponse.json({ error: "Target capacitance is outside achievable range for this design space" }, { status: 400 });
        }

        // Single batched ONNX forward pass
        const capacitances = await batchPredictCapacitance(inputs);

        // Rank by distance to target
        const ranked = params.map((p, i) => ({
            ...p,
            predictedCapacitance: capacitances[i],
            distanceToTarget: Math.abs(capacitances[i] - targetCapacitance) / targetCapacitance
        }));

        ranked.sort((a, b) => a.distanceToTarget - b.distanceToTarget);
        const topCandidates = ranked.slice(0, 3);

        if (topCandidates[0].distanceToTarget > (tolerancePct / 100)) {
            return NextResponse.json({ 
                error: `Best candidate was ${(topCandidates[0].distanceToTarget * 100).toFixed(1)}% off target (tolerance: ${tolerancePct}%). Try relaxing tolerance.`,
                candidates: topCandidates 
            }, { status: 400 });
        }

        return NextResponse.json({ candidates: topCandidates });
    } catch (err) {
        console.error("Suggest Error:", err);
        return NextResponse.json({ error: "Search failed" }, { status: 500 });
    }
}
