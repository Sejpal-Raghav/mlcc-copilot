import sys
import json
from extract_features import extract_features

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No image path provided"}))
        sys.exit(1)
        
    img_path = sys.argv[1]
    feats = extract_features(img_path)
    if feats is None:
        print(json.dumps({"error": "Failed to extract features"}))
        sys.exit(1)
        
    print(json.dumps({"features": feats}))
