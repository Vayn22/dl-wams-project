# WAMS – Multi-Machine Setup Guide

## How the architecture works

```
PC1                                  PC2 (and PC3, PC4…)
┌─────────────────────────────┐      ┌──────────────────────────────┐
│  Consul SERVER  (port 8500) │◄────►│  Consul CLIENT agent         │
│  Traefik        (port 8080) │      │                              │
│  auth_db                    │      │  patient_db                  │
│  auth service   (port 8001) │      │  patient service (port 8002) │
└─────────────────────────────┘      └──────────────────────────────┘
```

- **Consul server** runs only on PC1. It is the single source of truth for service discovery.
- Every other PC runs a **Consul client agent** that joins PC1 over LAN. All service registrations made on PC2 automatically appear in PC1's Consul catalog.
- **Traefik** (also on PC1) reads the Consul catalog and routes HTTP traffic to whichever machine each service is running on — it doesn't need to be on the same machine as the service.
- Services register their **real LAN IP** with Consul, so Traefik can reach them across the network.

---

## Prerequisites (every PC)

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows / macOS) or Docker Engine + Docker Compose plugin (Linux)
- Python 3.10 or newer (only needed for `run.py`)
- All PCs on the **same LAN** (home router, office switch, etc.)
- Firewall must allow the following ports **between PCs**:

| Port | Protocol | Used for |
|------|----------|----------|
| 8500 | TCP | Consul HTTP API |
| 8300 | TCP | Consul Server RPC |
| 8301 | TCP + UDP | Consul Serf LAN gossip |
| 8001 | TCP | auth service |
| 8002 | TCP | patient service |

---

## Option A – Run everything on ONE machine (development)

```powershell
# from the repo root
python run.py --mode all
# or just: python run.py  → pick option [1]
```

Open:
- Consul UI → http://localhost:8500
- Traefik dashboard → http://localhost:8081
- Auth service → http://localhost:8001
- Patient service → http://localhost:8002

---

## Option B – Two machines (PC1 + PC2)

### Step 1 – Find your LAN IPs

On Windows: `ipconfig` → look for "IPv4 Address" on your Wi-Fi / Ethernet adapter  
On Linux/macOS: `ip addr` or `ifconfig`

Example:
- PC1 IP: `192.168.1.10`
- PC2 IP: `192.168.1.20`

### Step 2 – Start PC1

```powershell
# Windows PowerShell
$env:PC1_IP = "192.168.1.10"
python run.py --mode pc1

# Linux / macOS
export PC1_IP=192.168.1.10
python run.py --mode pc1
```

Wait until you see Consul running — check http://192.168.1.10:8500 in a browser.

### Step 3 – Start PC2

```powershell
# Windows PowerShell (on PC2)
$env:PC1_IP = "192.168.1.10"
$env:PC2_IP = "192.168.1.20"
python run.py --mode pc2

# Linux / macOS
export PC1_IP=192.168.1.10
export PC2_IP=192.168.1.20
python run.py --mode pc2
```

After a few seconds, go to http://192.168.1.10:8500 — you should see **both nodes** in the Consul UI and both services registered.

---

## Option C – Three or more machines (PC3, PC4…)

1. Copy `backend/services/docker-compose.extra-pc.yml` to a new file, e.g. `docker-compose.pc3.yml`.
2. Uncomment and fill in your new service(s) inside it.
3. On that machine:

```powershell
$env:PC1_IP = "192.168.1.10"
$env:THIS_IP = "192.168.1.30"
docker compose -f backend/services/docker-compose.pc3.yml up --build
```

The Consul client agent in that compose file joins PC1 automatically.

---

## How Consul service registration works (important)

Each service container calls `register_consul.py` on startup. It registers:
- **Address** = `SERVICE_HOST` env var → must be the real LAN IP when running multi-machine, not `auth` or `patient` (those are Docker-internal hostnames only reachable within the same machine).

The compose files for PC1/PC2 already set `SERVICE_HOST` to the `PC1_IP`/`PC2_IP` env var, so this is handled automatically.

---

## Stopping everything

```powershell
python run.py --mode stop
```

---

## Quick reference – run.py modes

| Mode | What it starts |
|------|----------------|
| `all` | Everything on this one machine |
| `pc1` | Consul server + Traefik + auth_db + auth |
| `pc2` | Consul client + patient_db + patient |
| `infra` | Consul + Traefik only (no services) |
| `auth` | auth_db + auth only (no patient) |
| `patient` | patient_db + patient only (no auth) |
| `stop` | Stop all services |
| `logs` | Tail live logs |
| `status` | Show running containers |

Run `python run.py` with no arguments for the interactive menu.
