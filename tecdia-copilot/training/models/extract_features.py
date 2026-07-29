import cv2
import numpy as np
import os
import glob
from sklearn.model_selection import train_test_split
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.metrics import confusion_matrix, classification_report
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from skl2onnx import convert_sklearn
from skl2onnx.common.data_types import FloatTensorType
import pickle

def extract_features(img_path):
    img = cv2.imread(img_path, cv2.IMREAD_GRAYSCALE)
    if img is None:
        return None
        
    # Edge density
    edges = cv2.Canny(img, 50, 150)
    edge_density = np.sum(edges > 0) / (img.shape[0] * img.shape[1])
    
    # Contours
    # Thresholding to find dark/light spots
    _, thresh = cv2.threshold(img, 127, 255, cv2.THRESH_BINARY_INV)
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    contour_count = len(contours)
    
    if contour_count > 0:
        areas = [cv2.contourArea(c) for c in contours]
        contour_area_var = np.var(areas)
        contour_area_max = np.max(areas)
    else:
        contour_area_var = 0.0
        contour_area_max = 0.0
        
    return [edge_density, contour_count, contour_area_var, contour_area_max]

def train_inspector():
    data_dir = os.path.join(os.path.dirname(__file__), "..", "data", "images")
    
    X = []
    y = []
    classes = ["clean", "scratch", "chip", "void"]
    class_map = {c: i for i, c in enumerate(classes)}
    
    print("Extracting features from images...")
    for cls in classes:
        paths = glob.glob(os.path.join(data_dir, cls, "*.png"))
        for p in paths:
            feats = extract_features(p)
            if feats is not None:
                X.append(feats)
                # Binary classification: 0 for clean, 1 for defect
                # Wait, the prompt says "defect verdict, confidence, and defect type"
                # So we can do multi-class or binary. Let's do multi-class
                # We can map back the prediction later.
                y.append(class_map[cls])
                
    X = np.array(X, dtype=np.float32)
    y = np.array(y, dtype=np.int64)
    
    if len(X) == 0:
        print("No images found. Run generate_images.py first.")
        return
        
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    gb = Pipeline([
        ('scaler', StandardScaler()),
        ('gb', GradientBoostingClassifier(n_estimators=100, random_state=42))
    ])
    
    gb.fit(X_train, y_train)
    y_pred = gb.predict(X_test)
    
    print("\nConfusion Matrix:")
    print(confusion_matrix(y_test, y_pred))
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, target_names=classes))
    
    # Export to ONNX
    initial_type = [('float_input', FloatTensorType([None, 4]))]
    onnx_model = convert_sklearn(gb, initial_types=initial_type, target_opset={'': 12, 'ai.onnx.ml': 3})
    
    onnx_path = os.path.join(os.path.dirname(__file__), '..', '..', 'app', 'models', 'onnx', 'inspector.onnx')
    with open(onnx_path, "wb") as f:
        f.write(onnx_model.SerializeToString())
    print(f"\nSaved Inspector ONNX to {onnx_path}")
    
if __name__ == "__main__":
    train_inspector()
