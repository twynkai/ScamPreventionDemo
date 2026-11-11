import numpy as np

def quantize_weights(parameters):
    quantized = []
    original_size = sum(p.nbytes for p in parameters)
    for p in parameters:
        min_val, max_val = np.min(p), np.max(p)
        scale = (max_val - min_val) / 255.0 if max_val != min_val else 1.0
        q = np.round((p - min_val) / scale).astype(np.int8)
        quantized.append(q)
    quantized_size = sum(q.nbytes for q in quantized)
    print(f"Compression verified - Original size: {original_size} bytes, Quantized size: {quantized_size} bytes, Ratio: {original_size / quantized_size:.2f}x")
    return quantized

print("Generating dummy model weights...")
dummy_layer_1 = np.random.uniform(-2.0, 5.0, size=(1000, 1000)).astype(np.float32)
dummy_layer_2 = np.random.uniform(-10.0, 10.0, size=(500, 500)).astype(np.float32)
initial_weights = [dummy_layer_1, dummy_layer_2]

quantized_weights = quantize_weights(initial_weights)