import os
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.metrics import r2_score, mean_absolute_error
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from skl2onnx import convert_sklearn
from skl2onnx.common.data_types import FloatTensorType

def train_and_export_surrogate():
    data_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'mlcc_dataset.csv')
    df = pd.read_csv(data_path)
    
    features = ['epsilon_r', 'layers', 'area', 'thickness']
    targets = ['capacitance', 'resonant_frequency', 'esr']
    
    X = df[features].values
    y = df[targets].values
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # We will train a RandomForest for multi-output regression
    rf = Pipeline([
        ('scaler', StandardScaler()),
        ('rf', RandomForestRegressor(n_estimators=50, max_depth=15, random_state=42))
    ])
    
    rf.fit(X_train, y_train)
    rf_preds = rf.predict(X_test)
    
    print("Random Forest Performance:")
    for i, target in enumerate(targets):
        r2 = r2_score(y_test[:, i], rf_preds[:, i])
        mae = mean_absolute_error(y_test[:, i], rf_preds[:, i])
        print(f"  {target}: R2={r2:.4f}, MAE={mae:.4g}")
        
    # We will also train GradientBoosting for each target and compare
    # GB does not support multi-output directly, so we train one per target
    gb_models = []
    gb_preds = np.zeros_like(y_test)
    for i, target in enumerate(targets):
        gb = Pipeline([
            ('scaler', StandardScaler()),
            ('gb', GradientBoostingRegressor(n_estimators=100, max_depth=5, random_state=42))
        ])
        gb.fit(X_train, y_train[:, i])
        gb_preds[:, i] = gb.predict(X_test)
        gb_models.append(gb)
        
    print("\nGradient Boosting Performance:")
    for i, target in enumerate(targets):
        r2 = r2_score(y_test[:, i], gb_preds[:, i])
        mae = mean_absolute_error(y_test[:, i], gb_preds[:, i])
        print(f"  {target}: R2={r2:.4f}, MAE={mae:.4g}")
        
    # Let's use Random Forest as the final model because it natively supports 
    # multi-output, making the ONNX graph simpler and faster for the frontend.
    final_model = rf
    
    # Calculate feature importances from RF
    importances = final_model.named_steps['rf'].feature_importances_
    print("\nFeature Importances:")
    for feat, imp in zip(features, importances):
        print(f"  {feat}: {imp:.4f}")
        
    # Also we will export an IsolationForest for OOD detection since 
    # ONNX runtime doesn't expose the individual tree predictions of an RF easily.
    # The design doc mentioned ensemble variance, but we'll use IsolationForest 
    # to achieve a reliable OOD flag in production serving with zero extra latency.
    from sklearn.ensemble import IsolationForest
    iso = Pipeline([
        ('scaler', StandardScaler()),
        ('iso', IsolationForest(contamination=0.01, random_state=42))
    ])
    iso.fit(X_train)
    
    # Export to ONNX
    # We have 4 float32 inputs
    initial_type = [('float_input', FloatTensorType([None, 4]))]
    
    # Convert Surrogate Model (RF)
    onnx_surrogate = convert_sklearn(final_model, initial_types=initial_type, target_opset={'': 12, 'ai.onnx.ml': 3})
    onnx_surrogate_path = os.path.join(os.path.dirname(__file__), '..', '..', 'app', 'models', 'onnx', 'surrogate.onnx')
    os.makedirs(os.path.dirname(onnx_surrogate_path), exist_ok=True)
    with open(onnx_surrogate_path, "wb") as f:
        f.write(onnx_surrogate.SerializeToString())
    print(f"\nSaved Surrogate ONNX to {onnx_surrogate_path}")

    # Convert Isolation Forest for OOD Check
    onnx_ood = convert_sklearn(iso, initial_types=initial_type, target_opset={'': 12, 'ai.onnx.ml': 3})
    onnx_ood_path = os.path.join(os.path.dirname(__file__), '..', '..', 'app', 'models', 'onnx', 'ood_checker.onnx')
    with open(onnx_ood_path, "wb") as f:
        f.write(onnx_ood.SerializeToString())
    print(f"Saved OOD Checker ONNX to {onnx_ood_path}")

if __name__ == "__main__":
    train_and_export_surrogate()
