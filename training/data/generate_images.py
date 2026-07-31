import cv2
import numpy as np
import os
import random
import csv


def create_base_surface(width, height, rng, py_rng):
    img = np.ones((height, width, 3), dtype=np.uint8) * 200

    noise = rng.normal(0, 10, (height, width, 3)).astype(np.int16)
    img = np.clip(img.astype(np.int16) + noise, 0, 255).astype(np.uint8)

    num_layers = py_rng.randint(10, 20)
    spacing = height // num_layers
    for i in range(1, num_layers):
        y = i * spacing
        cv2.line(img, (0, y), (width, y), (150, 150, 150), 1, lineType=cv2.LINE_AA)

    return img, num_layers


def add_scratch(img, py_rng):
    x1, y1 = py_rng.randint(0, img.shape[1]), py_rng.randint(0, img.shape[0])
    x2, y2 = x1 + py_rng.randint(-50, 50), y1 + py_rng.randint(-50, 50)
    cv2.line(img, (x1, y1), (x2, y2), (50, 50, 50), py_rng.randint(1, 3))
    return img, {"type": "scratch", "x1": x1, "y1": y1, "x2": x2, "y2": y2}


def add_chip(img, py_rng):
    height, width = img.shape[0], img.shape[1]

    # Pick an anchor anywhere along an edge (not just the 4 corners), and
    # bias the offset direction *inward* so the resulting triangle stays
    # on-canvas instead of being silently clipped/shrunk.
    edge = py_rng.choice(["top", "bottom", "left", "right"])
    if edge == "top":
        x, y = py_rng.randint(0, width), 0
        dx_sign, dy_sign = py_rng.choice([-1, 1]), 1
    elif edge == "bottom":
        x, y = py_rng.randint(0, width), height
        dx_sign, dy_sign = py_rng.choice([-1, 1]), -1
    elif edge == "left":
        x, y = 0, py_rng.randint(0, height)
        dx_sign, dy_sign = 1, py_rng.choice([-1, 1])
    else:  # right
        x, y = width, py_rng.randint(0, height)
        dx_sign, dy_sign = -1, py_rng.choice([-1, 1])

    dx = dx_sign * py_rng.randint(15, 40)
    dy = dy_sign * py_rng.randint(15, 40)

    pts = np.array(
        [[x, y], [x + dx, y], [x, y + dy]],
        dtype=np.int32,  # cv2.fillPoly requires int32; default numpy int
                         # dtype from Python ints is int64 on most platforms
    )
    pts[:, 0] = np.clip(pts[:, 0], 0, width - 1)
    pts[:, 1] = np.clip(pts[:, 1], 0, height - 1)

    cv2.fillPoly(img, [pts], (255, 255, 255))
    return img, {"type": "chip", "edge": edge, "x": x, "y": y}


def add_void(img, py_rng):
    x = py_rng.randint(20, img.shape[1] - 20)
    y = py_rng.randint(20, img.shape[0] - 20)
    r = py_rng.randint(5, 15)
    cv2.circle(img, (x, y), r, (0, 0, 0), -1)
    return img, {"type": "void", "x": x, "y": y, "r": r}


def generate_defect_images(out_dir, num_samples=1000, seed=42):
    # Seed both stdlib random and NumPy explicitly, since this file uses
    # both (cv2/random for geometry, numpy for the base-surface noise).
    py_rng = random.Random(seed)
    rng = np.random.default_rng(seed)

    for label in ("clean", "scratch", "chip", "void"):
        os.makedirs(os.path.join(out_dir, label), exist_ok=True)

    width, height = 256, 256
    metadata = []

    for i in range(num_samples):
        img, num_layers = create_base_surface(width, height, rng, py_rng)

        defect_type = py_rng.choice(["clean", "scratch", "chip", "void"])
        defect_info = {"type": "clean"}

        if defect_type == "scratch":
            img, defect_info = add_scratch(img, py_rng)
        elif defect_type == "chip":
            img, defect_info = add_chip(img, py_rng)
        elif defect_type == "void":
            img, defect_info = add_void(img, py_rng)

        filename = f"img_{i}.png"
        cv2.imwrite(os.path.join(out_dir, defect_type, filename), img)

        metadata.append({
            "filename": filename,
            "label": defect_type,
            "num_layers": num_layers,
            **{f"defect_{k}": v for k, v in defect_info.items() if k != "type"},
        })

    # Log actual generation parameters per image for later debugging/
    # severity-distribution checks — not needed for training itself
    # (the folder name is the label), but needed for validating the
    # generator's own output.
    meta_path = os.path.join(out_dir, "metadata.csv")
    all_keys = sorted({k for row in metadata for k in row.keys()})
    with open(meta_path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=all_keys)
        writer.writeheader()
        writer.writerows(metadata)

    print(f"Generated {num_samples} images in {out_dir}")
    print(f"Metadata written to {meta_path}")


if __name__ == "__main__":
    out_dir = os.path.join(os.path.dirname(__file__), "images")
    generate_defect_images(out_dir, 1000, seed=42)