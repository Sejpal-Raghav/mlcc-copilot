const ort = require('onnxruntime-node');
const path = require('path');

async function testBatch() {
    const modelsDir = path.join(process.cwd(), 'models', 'onnx');
    const session = await ort.InferenceSession.create(path.join(modelsDir, 'surrogate.onnx'));
    
    // Create 5 identical inputs that should give ~1e-9
    // C ≈ 8.854e-12 * 1000 * 1e-5 * 100 / 1e-5 = 8.85e-7
    // Let's use:
    // eps = 1000, layers = 100, area = 1e-5, thick = 1e-5
    const inputs = [
        [1000, 100, 1e-5, 1e-5],
        [1000, 100, 1e-5, 1e-5],
        [1000, 100, 1e-5, 1e-5],
        [1000, 100, 1e-5, 1e-5],
        [1000, 100, 1e-5, 1e-5]
    ];
    
    const n = inputs.length;
    const flat = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
        flat[i * 4 + 0] = inputs[i][0];
        flat[i * 4 + 1] = inputs[i][1];
        flat[i * 4 + 2] = inputs[i][2];
        flat[i * 4 + 3] = inputs[i][3];
    }
    
    const tensor = new ort.Tensor('float32', flat, [n, 4]);
    const results = await session.run({ float_input: tensor });
    const outputData = results[session.outputNames[0]].data;
    
    console.log("Shape:", results[session.outputNames[0]].dims);
    console.log("Data length:", outputData.length);
    for (let i = 0; i < n; i++) {
        console.log(`Cap ${i}:`, outputData[i * 3]);
    }
}

testBatch().catch(console.error);
