import * as ort from 'onnxruntime-node';
import path from 'path';

// Suppress shape mismatch warnings (skl2onnx multi-output regressor quirk)
ort.env.logLevel = 'error';

let surrogateSession: ort.InferenceSession | null = null;
let oodSession: ort.InferenceSession | null = null;
let inspectorSession: ort.InferenceSession | null = null;

// Initialize models once at module scope
async function initModels() {
    try {
        const modelsDir = path.join(process.cwd(), 'models', 'onnx');
        const sessionOpts: ort.InferenceSession.SessionOptions = { logSeverityLevel: 3 };
        
        console.log("Loading ONNX models...");
        surrogateSession = await ort.InferenceSession.create(path.join(modelsDir, 'surrogate.onnx'), sessionOpts);
        oodSession = await ort.InferenceSession.create(path.join(modelsDir, 'ood_checker.onnx'), sessionOpts);
        inspectorSession = await ort.InferenceSession.create(path.join(modelsDir, 'inspector.onnx'), sessionOpts);
        console.log("Models loaded successfully.");
    } catch (err) {
        console.error("Failed to load ONNX models. Server cannot start properly.", err);
        process.exit(1);
    }
}

// Export promise so consumers can await model loading
export const modelsReady = initModels();

export interface PredictPerformanceResult {
    capacitance: number;
    resonantFrequency: number;
    esr: number;
    passFail: boolean;
    marginPct: number;
    confidence: 'high' | 'low';
}

export async function predictPerformance(
    epsilon_r: number, layers: number, area: number, thickness: number, 
    targetCapacitance?: number, tolerancePct?: number
): Promise<PredictPerformanceResult> {
    await modelsReady;
    if (!surrogateSession || !oodSession) {
        throw new Error("Models not loaded");
    }

    const inputData = Float32Array.from([epsilon_r, layers, area, thickness]);
    const tensor = new ort.Tensor('float32', inputData, [1, 4]);
    
    // Surrogate prediction
    const feeds = { float_input: tensor };
    const results = await surrogateSession.run(feeds);
    const outputData = results[surrogateSession.outputNames[0]].data as Float32Array;
    
    const cap = outputData[0];
    const freq = outputData[1];
    const esr = outputData[2];
    
    // OOD prediction
    const oodResults = await oodSession.run(feeds);
    // IsolationForest in scikit-learn outputs 1 for inliers, -1 for outliers
    const oodLabel = oodResults[oodSession.outputNames[0]].data[0];
    const confidence = oodLabel === -1 ? 'low' : 'high';
    
    let passFail = false;
    let marginPct = 0;
    
    if (targetCapacitance && tolerancePct) {
        const deviationPct = Math.abs(cap - targetCapacitance) / targetCapacitance * 100;
        passFail = deviationPct <= tolerancePct;
        marginPct = tolerancePct - deviationPct;
    }
    
    return {
        capacitance: cap,
        resonantFrequency: freq,
        esr: esr,
        passFail,
        marginPct,
        confidence
    };
}

/**
 * Batch inference: runs a single ONNX forward pass for N inputs.
 * Returns only capacitance values (for search ranking).
 * Skips OOD check entirely — irrelevant for candidate ranking.
 */
export async function batchPredictCapacitance(
    inputs: Array<[number, number, number, number]>
): Promise<Float32Array> {
    await modelsReady;
    if (!surrogateSession) {
        throw new Error("Surrogate model not loaded");
    }

    const n = inputs.length;
    const flat = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
        flat[i * 4 + 0] = inputs[i][0];
        flat[i * 4 + 1] = inputs[i][1];
        flat[i * 4 + 2] = inputs[i][2];
        flat[i * 4 + 3] = inputs[i][3];
    }

    const tensor = new ort.Tensor('float32', flat, [n, 4]);
    const results = await surrogateSession.run({ float_input: tensor });
    const outputData = results[surrogateSession.outputNames[0]].data as Float32Array;

    // Output shape is [n, 3] (cap, freq, esr). Extract just capacitance (index 0 of each row).
    const capacitances = new Float32Array(n);
    for (let i = 0; i < n; i++) {
        capacitances[i] = outputData[i * 3];
    }
    return capacitances;
}

export async function inspectImageCNN(floatArray: Float32Array) {
    await modelsReady;
    if (!inspectorSession) {
        throw new Error("Inspector model not loaded");
    }
    
    // The CNN expects shape [1, 1, 128, 128]
    const tensor = new ort.Tensor('float32', floatArray, [1, 1, 128, 128]);
    const feeds = { float_input: tensor };
    
    const results = await inspectorSession.run(feeds);
    const probsData = results[inspectorSession.outputNames[0]].data as Float32Array;
    
    // Find the max probability
    let maxProb = -1;
    let predictedClassIdx = -1;
    for (let i = 0; i < probsData.length; i++) {
        if (probsData[i] > maxProb) {
            maxProb = probsData[i];
            predictedClassIdx = i;
        }
    }
    
    const defectClasses = ["clean", "scratch", "chip", "void"];
    const defectType = defectClasses[predictedClassIdx];
    
    return {
        defect: defectType !== 'clean',
        defectType: defectType === 'clean' ? null : defectType,
        confidence: maxProb,
        features: ["Using CNN Pixel Inference - No manual features"]
    };
}
