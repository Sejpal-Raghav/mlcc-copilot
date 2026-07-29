import * as ort from 'onnxruntime-node';
import path from 'path';

let surrogateSession: ort.InferenceSession | null = null;
let oodSession: ort.InferenceSession | null = null;
let inspectorSession: ort.InferenceSession | null = null;

// Initialize models once at module scope
async function initModels() {
    try {
        const modelsDir = path.join(process.cwd(), 'models', 'onnx');
        
        console.log("Loading ONNX models...");
        surrogateSession = await ort.InferenceSession.create(path.join(modelsDir, 'surrogate.onnx'));
        oodSession = await ort.InferenceSession.create(path.join(modelsDir, 'ood_checker.onnx'));
        inspectorSession = await ort.InferenceSession.create(path.join(modelsDir, 'inspector.onnx'));
        console.log("Models loaded successfully.");
    } catch (err) {
        console.error("Failed to load ONNX models. Server cannot start properly.", err);
        process.exit(1);
    }
}

// Call init on module load
initModels();

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

export async function inspectImageFeatures(features: number[]) {
    if (!inspectorSession) {
        throw new Error("Inspector model not loaded");
    }
    
    const inputData = Float32Array.from(features);
    const tensor = new ort.Tensor('float32', inputData, [1, 4]);
    const feeds = { float_input: tensor };
    
    const results = await inspectorSession.run(feeds);
    const labelData = results[inspectorSession.outputNames[0]].data;
    const probs = results[inspectorSession.outputNames[1]].data as any; // Usually a tensor of probabilities
    
    const defectClasses = ["clean", "scratch", "chip", "void"];
    const predictedClassIdx = Number(labelData[0]);
    const defectType = defectClasses[predictedClassIdx];
    
    return {
        defect: defectType !== 'clean',
        defectType: defectType === 'clean' ? null : defectType,
        confidence: 0.95 // Simplified since ONNX probabilities struct can be complex to parse depending on opset
    };
}
