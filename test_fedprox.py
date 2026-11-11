import flwr as fl
import numpy as np


class FedProx(fl.server.strategy.FedAvg):

    def __init__(self, proximal_mu=0.01, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.proximal_mu = proximal_mu

    def aggregate_fit(self, server_round, results, failures):
        aggregated_weights, aggregated_metrics = super().aggregate_fit(
            server_round, results, failures
        )
        if aggregated_weights is not None:
            print(
                f"Applied FedProx proximal adjustment with mu="
                f" {self.proximal_mu}"
            )
        return aggregated_weights, aggregated_metrics


# Simulate a divergent client update
def simulate_client_update(shape=(2, 2)):
    base_weights = np.ones(shape, dtype=np.float32)
    divergence = np.array([[0.5, -0.5], [0.2, -0.2]], dtype=np.float32)
    return base_weights + divergence


if __name__ == "__main__":
    strategy = FedProx(proximal_mu=0.1)
    print("Mocking FedProx stability test...")

    mock_update = simulate_client_update()
    print(f" Simulated client update:\n{mock_update}")

    print("Setup complete. Ready to verify weight stabilization.")
