import subprocess
import os
import sys

def run_diagnostic():
    print("--- OpenClaw System Diagnostic ---")
    
    # 1. Check if .env is present
    env_path = "/home/julio/Documents/OpenSeimas/openclaw/.env"
    if not os.path.exists(env_path):
        print(f"Error: {env_path} not found.")
        return
    print(f"OK: Configuration file {env_path} present.")

    # 2. Check if tsx is available
    tsx_path = "/home/julio/Documents/OpenSeimas/openclaw/node_modules/.bin/tsx"
    if not os.path.exists(tsx_path):
        print("Error: tsx not found in node_modules. Run npm install first.")
        return
    print(f"OK: tsx binary found at {tsx_path}.")

    # 3. Run a simple model check via OpenClaw
    print("\nAttempting to initialize OpenClaw and check model connectivity...")
    cmd = [
        tsx_path,
        "/home/julio/Documents/OpenSeimas/openclaw/src/entry.ts",
        "models",
        "list"
    ]
    
    # Run with environment variables from .env
    env = os.environ.copy()
    with open(env_path, "r") as f:
        for line in f:
            if "=" in line and not line.startswith("#"):
                key, val = line.strip().split("=", 1)
                env[key] = val

    try:
        result = subprocess.run(cmd, env=env, capture_output=True, text=True, check=False)
        if result.returncode == 0:
            print("OK: OpenClaw initialized successfully.")
            print("\nAvailable Models (JSON):")
            print(result.stdout)
        else:
            print(f"Error: OpenClaw initialization failed with return code {result.returncode}.")
            print("Output:")
            print(result.stdout)
            print("Error details:")
            print(result.stderr)
    except Exception as e:
        print(f"Exception during diagnostic: {e}")

if __name__ == "__main__":
    run_diagnostic()
