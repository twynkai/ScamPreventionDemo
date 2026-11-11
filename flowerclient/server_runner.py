import flwr as fl
import numpy as np
from fedprox_optimizer import FedProx

# Define initial parameters on the server side to satisfy the initialization round
initial_weights = [np.zeros((2, 2), dtype=np.float32)]
parameters = fl.common.ndarrays_to_parameters(initial_weights)

# Configure FedProx with min clients set to 1 for single-client execution
strategy = FedProx(
    proximal_mu=0.01,
    initial_parameters=parameters,
    min_available_clients=1,
    min_fit_clients=1,
    min_evaluate_clients=1,
)

if __name__ == "__main__":
    fl.server.start_server(
        server_address="127.0.0.1:8080",
        config=fl.server.ServerConfig(num_rounds=3, round_timeout=300.0),
        strategy=strategy,
    )