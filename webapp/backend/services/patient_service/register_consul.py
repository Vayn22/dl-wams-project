import json
import os
import socket
import time
from urllib.error import URLError
from urllib.request import Request, urlopen

CONSUL_URL = os.getenv("CONSUL_URL", "http://consul:8500")
SERVICE_NAME = os.getenv("SERVICE_NAME", "patient-service")
SERVICE_ID = os.getenv("SERVICE_ID", "patient-service-1")
SERVICE_HOST = os.getenv("SERVICE_HOST", "patient")
SERVICE_PORT = int(os.getenv("SERVICE_PORT", "8002"))
HEALTH_URL = os.getenv("HEALTH_URL", "http://patient:8002/api/health/")


def wait_for_consul_port(timeout=120):
    host = CONSUL_URL.split("://")[1].split(":")[0]
    port = int(CONSUL_URL.split(":")[-1])
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            with socket.create_connection((host, port), timeout=5):
                return
        except OSError:
            time.sleep(2)
    raise RuntimeError(f"Consul port {host}:{port} not reachable after {timeout}s")


def wait_for_leader(timeout=120):
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            with urlopen(f"{CONSUL_URL}/v1/status/leader", timeout=5) as resp:
                if resp.status == 200:
                    return
        except Exception:
            pass
        time.sleep(2)
    raise RuntimeError("Consul leader did not appear")


def register_service(max_attempts=30):
    payload = {
        "ID": SERVICE_ID,
        "Name": SERVICE_NAME,
        "Address": SERVICE_HOST,
        "Port": SERVICE_PORT,
        "Tags": [
            "traefik.enable=true",
            "traefik.http.routers.patient.rule=Host(`api.localhost`)",
            "traefik.http.routers.patient.entrypoints=web",
            "traefik.http.services.patient.loadbalancer.server.port=8002",
        ],
        "Check": {
            "HTTP": HEALTH_URL,
            "Interval": "10s",
            "Timeout": "2s",
        },
    }

    data = json.dumps(payload).encode("utf-8")
    url = f"{CONSUL_URL}/v1/agent/service/register"

    attempt = 0
    while attempt < max_attempts:
        attempt += 1
        try:
            req = Request(url, data=data, headers={"Content-Type": "application/json"}, method="PUT")
            with urlopen(req, timeout=5):
                print(f"Successfully registered {SERVICE_NAME} after {attempt} attempt(s)")
                return
        except Exception as exc:
            print(f"Registration attempt {attempt}/{max_attempts} failed: {exc}")
            time.sleep(3)

    raise RuntimeError(f"Could not register service after {max_attempts} attempts")


if __name__ == "__main__":
    print("Waiting for Consul port...")
    wait_for_consul_port()
    print("Waiting for Consul leader...")
    wait_for_leader()
    print("Registering service...")
    register_service()
    print("Service registration complete – starting app...")