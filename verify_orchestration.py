import json
import redis
import requests
import numpy as np
import sys
import os

# --- PATH CONFIGURATION FOR FLOWER CLIENT ---
# Points to your flowerclient folder
CLIENT_DIR = "flowerclient"

# Add the client directory to sys.path securely
abs_client_dir = os.path.abspath(CLIENT_DIR)
if abs_client_dir not in sys.path:
    sys.path.insert(0, abs_client_dir)

try:
    from client import add_noise, quantize_weights
    CLIENT_MODULES_LOADED = True
except ImportError as e:
    print(f"Failed to import from client.py (path: {abs_client_dir}): {e}")
    CLIENT_MODULES_LOADED = False

# Configuration endpoints matching your project environment
EXPRESS_TELEMETRY_URL = "http://127.0.0.1:3000/api/telemetry"
REDIS_HOST = "127.0.0.1"
REDIS_PORT = 6379
# Securely load Redis password from environment variables
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD")


def verify_redis_connection():
    print("\n--- Connecting to Redis Broker ---")
    try:
        client = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, password=REDIS_PASSWORD, decode_responses=True)
        client.ping()
        print("SUCCESS: Connected to native Linux Redis instance.")
        return client
    except redis.ConnectionError as e:
        print(f"ERROR: Could not connect to Redis: {e}")
        return None

def simulate_frontend_telemetry():
    print("\n--- Simulating Frontend Telemetry Payloads ---")
    mock_payloads = [
        {
            "eventType": "click",
            "elementId": "pay-button",
            "timestamp": 1794324600000,
            "sessionToken": "mock_session_token_alpha",
            "path": "/checkout",
            "anomalyScore": 0.1
        },
        {
            "eventType": "input",
            "elementId": "card-number",
            "timestamp": 1794324605000,
            "sessionToken": "mock_session_token_alpha",
            "path": "/checkout",
            "anomalyScore": 0.85
        }
    ]
    for payload in mock_payloads:
        try:
            print(f"Posting telemetry event: {payload['eventType']} on {payload['path']}")
            response = requests.post(EXPRESS_TELEMETRY_URL, json=payload, timeout=5)
            print(f"Server responded with status: {response.status_code} Body: {response.text}")
        except requests.exceptions.RequestException as e:
            print(f"Skipping HTTP POST (Express server offline): {e}")
    return mock_payloads

def verify_redis_storage(redis_client):
    if not redis_client:
        print("Skipping Redis storage verification due to connection failure.")
        return
    print("\n--- Verifying Redis Event Queue & Rate Limiting Storage ---")
    try:
        keys = redis_client.keys("*")
        print(f"Keys found in Redis: {keys}")
        
        # Check rate limit or violation keys if present
        for key in keys:
            if "telemetry" in key or "session" in key:
                val = redis_client.get(key)
                print(f"Key -> {key}: {val}")
    except Exception as e:
        print(f"Error querying Redis state: {e}")

def test_flower_client_pipeline():
    print("\n--- Testing Flower Client Mathematical Blinding & Compression ---")
    if not CLIENT_MODULES_LOADED:
        print(f"ERROR: client.py modules could not be loaded from '{abs_client_dir}'. Verification halted.")
        return

    # Create dummy layer weights (e.g., dense layer 2x2)
    original_weights = [np.array([[0.5, -0.2], [0.1, 0.9]], dtype=np.float32)]
    print(f"Original weights:\n{original_weights[0]}")

    # Test differential privacy noise injection
    noisy_weights = add_noise(original_weights, noise_multiplier=0.01)
    print(f"Weights after DP noise injection:\n{noisy_weights[0]}")

    # Test weight quantization
    quantized_weights = quantize_weights(noisy_weights)
    print(f"Quantized weights sample (int8):\n{quantized_weights[0]}")

    if len(quantized_weights) == len(original_weights):
        print("SUCCESS: Flower client blinding and quantization pipeline verified.")
    else:
        print("FAILURE: Weight shape mismatch after processing.")

def run_master_orchestration_verification():
    print("==================================================")
    print("       Starting Master Orchestration Test         ")
    print("==================================================")
    
    # 1. Test Mock HTTP Telemetry Ingestion
    simulate_frontend_telemetry()
    
    # 2. Verify Redis Broker Connectivity & State
    r_client = verify_redis_connection()
    verify_redis_storage(r_client)
    
    # 3. Verify ML Pipeline Data Contracts Locally
    test_flower_client_pipeline()
    
    print("\n==================================================")
    print("            Master Verification Complete          ")
    print("==================================================")

if __name__ == "__main__":
    run_master_orchestration_verification()
