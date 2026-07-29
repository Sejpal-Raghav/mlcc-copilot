const ort = require('onnxruntime-node');
const path = require('path');

async function runParityCheck() {
    const modelPath = path.join(__dirname, 'models', 'onnx', 'surrogate.onnx');
    const session = await ort.InferenceSession.create(modelPath);

    // Test input: epsilon_r=1000, layers=100, area=10e-6, thickness=10e-6
    const inputData = Float32Array.from([1000, 100, 10e-6, 10e-6]);
    const tensor = new ort.Tensor('float32', inputData, [1, 4]);
    
    const feeds = { float_input: tensor };
    const results = await session.run(feeds);
    
    console.log("ONNX Runtime (Node.js) Predictions:");
    const outputData = results[session.outputNames[0]].data;
    console.log(`Capacitance: ${outputData[0]}`);
    console.log(`Resonant Freq: ${outputData[1]}`);
    console.log(`ESR: ${outputData[2]}`);
}

runParityCheck().catch(console.error);
