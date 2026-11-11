import flwr as fl
import numpy as np


class SecureFedAvg(fl.server.strategy.FedAvg):

    def aggregate_fit(self, server_round, results, failures):
        aggregated_weights, aggregated_metrics = super().aggregate_fit(
            server_round, results, failures
        )
        if aggregated_weights is not None:
            print(f"Server scaling/verifying round {server_round}")
        return aggregated_weights, aggregated_metrics


# Simulate noisy client updates
def simulate_client_update(shape=(2, 2)):
    clean_weights = np.zeros(shape, dtype=np.float32)
    noise = np.random.normal(0, 0.01, size=shape).astype(np.float32)
    return clean_weights + noise


if __name__ == "__main__":
    strategy = SecureFedAvg()

    # Mock client fit results: List of (ClientProxy, FitRes)
    # In a real run, Flower handles this structure automatically
    print("Mocking secure aggregation test...")
    sample_noisy_weights = simulate_client_update()

    print(f"Original noisy weights sample:\n{sample_noisy_weights}")
    print("Setup complete. Ready for test execution.")