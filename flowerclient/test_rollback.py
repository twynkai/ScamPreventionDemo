import flwr as fl
import numpy as np


class FlowerClient(
    fl.client.NumPyClient
):

  def __init__(self):
    self.last_good_parameters = None

  def fit(self, parameters, config):
    if self.last_good_parameters is None:
      self.last_good_parameters = parameters

    is_stable = all(
        not np.any(np.isnan(p)) and not np.any(np.isinf(p)) for p in parameters
    )

    if not is_stable:
      print("Instability detected! Reverting to safe weights.")
      return self.last_good_parameters, 1, {}
    else:
      print("Update stable. Saving new state.")
      self.last_good_parameters = parameters
      return parameters, 1, {}


if __name__ == "__main__":
  client = FlowerClient()

  print("--- Testing Stable Update ---")
  stable_weights = [np.array([[1.0, 2.0]], dtype=np.float32)]
  client.fit(stable_weights, {})

  print("\n--- Testing Unstable Update (NaN) ---")
  unstable_weights = [np.array([[np.nan, 2.0]], dtype=np.float32)]
  returned_weights, _, _ = client.fit(unstable_weights, {})

  print(f"Returned weights:\n{returned_weights}")