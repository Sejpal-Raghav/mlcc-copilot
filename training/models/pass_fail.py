def evaluate_pass_fail(predicted_value: float, target_value: float, tolerance_pct: float) -> dict:
    """
    Evaluates whether a predicted performance metric meets the required specification.
    
    Args:
        predicted_value (float): The predicted value from the surrogate model.
        target_value (float): The target specification.
        tolerance_pct (float): Acceptable tolerance as a percentage (e.g. 5.0 for 5%).
        
    Returns:
        dict: {'pass': bool, 'margin_pct': float}
    """
    if target_value == 0:
        raise ValueError("Target value cannot be zero.")
        
    deviation_pct = abs(predicted_value - target_value) / target_value * 100
    
    margin_pct = tolerance_pct - deviation_pct
    
    return {
        'pass': deviation_pct <= tolerance_pct,
        'margin_pct': margin_pct
    }

if __name__ == "__main__":
    # Simple test
    result = evaluate_pass_fail(1.02e-9, 1.0e-9, 5.0)
    print(f"Test 1 (Pass expected): {result}")
    
    result2 = evaluate_pass_fail(1.08e-9, 1.0e-9, 5.0)
    print(f"Test 2 (Fail expected): {result2}")
