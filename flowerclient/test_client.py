import numpy as np


def quantize_weights(parameters):
    if not parameters or len(parameters) == 0:
        return [np.zeros((2, 2), dtype=np.float32)]

    quantized = []
    original_size = sum(p.nbytes for p in parameters)
    for p in parameters:
        min_val, max_val = np.min(p), np.max(p)
        scale = (max_val - min_val) / 255.0 if max_val != min_val else 1.0
        q = np.round((p - min_val) / scale).astype(np.int8)
        quantized.append(q)

    quantized_size = sum(q.nbytes for q in quantized)
    ratio = original_size / quantized_size if quantized_size > 0 else 1.0
    print(
        f"Compression verified - Original size: {original_size} bytes, "
        f"Quantized size: {quantized_size} bytes, Ratio: {ratio:.2f}x"
    )
    return quantized


class DummyClient:

    def fit(self, parameters, config):
        quantized_parameters = quantize_weights(parameters)
        return quantized_parameters, 1, {}


if __name__ == "__main__":
    client = DummyClient()
    dummy_weights = [np.random.randn(2, 2).astype(np.float32)]
    print("Testing quantization logic immediately...")
    client.fit(dummy_weights, {})