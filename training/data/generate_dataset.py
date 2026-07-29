import os
import numpy as np
import pandas as pd

def generate_mlcc_data(num_samples=10000, random_seed=42):
    np.random.seed(random_seed)
    
    # Constants
    epsilon_0 = 8.854e-12  # F/m
    L_fixed = 1e-9         # 1 nH equivalent series inductance
    
    # Input Feature Sampling
    # epsilon_r: Relative permittivity (dielectric constant), e.g. for Class II ceramics
    epsilon_r = np.random.uniform(500, 10000, num_samples)
    
    # layers (N): Number of layers
    layers = np.random.randint(10, 501, num_samples)
    
    # area (A): Overlap area in m^2. Range: 1mm^2 to 25mm^2 (1e-6 to 25e-6 m^2)
    area = np.random.uniform(1e-6, 25e-6, num_samples)
    
    # thickness (d): Dielectric thickness in m. Range: 1um to 50um (1e-6 to 50e-6 m)
    thickness = np.random.uniform(1e-6, 50e-6, num_samples)
    
    # ---------------------------
    # Physical Formulas
    # ---------------------------
    # 1. Ideal Capacitance (Farads)
    C_ideal = (epsilon_0 * epsilon_r * (layers - 1) * area) / thickness
    
    # Derating term: performance saturation at high layer counts
    # This injects a specific non-linearity into the dataset
    derating_factor = np.exp(-layers * 0.001)
    
    # Add Gaussian noise (simulating manufacturing variance)
    # Noise standard deviation is 5% of the derated value
    noise = np.random.normal(0, 0.05, num_samples)
    
    C_actual = C_ideal * derating_factor * (1 + noise)
    
    # 2. Equivalent Series Resistance (ESR) in Ohms
    # ESR generally decreases with more layers (in parallel) and larger area
    # Base ESR + resistance proportional to (thickness / (area * layers))
    # We add a small baseline and noise
    esr_ideal = 0.005 + 1e-4 * (thickness / (area * layers))
    esr_noise = np.random.normal(0, 0.001, num_samples)
    esr_actual = np.maximum(esr_ideal + esr_noise, 0.001) # floor at 1mOhm
    
    # 3. Resonant Frequency (Hz)
    # SRF = 1 / (2 * pi * sqrt(L * C))
    # We use actual C to compute SRF so it correlates properly
    srf_ideal = 1 / (2 * np.pi * np.sqrt(L_fixed * C_actual))
    srf_noise = np.random.normal(0, 0.02, num_samples)
    srf_actual = srf_ideal * (1 + srf_noise)
    
    # Assemble DataFrame
    df = pd.DataFrame({
        'epsilon_r': epsilon_r,
        'layers': layers,
        'area': area,
        'thickness': thickness,
        'capacitance': C_actual,
        'resonant_frequency': srf_actual,
        'esr': esr_actual
    })
    
    return df

if __name__ == "__main__":
    out_dir = os.path.dirname(os.path.abspath(__file__))
    out_path = os.path.join(out_dir, "mlcc_dataset.csv")
    
    print("Generating synthetic MLCC dataset...")
    df = generate_mlcc_data(10000)
    
    print(f"Dataset generated with {len(df)} rows.")
    print("\nFeature Summaries:")
    print(df.describe())
    
    df.to_csv(out_path, index=False)
    print(f"\nSaved dataset to {out_path}")
