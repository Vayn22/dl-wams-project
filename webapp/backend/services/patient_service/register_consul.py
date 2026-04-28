import json
import os
import time
from urllib.request import Request, urlopen

CONSUL_URL = os.getenv("CONSUL_URL", "http://consul:8500")
SERVICE_NAME = os.getenv("SERVICE_NAME", "patient-service")
SERVICE_ID = os.getenv("SERVICE_ID", "patient-service-1")
SERVICE_HOST = os.getenv("SERVICE_HOST", "patient")
SERVICE_PORT = int(os.getenv("SERVICE_PORT", "8002"))
HEALTH_URL = os.getenv("HEALTH_URL", "http://patient:8002/api/health/")


def wait_for_consul(timeout_seconds=60):
    deadline = time.time() + timeout_seconds
    while time.time() < deadline:
        try:
            with urlopen(f"{CONSUL_URL}/v1/status/leader", timeout=3) as resp:
                if resp.status == 200:
                    return
        except Exception:
            time.sleep(2)
    raise RuntimeError("Consul is not ready")


def register_service():
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

    req = Request(
        f"{CONSUL_URL}/v1/agent/service/register",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="PUT",
    )

    with urlopen(req, timeout=5):
        pass


if __name__ == "__main__":
    wait_for_consul()
    register_service()
    print("Patient service registered in Consul")