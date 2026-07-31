import os
import random
import cv2
import matplotlib.pyplot as plt

def create_qa_grids(data_dir, output_dir, grid_size=(4, 4), seed=42):
    random.seed(seed)
    os.makedirs(output_dir, exist_ok=True)
    
    classes = ["clean", "scratch", "chip", "void"]
    rows, cols = grid_size
    num_samples = rows * cols
    
    for cls in classes:
        cls_dir = os.path.join(data_dir, cls)
        if not os.path.exists(cls_dir):
            print(f"Skipping {cls}: Directory '{cls_dir}' not found.")
            continue
            
        # Grab all image files
        images = [f for f in os.listdir(cls_dir) if f.endswith(('.png', '.jpg'))]
        
        if len(images) < num_samples:
            print(f"Warning: Only {len(images)} images found in {cls}. Need {num_samples} for a full grid.")
            sampled_imgs = images
        else:
            sampled_imgs = random.sample(images, num_samples)
            
        # Set up the matplotlib figure
        fig, axes = plt.subplots(rows, cols, figsize=(cols * 3, rows * 3))
        fig.suptitle(f"QA Grid: {cls.capitalize()} Class", fontsize=20, y=1.02)
        
        for i, ax in enumerate(axes.flat):
            if i < len(sampled_imgs):
                img_path = os.path.join(cls_dir, sampled_imgs[i])
                img = cv2.imread(img_path)
                
                if img is not None:
                    # OpenCV loads as BGR, Matplotlib expects RGB
                    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
                    ax.imshow(img_rgb)
            
            # Hide axes ticks and labels for a clean grid
            ax.axis('off')
            
        plt.tight_layout()
        out_file = os.path.join(output_dir, f"qa_grid_{cls}.png")
        plt.savefig(out_file, dpi=150, bbox_inches='tight')
        plt.close(fig)
        
        print(f"Saved {cls} QA grid to {out_file}")

if __name__ == "__main__":
    # Point this to the output directory of your generator script
    base_dir = os.path.dirname(os.path.abspath(__file__))
    data_dir = os.path.join(base_dir, "images")
    output_dir = os.path.join(base_dir, "qa_grids")
    
    print(f"Reading images from: {data_dir}")
    create_qa_grids(data_dir, output_dir)
