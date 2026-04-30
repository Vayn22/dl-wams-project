"""
run.py  –  WAMS Project Launcher
=================================
Runs all services or individual ones, on one machine or spread across multiple.

Usage:
    python run.py                  # interactive menu
    python run.py --mode all       # run everything on this machine
    python run.py --mode pc1       # run PC1 stack (infra + auth)
    python run.py --mode pc2       # run PC2 stack (patient service)
    python run.py --mode auth      # run only auth service (inside pc1 compose)
    python run.py --mode patient   # run only patient service (inside pc2 compose)
    python run.py --mode infra     # run only consul + traefik
    python run.py --mode stop      # stop everything
    python run.py --mode logs      # show logs for all running containers
    python run.py --mode status    # show running containers
"""

import argparse
import os
import subprocess
import sys

# ─── paths ────────────────────────────────────────────────────────────────────
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SERVICES_DIR = os.path.join(SCRIPT_DIR, "backend", "services")

# Compose files
COMPOSE_ALL   = os.path.join(SERVICES_DIR, "docker-compose.yml")
COMPOSE_PC1   = os.path.join(SERVICES_DIR, "docker-compose.pc1.yml")
COMPOSE_PC2   = os.path.join(SERVICES_DIR, "docker-compose.pc2.yml")

# ─── helpers ──────────────────────────────────────────────────────────────────

def run(cmd: list[str], env: dict | None = None, cwd: str | None = None):
    """Run a command, inheriting the user's terminal (so docker output is live)."""
    merged_env = {**os.environ, **(env or {})}
    print(f"\n  $ {' '.join(cmd)}\n")
    result = subprocess.run(cmd, env=merged_env, cwd=cwd or SERVICES_DIR)
    return result.returncode


def ask(prompt: str, choices: list[str]) -> str:
    """Ask a question and only accept one of the given choices."""
    choices_str = " / ".join(choices)
    while True:
        answer = input(f"{prompt} [{choices_str}]: ").strip().lower()
        if answer in choices:
            return answer
        print(f"  Please enter one of: {choices_str}")


def require_ip(name: str, env_var: str) -> str:
    """Get an IP from env or prompt the user."""
    val = os.environ.get(env_var, "").strip()
    if val:
        return val
    val = input(
        f"  Enter the LAN IP of {name} (e.g. 192.168.1.10) "
        f"[or set ${env_var}]: "
    ).strip()
    if not val:
        print(f"  ERROR: {env_var} is required for this mode.")
        sys.exit(1)
    return val


def separator(title: str):
    print("\n" + "=" * 60)
    print(f"  {title}")
    print("=" * 60)

# ─── modes ────────────────────────────────────────────────────────────────────

def mode_all():
    """Run every service on this single machine (original behaviour)."""
    separator("Starting ALL services on this machine")
    run(["docker", "compose", "-f", COMPOSE_ALL, "up", "--build"])


def mode_pc1():
    """Run PC1 stack: Consul server, Traefik, auth_db, auth."""
    separator("Starting PC1 stack (Consul server + Traefik + auth)")
    pc1_ip = require_ip("THIS machine (PC1)", "PC1_IP")
    run(["docker", "compose", "-f", COMPOSE_PC1, "up", "--build"],
        env={"PC1_IP": pc1_ip})


def mode_pc2():
    """Run PC2 stack: Consul client + patient_db + patient."""
    separator("Starting PC2 stack (patient service)")
    pc1_ip = require_ip("PC1 (the Consul server machine)", "PC1_IP")
    pc2_ip = require_ip("THIS machine (PC2)", "PC2_IP")
    run(["docker", "compose", "-f", COMPOSE_PC2, "up", "--build"],
        env={"PC1_IP": pc1_ip, "PC2_IP": pc2_ip})


def mode_infra():
    """Run only infrastructure: Consul + Traefik (no services)."""
    separator("Starting infrastructure only (Consul + Traefik)")
    pc1_ip = require_ip("THIS machine", "PC1_IP")
    run(
        ["docker", "compose", "-f", COMPOSE_PC1,
         "up", "--build", "consul", "traefik"],
        env={"PC1_IP": pc1_ip},
    )


def mode_auth_only():
    """Run only the auth service (and its DB) — still needs Consul reachable."""
    separator("Starting auth service only")
    pc1_ip = require_ip("THIS machine", "PC1_IP")
    run(
        ["docker", "compose", "-f", COMPOSE_PC1,
         "up", "--build", "consul", "auth_db", "auth"],
        env={"PC1_IP": pc1_ip},
    )


def mode_patient_only():
    """Run only the patient service (and its DB) — Consul server must be up."""
    separator("Starting patient service only")
    pc1_ip = require_ip("PC1 (the Consul server machine)", "PC1_IP")
    pc2_ip = require_ip("THIS machine", "PC2_IP")
    run(
        ["docker", "compose", "-f", COMPOSE_PC2,
         "up", "--build", "consul-client", "patient_db", "patient"],
        env={"PC1_IP": pc1_ip, "PC2_IP": pc2_ip},
    )


def mode_stop():
    """Stop all running containers from any compose file."""
    separator("Stopping all services")
    for f in [COMPOSE_ALL, COMPOSE_PC1, COMPOSE_PC2]:
        if os.path.exists(f):
            run(["docker", "compose", "-f", f, "down"])


def mode_logs():
    """Tail logs from the all-in-one compose (or ask which)."""
    separator("Showing logs")
    composed = _pick_compose_file()
    run(["docker", "compose", "-f", composed, "logs", "-f"])


def mode_status():
    """Show running containers."""
    separator("Container status")
    run(["docker", "ps", "--format",
         "table {{.Names}}\t{{.Status}}\t{{.Ports}}"])


def _pick_compose_file() -> str:
    print("\n  Which compose file?")
    print("  1) docker-compose.yml     (all-in-one)")
    print("  2) docker-compose.pc1.yml (PC1)")
    print("  3) docker-compose.pc2.yml (PC2)")
    choice = ask("  Pick", ["1", "2", "3"])
    return {
        "1": COMPOSE_ALL,
        "2": COMPOSE_PC1,
        "3": COMPOSE_PC2,
    }[choice]

# ─── interactive menu ─────────────────────────────────────────────────────────

MENU = [
    ("1", "Run EVERYTHING on this one machine",           mode_all),
    ("2", "Run PC1 stack (Consul server + Traefik + auth)",  mode_pc1),
    ("3", "Run PC2 stack (patient service + Consul client)", mode_pc2),
    ("4", "Run infrastructure only (Consul + Traefik)",   mode_infra),
    ("5", "Run auth service only",                        mode_auth_only),
    ("6", "Run patient service only",                     mode_patient_only),
    ("7", "Stop all services",                            mode_stop),
    ("8", "Show live logs",                               mode_logs),
    ("9", "Show container status",                        mode_status),
    ("0", "Exit",                                         None),
]

CLI_MAP = {
    "all":     mode_all,
    "pc1":     mode_pc1,
    "pc2":     mode_pc2,
    "infra":   mode_infra,
    "auth":    mode_auth_only,
    "patient": mode_patient_only,
    "stop":    mode_stop,
    "logs":    mode_logs,
    "status":  mode_status,
}


def interactive_menu():
    print()
    print("╔══════════════════════════════════════════════════╗")
    print("║          WAMS Project Launcher                   ║")
    print("╚══════════════════════════════════════════════════╝")
    print()
    for key, label, _ in MENU:
        print(f"  [{key}]  {label}")
    print()

    valid_keys = [k for k, _, _ in MENU]
    choice = ask("Select an option", valid_keys)

    for key, _, fn in MENU:
        if key == choice:
            if fn is None:
                print("Bye!")
                sys.exit(0)
            fn()
            return

# ─── entry point ──────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="WAMS launcher — start services on one or multiple machines."
    )
    parser.add_argument(
        "--mode",
        choices=list(CLI_MAP.keys()),
        help="Run mode (skip interactive menu)",
    )
    args = parser.parse_args()

    if args.mode:
        CLI_MAP[args.mode]()
    else:
        interactive_menu()


if __name__ == "__main__":
    main()
