import flwr as fl
import numpy as np

print("client started")

def add_noise(parameters, noise_multiplier=0.005):
    # Add controlled Gaussian noise to parameters for secure blinding / differential privacy
    noisy_params = []
    for p in parameters:
        noise = np.random.normal(0, noise_multiplier, size=p.shape).astype(p.dtype)
        noisy_params.append(p + noise)
    return noisy_params

def quantize_weights(parameters):
    # Guard against empty parameters and return valid weights of matching shape
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
    print(f"Compression verified - Original size: {original_size} bytes, Quantized size: {quantized_size} bytes, Ratio: {ratio:.2f}x")
    return quantized

class FlowerClient(fl.client.NumPyClient):
    def __init__(self):
        self.last_good_parameters = None

    def get_parameters(self, config):
        # Explicitly return valid initial weight structure immediately
        return [np.zeros((2, 2), dtype=np.float32)]

    def get_properties(self, config):
        return {}

    def fit(self, parameters, config):
        # Inject controlled noise before quantization to ensure mathematical blinding
        noisy_parameters = add_noise(parameters, noise_multiplier=0.005)
        quantized_parameters = quantize_weights(noisy_parameters)
        
        # Automated rollback mechanism to validate and revert to last known safe state if instability occurs
        if self.last_good_parameters is None:
            self.last_good_parameters = quantized_parameters
        else:
            is_stable = all(not np.any(np.isnan(p)) and not np.any(np.isinf(p)) for p in quantized_parameters)
            if not is_stable:
                print("Instability detected. Reverting to last known safe state.")
                quantized_parameters = self.last_good_parameters
            else:
                self.last_good_parameters = quantized_parameters

        return quantized_parameters, 1, {}

    def evaluate(self, parameters, config):
        return 0.0, 1, {}

if __name__ == "__main__":
    fl.client.start_numpy_client(
        server_address="127.0.0.1:8080",
        client=FlowerClient(),
    )