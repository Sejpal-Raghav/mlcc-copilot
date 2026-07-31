import os
import numpy as np
import pandas as pd
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
from sklearn.preprocessing import StandardScaler
import json

# Physical constants
EPSILON_0 = 8.854e-12

class MLCCPINNDataset(Dataset):
    def __init__(self, df, feature_scaler=None, target_scaler=None, fit_scalers=False):
        self.features = df[['epsilon_r', 'layers', 'area', 'thickness', 'v_bias', 'temperature']].values
        self.targets = df[['capacitance', 'resonant_frequency', 'esr']].values
        
        # We need log scale for target variables due to order of magnitude differences
        self.targets_log = np.log10(self.targets)
        
        if fit_scalers:
            self.feature_scaler = StandardScaler()
            self.target_scaler = StandardScaler()
            self.features_scaled = self.feature_scaler.fit_transform(self.features)
            self.targets_scaled = self.target_scaler.fit_transform(self.targets_log)
        else:
            self.feature_scaler = feature_scaler
            self.target_scaler = target_scaler
            self.features_scaled = self.feature_scaler.transform(self.features)
            self.targets_scaled = self.target_scaler.transform(self.targets_log)
            
        self.features_scaled = torch.tensor(self.features_scaled, dtype=torch.float32)
        self.targets_scaled = torch.tensor(self.targets_scaled, dtype=torch.float32)
        
    def __len__(self):
        return len(self.features)
        
    def __getitem__(self, idx):
        return self.features_scaled[idx], self.targets_scaled[idx], torch.tensor(self.features[idx], dtype=torch.float32)

class MLCCPINN(nn.Module):
    def __init__(self, feature_scaler_mean, feature_scaler_scale, target_scaler_mean, target_scaler_scale):
        super().__init__()
        
        # Save scaler stats as buffers so they are exported with ONNX
        self.register_buffer('feat_mean', torch.tensor(feature_scaler_mean, dtype=torch.float32))
        self.register_buffer('feat_scale', torch.tensor(feature_scaler_scale, dtype=torch.float32))
        
        self.register_buffer('tgt_mean', torch.tensor(target_scaler_mean, dtype=torch.float32))
        self.register_buffer('tgt_scale', torch.tensor(target_scaler_scale, dtype=torch.float32))
        
        # MLP for predicting non-ideal residuals
        # Inputs: 6 scaled features
        # Outputs: 3 scaled target residuals
        self.mlp = nn.Sequential(
            nn.Linear(6, 64),
            nn.SiLU(), # Smooth activation, good for PINNs
            nn.Linear(64, 64),
            nn.SiLU(),
            nn.Linear(64, 32),
            nn.SiLU(),
            nn.Linear(32, 3)
        )
        
        # We add dropout for MC Dropout uncertainty estimation in production
        self.dropout = nn.Dropout(p=0.1)
        
    def forward(self, x_scaled):
        # x_scaled is shape (batch, 6)
        # Features: [epsilon_r, layers, area, thickness, v_bias, temperature]
        
        # Unscale features to compute ideal physics
        x_raw = x_scaled * self.feat_scale + self.feat_mean
        
        epsilon_r = x_raw[:, 0]
        layers = x_raw[:, 1]
        area = x_raw[:, 2]
        thickness = x_raw[:, 3]
        
        # Physics Branch: C_ideal = e0 * er * A * N / d
        c_ideal = EPSILON_0 * epsilon_r * area * layers / thickness
        
        # Estimate nominal ESL and ESR just for baseline
        electrode_len = torch.sqrt(area)
        esl_ideal = 0.5e-9 + 1.5e-9 * (electrode_len / torch.sqrt(torch.tensor(25e-6))) * (1 + 0.05 * layers / 100)
        f_res_ideal = 1.0 / (2 * np.pi * torch.sqrt(c_ideal * esl_ideal))
        
        # Nominal ESR
        rho_electrode = 2e-8
        r_electrode = rho_electrode * layers / area * thickness
        tan_delta = 0.001 + 0.02 * (epsilon_r - 500) / 9500
        r_dielectric = tan_delta / (2 * np.pi * 1e6 * c_ideal)
        esr_ideal = r_electrode + r_dielectric
        
        # Stack ideal predictions (log10 space)
        targets_ideal_log = torch.stack([
            torch.log10(c_ideal),
            torch.log10(f_res_ideal),
            torch.log10(esr_ideal)
        ], dim=1)
        
        # Scale ideal targets to match MLP output scale
        targets_ideal_scaled = (targets_ideal_log - self.tgt_mean) / self.tgt_scale
        
        # Residual Branch: Neural network predicts deviation from ideal
        mlp_features = x_scaled
        
        # Apply dropout even during inference if we want MC Dropout, 
        # but for standard ONNX export we typically turn it off. 
        # The frontend can just run batch inference.
        x_out = self.mlp[0](mlp_features)
        x_out = self.mlp[1](x_out)
        x_out = self.dropout(x_out)
        x_out = self.mlp[2](x_out)
        x_out = self.mlp[3](x_out)
        x_out = self.dropout(x_out)
        x_out = self.mlp[4](x_out)
        x_out = self.mlp[5](x_out)
        residual_scaled = self.mlp[6](x_out)
        
        # Final output = Ideal + Residual (in scaled space)
        # The network just learns the correction factor
        y_scaled = targets_ideal_scaled + residual_scaled
        
        return y_scaled

def train_and_export():
    data_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'mlcc_pinn_dataset.csv')
    df = pd.read_csv(data_path)
    
    # Shuffle and split
    df = df.sample(frac=1.0, random_state=42).reset_index(drop=True)
    train_size = int(0.8 * len(df))
    df_train = df.iloc[:train_size]
    df_val = df.iloc[train_size:]
    
    train_dataset = MLCCPINNDataset(df_train, fit_scalers=True)
    val_dataset = MLCCPINNDataset(df_val, 
                                  feature_scaler=train_dataset.feature_scaler,
                                  target_scaler=train_dataset.target_scaler)
                                  
    train_loader = DataLoader(train_dataset, batch_size=256, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=1024, shuffle=False)
    
    # Save scalers for frontend
    scalers = {
        'feature_mean': train_dataset.feature_scaler.mean_.tolist(),
        'feature_scale': train_dataset.feature_scaler.scale_.tolist(),
        'target_mean': train_dataset.target_scaler.mean_.tolist(),
        'target_scale': train_dataset.target_scaler.scale_.tolist()
    }
    
    scaler_path = os.path.join(os.path.dirname(__file__), '..', '..', 'app', 'models', 'pinn_scalers.json')
    with open(scaler_path, 'w') as f:
        json.dump(scalers, f)
        
    print(f"Saved scalers to {scaler_path}")
    
    model = MLCCPINN(
        train_dataset.feature_scaler.mean_,
        train_dataset.feature_scaler.scale_,
        train_dataset.target_scaler.mean_,
        train_dataset.target_scaler.scale_
    )
    
    optimizer = optim.Adam(model.parameters(), lr=0.002)
    scheduler = optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode='min', factor=0.5, patience=5)
    criterion = nn.MSELoss()
    
    epochs = 40
    best_val_loss = float('inf')
    
    print("Training PINN...")
    for epoch in range(epochs):
        model.train()
        train_loss = 0.0
        for x_scaled, y_scaled, _ in train_loader:
            optimizer.zero_grad()
            y_pred = model(x_scaled)
            loss = criterion(y_pred, y_scaled)
            loss.backward()
            optimizer.step()
            train_loss += loss.item()
            
        model.eval()
        val_loss = 0.0
        with torch.no_grad():
            for x_scaled, y_scaled, _ in val_loader:
                y_pred = model(x_scaled)
                loss = criterion(y_pred, y_scaled)
                val_loss += loss.item()
                
        train_loss /= len(train_loader)
        val_loss /= len(val_loader)
        scheduler.step(val_loss)
        
        if val_loss < best_val_loss:
            best_val_loss = val_loss
            # Save best weights
            torch.save(model.state_dict(), "best_pinn.pt")
            
        print(f"Epoch {epoch+1:02d}/{epochs} | Train Loss: {train_loss:.4f} | Val Loss: {val_loss:.4f}")
        
    print("Training complete.")
    
    # Load best weights for export
    model.load_state_dict(torch.load("best_pinn.pt"))
    model.eval()
    
    # ONNX Export
    # We want to export a version of the model that directly takes raw features
    # and outputs raw predictions, embedding the scalers inside.
    
    class ExportWrapper(nn.Module):
        def __init__(self, pinn_model):
            super().__init__()
            self.pinn = pinn_model
            
        def forward(self, x_raw):
            # Input shape: (batch_size, 6)
            # 1. Scale features
            x_scaled = (x_raw - self.pinn.feat_mean) / self.pinn.feat_scale
            
            # 2. Forward pass through PINN (gets scaled log10 outputs)
            y_scaled = self.pinn(x_scaled)
            
            # 3. Unscale targets
            y_log = y_scaled * self.pinn.tgt_scale + self.pinn.tgt_mean
            
            # 4. Exponentiate back to linear space
            y_raw = torch.pow(10.0, y_log)
            
            return y_raw
            
    export_model = ExportWrapper(model)
    export_model.eval()
    
    # Create dummy input: batch of 1, 6 features
    dummy_input = torch.tensor([[1000.0, 100.0, 1e-5, 10e-6, 25.0, 25.0]], dtype=torch.float32)
    
    onnx_path = os.path.join(os.path.dirname(__file__), '..', '..', 'app', 'models', 'onnx', 'pinn_surrogate.onnx')
    
    torch.onnx.export(
        export_model,
        dummy_input,
        onnx_path,
        export_params=True,
        opset_version=14,
        do_constant_folding=True,
        input_names=['features'],
        output_names=['predictions'],
        dynamic_axes={'features': {0: 'batch_size'}, 'predictions': {0: 'batch_size'}}
    )
    
    print(f"Exported PINN to ONNX: {onnx_path}")
    
if __name__ == "__main__":
    train_and_export()
