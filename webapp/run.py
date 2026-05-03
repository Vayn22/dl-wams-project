#!/usr/bin/env python3
"""
WAMS – run orchestration helper.

Usage:
  python run.py                   → interactive menu
  python run.py --mode all        → start everything on one machine
  python run.py --mode ai          → start only the AI service (needs PC1_IP)
  python run.py --mode pc1 / pc2 / auth / patient / infra / stop / logs / status
"""

import os
import sys
import subprocess
import argparse
import platform

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SERVICES_DIR = os.path.join(BASE_DIR, "backend", "services")

# Use "docker compose" on all platforms (Compose V2)
DOCKER_COMPOSE_CMD = "docker compose"

DOCKER_COMPOSE_ALL = os.path.join(SERVICES_DIR, "docker-compose.yml")
DOCKER_COMPOSE_PC1 = os.path.join(SERVICES_DIR, "docker-compose.pc1.yml")
DOCKER_COMPOSE_PC2 = os.path.join(SERVICES_DIR, "docker-compose.pc2.yml")
DOCKER_COMPOSE_AI  = os.path.join(SERVICES_DIR, "docker-compose.ai.yml")

# ── helpers ──────────────────────────────────────────────────────────
def run_cmd(cmd, env=None):
    """Execute a command, print it, and let output flow."""
    merged_env = os.environ.copy()
    if env:
        merged_env.update(env)
    print(f"\n[RUN] {' '.join(cmd)}\n")
    return subprocess.run(cmd, env=merged_env)

def docker_compose(file, *args, env=None):
    cmd = [*DOCKER_COMPOSE_CMD.split(), "-f", file, *args]
    return run_cmd(cmd, env)

# ── modes ────────────────────────────────────────────────────────────
def mode_all():
    return docker_compose(DOCKER_COMPOSE_ALL, "up", "--build")

def mode_pc1():
    return docker_compose(DOCKER_COMPOSE_PC1, "up", "--build",
                          env={"PC1_IP": os.environ.get("PC1_IP", "127.0.0.1")})

def mode_pc2():
    return docker_compose(DOCKER_COMPOSE_PC2, "up", "--build",
                          env={
                              "PC1_IP": os.environ.get("PC1_IP", "127.0.0.1"),
                              "PC2_IP": os.environ.get("PC2_IP", "127.0.0.1")
                          })

def mode_ai():
    return docker_compose(DOCKER_COMPOSE_AI, "up", "--build",
                          env={
                              "PC1_IP": os.environ.get("PC1_IP", "127.0.0.1"),
                              "THIS_IP": os.environ.get("THIS_IP", "127.0.0.1")
                          })

def mode_auth():
    # Start only auth-related services (auth_db + auth + consul + traefik)
    return docker_compose(DOCKER_COMPOSE_PC1, "up", "--build", "consul", "traefik", "auth_db", "auth",
                          env={"PC1_IP": os.environ.get("PC1_IP", "127.0.0.1")})

def mode_patient():
    return docker_compose(DOCKER_COMPOSE_PC2, "up", "--build", "patient_db", "patient",
                          env={
                              "PC1_IP": os.environ.get("PC1_IP", "127.0.0.1"),
                              "PC2_IP": os.environ.get("PC2_IP", "127.0.0.1")
                          })

def mode_infra():
    # Only consul + traefik
    run_cmd([*DOCKER_COMPOSE_CMD.split(), "-f", DOCKER_COMPOSE_ALL, "up", "--build", "consul", "traefik"])

def mode_stop():
    # Stop all running services across all compose files
    for f in [DOCKER_COMPOSE_ALL, DOCKER_COMPOSE_PC1, DOCKER_COMPOSE_PC2, DOCKER_COMPOSE_AI]:
        if os.path.exists(f):
            docker_compose(f, "down", "--remove-orphans")
    return 0

def mode_logs():
    run_cmd([*DOCKER_COMPOSE_CMD.split(), "-f", DOCKER_COMPOSE_ALL, "logs", "-f"])

def mode_status():
    run_cmd(["docker", "ps", "--filter", "name=wams"])

# ── interactive menu ─────────────────────────────────────────────────
def interactive():
    print("=" * 60)
    print("  WAMS – Microservice Launcher")
    print("=" * 60)
    print("[1] all      – Everything on this machine")
    print("[2] pc1      – Consul + Traefik + Auth")
    print("[3] pc2      – Patient service")
    print("[4] ai       – AI segmentation service")
    print("[5] infra    – Consul + Traefik only")
    print("[6] auth     – Auth service only (requires pc1)")
    print("[7] patient  – Patient service only (requires pc1 + pc2)")
    print("[8] stop     – Stop all containers")
    print("[9] logs     – Tail logs (all)")
    print("[0] status   – Show running containers")
    print("=" * 60)
    choice = input("Choose: ").strip()
    mapping = {
        "1": mode_all,
        "2": mode_pc1,
        "3": mode_pc2,
        "4": mode_ai,
        "5": mode_infra,
        "6": mode_auth,
        "7": mode_patient,
        "8": mode_stop,
        "9": mode_logs,
        "0": mode_status,
    }
    func = mapping.get(choice)
    if func:
        exit_code = func()
        sys.exit(exit_code.returncode if isinstance(exit_code, subprocess.CompletedProcess) else exit_code)
    else:
        print("Invalid choice")
        sys.exit(1)

# ── CLI ──────────────────────────────────────────────────────────────
def parse_args():
    parser = argparse.ArgumentParser(description="WAMS run helper")
    parser.add_argument("--mode", choices=["all","pc1","pc2","ai","infra","auth","patient","stop","logs","status"])
    return parser.parse_args()

def main():
    args = parse_args()
    if args.mode:
        func = globals().get(f"mode_{args.mode}")
        if not func:
            print(f"Unknown mode: {args.mode}")
            sys.exit(1)
        result = func()
        sys.exit(result.returncode if isinstance(result, subprocess.CompletedProcess) else result)
    else:
        interactive()

if __name__ == "__main__":
    main()