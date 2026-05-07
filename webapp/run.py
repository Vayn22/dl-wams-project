#!/usr/bin/env python3
"""WAMS launcher.

Keeps the original single-machine Docker Compose flows, and adds a guided
multi-machine bootstrap that mirrors the leader/slave flow you described.
"""

from __future__ import annotations

import argparse
import json
import os
import socket
import subprocess
import sys
from pathlib import Path
from typing import Dict, Iterable, List, Optional

BASE_DIR = Path(__file__).resolve().parent
SERVICES_DIR = BASE_DIR / "backend" / "services"
CLUSTER_STATE_FILE = BASE_DIR / ".wams-cluster.json"

DOCKER_COMPOSE_CMD = ["docker", "compose"]

DOCKER_COMPOSE_ALL = SERVICES_DIR / "docker-compose.yml"
DOCKER_COMPOSE_PC1 = SERVICES_DIR / "docker-compose.pc1.yml"
DOCKER_COMPOSE_PC2 = SERVICES_DIR / "docker-compose.pc2.yml"
DOCKER_COMPOSE_AI = SERVICES_DIR / "docker-compose.ai.yml"

YES_VALUES = {"y", "yes", "true", "1", "oui", "o"}
NO_VALUES = {"n", "no", "false", "0", "non"}


def detect_local_ip() -> str:
    """Best-effort LAN IP discovery."""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
            sock.connect(("8.8.8.8", 80))
            return sock.getsockname()[0]
    except OSError:
        pass

    try:
        host = socket.gethostname()
        ip = socket.gethostbyname(host)
        if ip and not ip.startswith("127."):
            return ip
    except OSError:
        pass

    return "127.0.0.1"


def run_cmd(cmd: Iterable[str], env: Optional[Dict[str, str]] = None) -> subprocess.CompletedProcess:
    merged_env = os.environ.copy()
    if env:
        merged_env.update({key: str(value) for key, value in env.items()})

    cmd_list = list(cmd)
    print(f"\n[RUN] {' '.join(cmd_list)}\n")
    return subprocess.run(cmd_list, env=merged_env)


def docker_compose(file: Path, *args: str, env: Optional[Dict[str, str]] = None) -> subprocess.CompletedProcess:
    cmd = [*DOCKER_COMPOSE_CMD, "-f", str(file), *args]
    return run_cmd(cmd, env=env)


def save_cluster_state(state: Dict[str, object]) -> None:
    CLUSTER_STATE_FILE.write_text(json.dumps(state, indent=2, sort_keys=True), encoding="utf-8")


def ask_yes_no(prompt: str, default: Optional[bool] = None) -> bool:
    suffix = " [y/n]" if default is None else (" [Y/n]" if default else " [y/N]")
    while True:
        answer = input(f"{prompt}{suffix}: ").strip().lower()
        if not answer and default is not None:
            return default
        if answer in YES_VALUES:
            return True
        if answer in NO_VALUES:
            return False
        print("Please answer yes or no.")


def prompt_ips(label: str) -> List[str]:
    items: List[str] = []
    while True:
        value = input(f"Enter {label} IP (blank to stop): ").strip()
        if not value:
            break
        items.append(value)
        if not ask_yes_no("Add another?"):
            break
    return items


def mode_all() -> subprocess.CompletedProcess:
    return docker_compose(DOCKER_COMPOSE_ALL, "up", "--build")


def mode_pc1() -> subprocess.CompletedProcess:
    return docker_compose(
        DOCKER_COMPOSE_PC1,
        "up",
        "--build",
        env={"PC1_IP": os.environ.get("PC1_IP", "127.0.0.1")},
    )


def mode_pc2() -> subprocess.CompletedProcess:
    return docker_compose(
        DOCKER_COMPOSE_PC2,
        "up",
        "--build",
        env={
            "PC1_IP": os.environ.get("PC1_IP", "127.0.0.1"),
            "PC2_IP": os.environ.get("PC2_IP", "127.0.0.1"),
        },
    )


def mode_ai() -> subprocess.CompletedProcess:
    return docker_compose(
        DOCKER_COMPOSE_AI,
        "up",
        "--build",
        env={
            "PC1_IP": os.environ.get("PC1_IP", "127.0.0.1"),
            "THIS_IP": os.environ.get("THIS_IP", "127.0.0.1"),
        },
    )


def mode_auth() -> subprocess.CompletedProcess:
    return docker_compose(
        DOCKER_COMPOSE_PC1,
        "up",
        "--build",
        "consul",
        "traefik",
        "auth_db",
        "auth",
        env={"PC1_IP": os.environ.get("PC1_IP", "127.0.0.1")},
    )


def mode_patient() -> subprocess.CompletedProcess:
    return docker_compose(
        DOCKER_COMPOSE_PC2,
        "up",
        "--build",
        "patient_db",
        "patient",
        env={
            "PC1_IP": os.environ.get("PC1_IP", "127.0.0.1"),
            "PC2_IP": os.environ.get("PC2_IP", "127.0.0.1"),
        },
    )


def mode_frontend() -> subprocess.CompletedProcess:
    return docker_compose(DOCKER_COMPOSE_ALL, "up", "--build", "frontend")


def mode_infra() -> subprocess.CompletedProcess:
    return run_cmd([*DOCKER_COMPOSE_CMD, "-f", str(DOCKER_COMPOSE_ALL), "up", "--build", "consul", "traefik"])


def mode_stop() -> int:
    for compose_file in [DOCKER_COMPOSE_ALL, DOCKER_COMPOSE_PC1, DOCKER_COMPOSE_PC2, DOCKER_COMPOSE_AI]:
        if compose_file.exists():
            docker_compose(compose_file, "down", "--remove-orphans")
    return 0


def mode_logs() -> int:
    run_cmd([*DOCKER_COMPOSE_CMD, "-f", str(DOCKER_COMPOSE_ALL), "logs", "-f"])
    return 0


def mode_status() -> int:
    run_cmd(["docker", "ps", "--filter", "name=wams"])
    return 0


def interactive() -> int:
    local_ip = detect_local_ip()
    print("=" * 72)
    print("  WAMS launcher")
    print("=" * 72)
    print(f"Detected IP: {local_ip}")
    print("[1] One machine")
    print("[2] Multi-machine")
    print("[3] Frontend only")
    print("[4] AI only")
    print("[5] Auth only")
    print("[6] Patient only")
    print("[7] Infra only")
    print("[8] Stop")
    print("[9] Logs")
    print("[0] Status")
    print("=" * 72)

    choice = input("Choose: ").strip()

    if choice == "1":
        return mode_all().returncode

    if choice == "2":
        is_leader = ask_yes_no("Are you the leader?", default=True)
        if is_leader:
            worker_ips = prompt_ips("slave")
            save_cluster_state(
                {
                    "mode": "cluster",
                    "role": "leader",
                    "local_ip": local_ip,
                    "worker_ips": worker_ips,
                }
            )
            os.environ["PC1_IP"] = local_ip
            print("Leader state saved.")
            if worker_ips:
                print("Workers registered:")
                for worker_ip in worker_ips:
                    print(f" - {worker_ip}")
            return mode_pc1().returncode

        leader_ip = input("Enter leader IP: ").strip() or "127.0.0.1"
        save_cluster_state(
            {
                "mode": "cluster",
                "role": "worker",
                "local_ip": local_ip,
                "leader_ip": leader_ip,
            }
        )
        os.environ["PC1_IP"] = leader_ip
        os.environ["PC2_IP"] = local_ip
        return mode_pc2().returncode

    mapping = {
        "3": mode_frontend,
        "4": mode_ai,
        "5": mode_auth,
        "6": mode_patient,
        "7": mode_infra,
        "8": mode_stop,
        "9": mode_logs,
        "0": mode_status,
    }

    func = mapping.get(choice)
    if not func:
        print("Invalid choice")
        return 1

    result = func()
    return result.returncode if isinstance(result, subprocess.CompletedProcess) else int(result)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="WAMS run helper")
    parser.add_argument(
        "--mode",
        choices=["all", "pc1", "pc2", "ai", "infra", "auth", "patient", "frontend", "stop", "logs", "status"],
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if args.mode:
        func = globals().get(f"mode_{args.mode}")
        if not func:
            print(f"Unknown mode: {args.mode}")
            sys.exit(1)
        result = func()
        sys.exit(result.returncode if isinstance(result, subprocess.CompletedProcess) else int(result))

    sys.exit(interactive())


if __name__ == "__main__":
    main()
