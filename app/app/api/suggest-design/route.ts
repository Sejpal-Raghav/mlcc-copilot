import { NextRequest, NextResponse } from 'next/server';
import { predictPerformance } from '@/lib/models';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { targetCapacitance, tolerancePct } = body;

        if (typeof targetCapacitance !== 'number' || targetCapacitance <= 0 ||
            typeof tolerancePct !== 'number' || tolerancePct <= 0) {
            return NextResponse.json({ error: "Invalid target parameters" }, { status: 400 });
        }

        // Random search for candidates
        const candidates = [];
        for (let i = 0; i < 5000; i++) {
            const epsilon_r = 500 + Math.random() * 9500;
            const layers = Math.floor(10 + Math.random() * 490);
            const area = (1 + Math.random() * 24) * 1e-6;
            const thickness = (1 + Math.random() * 49) * 1e-6;

            const pred = await predictPerformance(epsilon_r, layers, area, thickness, targetCapacitance, tolerancePct);
            
            // Normalized distance: just the absolute % error
            const distanceToTarget = Math.abs(pred.capacitance - targetCapacitance) / targetCapacitance;
            
            candidates.push({
                epsilon_r, layers, area, thickness,
                predictedCapacitance: pred.capacitance,
                distanceToTarget
            });
        }

        // Sort by distance
        candidates.sort((a, b) => a.distanceToTarget - b.distanceToTarget);
        
        // Take top 3
        const topCandidates = candidates.slice(0, 3);

        if (topCandidates[0].distanceToTarget > (tolerancePct / 100)) {
            return NextResponse.json({ error: "No candidate found within tolerance" }, { status: 400 });
        }

        return NextResponse.json({ candidates: topCandidates });
    } catch (err) {
        console.error("Suggest Error:", err);
        return NextResponse.json({ error: "Search failed" }, { status: 500 });
    }
}
