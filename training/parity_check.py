import onnxruntime as rt
import numpy as np
import os

model_path = os.path.join(os.path.dirname(__file__), '..', 'app', 'models', 'onnx', 'surrogate.onnx')
sess = rt.InferenceSession(model_path)

input_name = sess.get_inputs()[0].name
input_data = np.array([[1000.0, 100.0, 10e-6, 10e-6]], dtype=np.float32)

pred_onnx = sess.run(None, {input_name: input_data})[0]
print("ONNX Runtime (Python) Predictions:")
print(f"Capacitance: {pred_onnx[0][0]}")
print(f"Resonant Freq: {pred_onnx[0][1]}")
print(f"ESR: {pred_onnx[0][2]}")
