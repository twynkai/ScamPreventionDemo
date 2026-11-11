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
                f"Applying FedProx proximal term adjustment with mu="
                f" {self.proximal_mu}"
            )
        return aggregated_weights, aggregated_metrics