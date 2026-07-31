import os
import glob
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
from torchvision import transforms
from PIL import Image

# Parameters
IMG_SIZE = 128
BATCH_SIZE = 32
EPOCHS = 10
CLASSES = ["clean", "scratch", "chip", "void"]

class MLCCDataset(Dataset):
    def __init__(self, data_dir, transform=None):
        self.data_dir = data_dir
        self.transform = transform
        self.images = []
        self.labels = []
        
        for i, cls_name in enumerate(CLASSES):
            paths = glob.glob(os.path.join(data_dir, cls_name, "*.png"))
            for p in paths:
                self.images.append(p)
                self.labels.append(i)
                
    def __len__(self):
        return len(self.images)
        
    def __getitem__(self, idx):
        # Read as grayscale
        img = Image.open(self.images[idx]).convert('L')
        label = self.labels[idx]
        
        if self.transform:
            img = self.transform(img)
            
        return img, label

class InspectorCNN(nn.Module):
    def __init__(self):
        super().__init__()
        # Input: 1 x 128 x 128
        self.features = nn.Sequential(
            nn.Conv2d(1, 16, kernel_size=3, padding=1),
            nn.ReLU(),
            nn.MaxPool2d(2), # 64x64
            
            nn.Conv2d(16, 32, kernel_size=3, padding=1),
            nn.ReLU(),
            nn.MaxPool2d(2), # 32x32
            
            nn.Conv2d(32, 64, kernel_size=3, padding=1),
            nn.ReLU(),
            nn.MaxPool2d(2)  # 16x16
        )
        self.classifier = nn.Sequential(
            nn.Flatten(),
            nn.Linear(64 * 16 * 16, 128),
            nn.ReLU(),
            nn.Linear(128, 4)
        )
        
    def forward(self, x):
        x = self.features(x)
        logits = self.classifier(x)
        # Output probabilities directly for easy parsing in Node.js
        probs = torch.softmax(logits, dim=1)
        return probs

def train():
    data_dir = os.path.join(os.path.dirname(__file__), "..", "data", "images")
    
    transform = transforms.Compose([
        transforms.Resize((IMG_SIZE, IMG_SIZE)),
        transforms.ToTensor(), # Converts to [0, 1]
    ])
    
    dataset = MLCCDataset(data_dir, transform=transform)
    if len(dataset) == 0:
        print("No images found!")
        return
        
    # Split into train/val
    train_size = int(0.8 * len(dataset))
    val_size = len(dataset) - train_size
    train_dataset, val_dataset = torch.utils.data.random_split(dataset, [train_size, val_size])
    
    train_loader = DataLoader(train_dataset, batch_size=BATCH_SIZE, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=BATCH_SIZE, shuffle=False)
    
    model = InspectorCNN()
    criterion = nn.NLLLoss()
    optimizer = optim.Adam(model.parameters(), lr=0.001)
    
    print(f"Training on {len(train_dataset)} images, validating on {len(val_dataset)} images.")
    
    for epoch in range(EPOCHS):
        model.train()
        running_loss = 0.0
        for inputs, labels in train_loader:
            optimizer.zero_grad()
            outputs = model(inputs)
            # Since outputs are probabilities in [0, 1], we take log to get log-probabilities
            # which is what NLLLoss expects.
            loss = criterion(torch.log(outputs + 1e-8), labels)
            loss.backward()
            optimizer.step()
            running_loss += loss.item()
            
        # Validation
        model.eval()
        correct = 0
        total = 0
        with torch.no_grad():
            for inputs, labels in val_loader:
                outputs = model(inputs)
                _, predicted = torch.max(outputs.data, 1)
                total += labels.size(0)
                correct += (predicted == labels).sum().item()
                
        print(f"Epoch {epoch+1}/{EPOCHS} - Loss: {running_loss/len(train_loader):.4f} - Val Acc: {100 * correct / total:.2f}%")
        
    # Export to ONNX
    print("\nExporting model to ONNX...")
    model.eval()
    dummy_input = torch.randn(1, 1, IMG_SIZE, IMG_SIZE)
    
    onnx_path = os.path.join(os.path.dirname(__file__), '..', '..', 'app', 'models', 'onnx', 'inspector.onnx')
    os.makedirs(os.path.dirname(onnx_path), exist_ok=True)
    
    torch.onnx.export(
        model, 
        dummy_input, 
        onnx_path, 
        export_params=True,
        input_names=['float_input'],
        output_names=['probabilities']
    )
    print(f"Saved CNN ONNX to {onnx_path}")

if __name__ == "__main__":
    train()
