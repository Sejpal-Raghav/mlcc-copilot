import { NextRequest, NextResponse } from 'next/server';
import { batchPredictCapacitance } from '@/lib/models';

const EPSILON_0 = 8.854e-12;

// Parameter bounds (must match training data ranges)
const BOUNDS = {
    epsilon_r: { min: 500, max: 10000 },
    layers:    { min: 10,  max: 500 },
    area:      { min: 1e-6, max: 25e-6 },
    thickness: { min: 1e-6, max: 50e-6 },
};

// Normalize U in [0, 1] to physical X
function uToX(u: number[]) {
    return [
        Math.exp(Math.log(BOUNDS.epsilon_r.min) + u[0] * (Math.log(BOUNDS.epsilon_r.max) - Math.log(BOUNDS.epsilon_r.min))),
        BOUNDS.layers.min + u[1] * (BOUNDS.layers.max - BOUNDS.layers.min),
        Math.exp(Math.log(BOUNDS.area.min) + u[2] * (Math.log(BOUNDS.area.max) - Math.log(BOUNDS.area.min))),
        Math.exp(Math.log(BOUNDS.thickness.min) + u[3] * (Math.log(BOUNDS.thickness.max) - Math.log(BOUNDS.thickness.min)))
    ];
}

// Map physical X to U in [0, 1]
function xToU(x: number[]) {
    return [
        (Math.log(x[0]) - Math.log(BOUNDS.epsilon_r.min)) / (Math.log(BOUNDS.epsilon_r.max) - Math.log(BOUNDS.epsilon_r.min)),
        (x[1] - BOUNDS.layers.min) / (BOUNDS.layers.max - BOUNDS.layers.min),
        (Math.log(x[2]) - Math.log(BOUNDS.area.min)) / (Math.log(BOUNDS.area.max) - Math.log(BOUNDS.area.min)),
        (Math.log(x[3]) - Math.log(BOUNDS.thickness.min)) / (Math.log(BOUNDS.thickness.max) - Math.log(BOUNDS.thickness.min))
    ];
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

        const isValid = (v: any, min: number) => typeof v === 'number' && !isNaN(v) && isFinite(v) && v >= min;

        if (
            !isValid(targetCapacitance, 1e-15) ||
            !isValid(tolerancePct, 0.1) ||
            !isValid(v_bias, 0) ||
            !isValid(temperature, -273)
        ) {
            return NextResponse.json({ error: "Invalid numeric parameters" }, { status: 400 });
        }

        // ====================================================================
        // OPTIMIZATION: Finite Difference Gradient Descent (Adam)
        // We will optimize multiple independent seeds to find the best designs.
        // ====================================================================
        const NUM_SEEDS = 5;
        const MAX_ITER = 50;
        const DELTA = 1e-4; // Finite difference step in U-space
        const LR = 0.05;    // Learning rate for Adam

        // 1. Generate smart initial seeds using physics formula
        let seedsU: number[][] = [];
        for (let i = 0; i < NUM_SEEDS * 10; i++) {
            if (seedsU.length >= NUM_SEEDS) break;
            
            // Randomly sample 3 params, derive the 4th
            const epsilon_r = Math.exp(randRange(Math.log(BOUNDS.epsilon_r.min), Math.log(BOUNDS.epsilon_r.max)));
            const layers = Math.round(randRange(BOUNDS.layers.min, BOUNDS.layers.max));
            const area = Math.exp(randRange(Math.log(BOUNDS.area.min), Math.log(BOUNDS.area.max)));
            
            const idealD = (EPSILON_0 * epsilon_r * area * layers) / targetCapacitance;
            if (idealD >= BOUNDS.thickness.min && idealD <= BOUNDS.thickness.max) {
                seedsU.push(xToU([epsilon_r, layers, area, idealD]));
            }
        }
        
        // Fallback to purely random seeds if we couldn't find good physics-based ones
        while (seedsU.length < NUM_SEEDS) {
            seedsU.push([Math.random(), Math.random(), Math.random(), Math.random()]);
        }

        // Adam Optimizer State
        let m = Array.from({ length: NUM_SEEDS }, () => [0, 0, 0, 0]);
        let v = Array.from({ length: NUM_SEEDS }, () => [0, 0, 0, 0]);
        const beta1 = 0.9;
        const beta2 = 0.999;
        const epsilon = 1e-8;

        // Optimization Loop
        const history: { iteration: number, loss: number }[] = [];

        for (let iter = 1; iter <= MAX_ITER; iter++) {
            let bestLossForIter = Infinity;
            // Build batch for central finite difference
            // For each seed: 1 center point + 8 perturbed points = 9 points
            const batchInputs: Array<[number, number, number, number, number, number]> = [];
            
            for (let s = 0; s < NUM_SEEDS; s++) {
                const u = seedsU[s];
                // Center point
                batchInputs.push([...uToX(u), v_bias, temperature] as [number, number, number, number, number, number]);
                
                // Perturbed points
                for (let dim = 0; dim < 4; dim++) {
                    const uPlus = [...u]; uPlus[dim] = clamp(uPlus[dim] + DELTA, 0, 1);
                    const uMinus = [...u]; uMinus[dim] = clamp(uMinus[dim] - DELTA, 0, 1);
                    batchInputs.push([...uToX(uPlus), v_bias, temperature] as [number, number, number, number, number, number]);
                    batchInputs.push([...uToX(uMinus), v_bias, temperature] as [number, number, number, number, number, number]);
                }
            }

            // Run batch predict (very fast since ONNX supports batching)
            const capacitances = await batchPredictCapacitance(batchInputs);

            // Compute gradients and apply Adam update
            for (let s = 0; s < NUM_SEEDS; s++) {
                const baseIdx = s * 9;
                const cCenter = capacitances[baseIdx];
                
                // Loss function: (log(C_pred) - log(C_target))^2
                // We use log space because capacitance can span orders of magnitude
                const logC = Math.log(cCenter);
                const logTarget = Math.log(targetCapacitance);
                const loss = Math.pow(logC - logTarget, 2);
                if (loss < bestLossForIter) bestLossForIter = loss;
                
                const gradLossToLogC = 2 * (logC - logTarget);

                for (let dim = 0; dim < 4; dim++) {
                    const cPlus = capacitances[baseIdx + 1 + dim * 2];
                    const cMinus = capacitances[baseIdx + 2 + dim * 2];
                    
                    // Gradient of log(C) with respect to U[dim]
                    const dLogC_dU = (Math.log(cPlus) - Math.log(cMinus)) / (2 * DELTA);
                    
                    // Chain rule: dLoss / dU = (dLoss / dLogC) * (dLogC / dU)
                    const grad = gradLossToLogC * dLogC_dU;
                    
                    // Adam Update
                    m[s][dim] = beta1 * m[s][dim] + (1 - beta1) * grad;
                    v[s][dim] = beta2 * v[s][dim] + (1 - beta2) * Math.pow(grad, 2);
                    
                    const mHat = m[s][dim] / (1 - Math.pow(beta1, iter));
                    const vHat = v[s][dim] / (1 - Math.pow(beta2, iter));
                    
                    seedsU[s][dim] = seedsU[s][dim] - LR * mHat / (Math.sqrt(vHat) + epsilon);
                    seedsU[s][dim] = clamp(seedsU[s][dim], 0, 1); // keep in bounds
                }
            }
            history.push({ iteration: iter, loss: bestLossForIter });
        }

        // Evaluate final optimized seeds
        const finalInputs = seedsU.map(u => {
            const x = uToX(u);
            x[1] = Math.round(x[1]); // Snap layers to integer for final evaluation
            return [...x, v_bias, temperature] as [number, number, number, number, number, number];
        });
        const finalCapacitances = await batchPredictCapacitance(finalInputs);

        const candidates = seedsU.map((u, i) => {
            const x = uToX(u);
            const cap = finalCapacitances[i];
            return {
                epsilon_r: x[0],
                layers: Math.round(x[1]),
                area: x[2],
                thickness: x[3],
                predictedCapacitance: cap,
                distanceToTarget: Math.abs(cap - targetCapacitance) / targetCapacitance
            };
        });

        // Rank by distance to target and take unique top 3
        candidates.sort((a, b) => a.distanceToTarget - b.distanceToTarget);
        
        // Filter out highly similar designs (since optimization might converge to same local minima)
        const uniqueCandidates = [];
        for (const c of candidates) {
            let isDuplicate = false;
            for (const u of uniqueCandidates) {
                // If parameters are within 5% of each other, consider it a duplicate
                const diffEr = Math.abs(c.epsilon_r - u.epsilon_r) / u.epsilon_r;
                const diffL = Math.abs(c.layers - u.layers) / u.layers;
                if (diffEr < 0.05 && diffL < 0.05) {
                    isDuplicate = true;
                    break;
                }
            }
            if (!isDuplicate) uniqueCandidates.push(c);
            if (uniqueCandidates.length >= 3) break;
        }

        if (uniqueCandidates.length === 0) {
            return NextResponse.json({ error: "Optimization failed to find any valid candidates." }, { status: 500 });
        }

        if (uniqueCandidates[0].distanceToTarget > (tolerancePct / 100)) {
            return NextResponse.json({ 
                error: `Best candidate was ${(uniqueCandidates[0].distanceToTarget * 100).toFixed(1)}% off target (tolerance: ${tolerancePct}%). Try relaxing tolerance.`,
                candidates: uniqueCandidates,
                history
            }, { status: 400 });
        }

        return NextResponse.json({ candidates: uniqueCandidates, history });
    } catch (err) {
        console.error("Suggest Error:", err);
        return NextResponse.json({ error: "Optimization failed" }, { status: 500 });
    }
}
