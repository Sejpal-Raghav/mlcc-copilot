import cv2
import numpy as np
import os
import random

def create_base_surface(width, height):
    # Base grayish surface
    img = np.ones((height, width, 3), dtype=np.uint8) * 200
    
    # Add some noise for realism
    noise = np.random.normal(0, 10, (height, width, 3)).astype(np.int16)
    img = np.clip(img.astype(np.int16) + noise, 0, 255).astype(np.uint8)
    
    # Draw some horizontal layer lines to simulate MLCC structure
    num_layers = random.randint(10, 20)
    spacing = height // num_layers
    for i in range(1, num_layers):
        y = i * spacing
        cv2.line(img, (0, y), (width, y), (150, 150, 150), 1)
        
    return img

def add_scratch(img):
    x1, y1 = random.randint(0, img.shape[1]), random.randint(0, img.shape[0])
    x2, y2 = x1 + random.randint(-50, 50), y1 + random.randint(-50, 50)
    cv2.line(img, (x1, y1), (x2, y2), (50, 50, 50), random.randint(1, 3))
    return img, "scratch"

def add_chip(img):
    # Chip usually at the corners or edges
    x = random.choice([0, img.shape[1]])
    y = random.choice([0, img.shape[0]])
    pts = np.array([[x, y], [x + random.randint(-40, 40), y], [x, y + random.randint(-40, 40)]])
    cv2.fillPoly(img, [pts], (255, 255, 255))
    return img, "chip"

def add_void(img):
    x = random.randint(20, img.shape[1] - 20)
    y = random.randint(20, img.shape[0] - 20)
    r = random.randint(5, 15)
    cv2.circle(img, (x, y), r, (0, 0, 0), -1)
    return img, "void"

def generate_defect_images(out_dir, num_samples=1000):
    os.makedirs(os.path.join(out_dir, "clean"), exist_ok=True)
    os.makedirs(os.path.join(out_dir, "scratch"), exist_ok=True)
    os.makedirs(os.path.join(out_dir, "chip"), exist_ok=True)
    os.makedirs(os.path.join(out_dir, "void"), exist_ok=True)
    
    width, height = 256, 256
    
    for i in range(num_samples):
        img = create_base_surface(width, height)
        
        defect_type = random.choice(["clean", "scratch", "chip", "void"])
        
        if defect_type == "scratch":
            img, _ = add_scratch(img)
        elif defect_type == "chip":
            img, _ = add_chip(img)
        elif defect_type == "void":
            img, _ = add_void(img)
            
        cv2.imwrite(os.path.join(out_dir, defect_type, f"img_{i}.png"), img)
        
    print(f"Generated {num_samples} images in {out_dir}")

if __name__ == "__main__":
    out_dir = os.path.join(os.path.dirname(__file__), "images")
    generate_defect_images(out_dir, 1000)
