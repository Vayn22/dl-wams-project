#!/usr/bin/env python3
"""
=============================================================================
  FULL END-TO-END TEST SUITE  —  dl-wams-project microservices backend
=============================================================================

Services tested
───────────────
  • Auth Service    → http://localhost:8001
  • Patient Service → http://localhost:8002
  • AI Service      → http://localhost:8003

What it does
────────────
  1.  Checks health endpoints (no auth needed).
  2.  Creates an admin user via the open /dev-create-user/ endpoint.
  3.  Obtains a JWT pair (login) and a refreshed access token.
  4.  Calls GET /api/users/me/ to verify the token payload.
  5.  Lists specialties.
  6.  Creates a doctor user, lists/gets/updates/deletes that doctor.
  7.  Creates a patient, lists/gets/updates that patient.
  8.  Uploads a dummy medical file, then deletes it.
  9.  Creates an appointment, lists/gets/updates/deletes it.
  10. Deletes the patient (cascade) and verifies 404 on re-fetch.
  11. Tests AI segmentation (JWT required, returns base64 mask).
  12. Checks that protected routes reject anonymous requests (all services).

Usage
─────
  python test_all.py
  python test_all.py --auth 8001 --patient 8002 --ai 8003
  python test_all.py --auth-host 192.168.1.5 --patient-host 192.168.1.5 --ai-host 192.168.1.5

Requirements
────────────
  pip install requests
=============================================================================
"""

import argparse
import base64
import io
import json
import struct
import sys
import textwrap
import time
import zlib
from datetime import datetime, timezone, timedelta
from typing import Any, Optional

try:
    import requests
except ImportError:
    sys.exit("❌  'requests' is not installed.  Run:  pip install requests")


# ─────────────────────────────────────────────────────────────────────────────
# ANSI colours
# ─────────────────────────────────────────────────────────────────────────────
GREEN  = "\033[92m"
RED    = "\033[91m"
YELLOW = "\033[93m"
CYAN   = "\033[96m"
BOLD   = "\033[1m"
RESET  = "\033[0m"


# ─────────────────────────────────────────────────────────────────────────────
# State shared across tests
# ─────────────────────────────────────────────────────────────────────────────
STATE: dict[str, Any] = {
    "access_token":   None,
    "refresh_token":  None,
    "admin_user_id":  None,
    "doctor_id":      None,
    "patient_id":     None,
    "file_id":        None,
    "appointment_id": None,
}

RESULTS: list[dict] = []   # {name, passed, detail}


# ─────────────────────────────────────────────────────────────────────────────
# Pure-Python 1x1 red PNG generator (no Pillow required)
# ─────────────────────────────────────────────────────────────────────────────
def _make_test_png_bytes() -> bytes:
    """
    Return a valid 1x1 red PNG as raw bytes, using only stdlib (struct + zlib).
    """
    # PNG signature
    signature = b"\x89PNG\r\n\x1a\n"

    # IHDR chunk: width=1, height=1, bit depth=8, colour type=2 (RGB)
    ihdr_data = struct.pack(">IIBBBBB", 1, 1, 8, 2, 0, 0, 0)
    ihdr_crc = zlib.crc32(b"IHDR" + ihdr_data) & 0xFFFFFFFF
    ihdr_chunk = (
        struct.pack(">I", len(ihdr_data)) + b"IHDR" + ihdr_data + struct.pack(">I", ihdr_crc)
    )

    # Raw image data: filter byte 0 + RGB red pixel
    raw = b"\x00\xff\x00\x00"
    compressed = zlib.compress(raw)
    idat_crc = zlib.crc32(b"IDAT" + compressed) & 0xFFFFFFFF
    idat_chunk = (
        struct.pack(">I", len(compressed)) + b"IDAT" + compressed + struct.pack(">I", idat_crc)
    )

    # IEND chunk
    iend_crc = zlib.crc32(b"IEND") & 0xFFFFFFFF
    iend_chunk = b"\x00\x00\x00\x00IEND" + struct.pack(">I", iend_crc)

    return signature + ihdr_chunk + idat_chunk + iend_chunk


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────
def _auth_headers() -> dict:
    token = STATE["access_token"]
    if not token:
        raise RuntimeError("No access token available yet.")
    return {"Authorization": f"Bearer {token}"}


def _pretty(data: Any) -> str:
    try:
        return json.dumps(data, indent=2, ensure_ascii=False)
    except Exception:
        return str(data)


def _record(name: str, passed: bool, detail: str = "") -> None:
    icon = f"{GREEN}✓{RESET}" if passed else f"{RED}✗{RESET}"
    print(f"  {icon}  {name}")
    if detail and not passed:
        indented = textwrap.indent(detail, "       ")
        print(f"{YELLOW}{indented}{RESET}")
    RESULTS.append({"name": name, "passed": passed, "detail": detail})


def _section(title: str) -> None:
    bar = "─" * 60
    print(f"\n{CYAN}{BOLD}{bar}{RESET}")
    print(f"{CYAN}{BOLD}  {title}{RESET}")
    print(f"{CYAN}{BOLD}{bar}{RESET}")


def _expect(
    test_name: str,
    response: requests.Response,
    expected_status: int | list[int],
    *,
    store_key: Optional[str] = None,
    store_fn=None,
    extra_check=None,
) -> Optional[dict]:
    """
    Generic assertion helper.
    - expected_status: int or list[int]
    - store_key / store_fn: if the call succeeds, persist something into STATE.
    - extra_check: callable(response_body) -> (bool, str_reason)
    Returns the parsed JSON body on success, None on failure.
    """
    allowed = [expected_status] if isinstance(expected_status, int) else expected_status

    ok = response.status_code in allowed
    detail = ""
    body = None

    try:
        body = response.json()
    except Exception:
        body = response.text

    if not ok:
        detail = (
            f"Expected HTTP {allowed}, got {response.status_code}\n"
            f"Body: {_pretty(body)}"
        )
    elif extra_check:
        check_ok, check_reason = extra_check(body)
        if not check_ok:
            ok = False
            detail = f"Assertion failed: {check_reason}\nBody: {_pretty(body)}"

    if ok and store_key and store_fn and body:
        STATE[store_key] = store_fn(body)

    _record(test_name, ok, detail)
    return body if ok else None


# ─────────────────────────────────────────────────────────────────────────────
# Test groups
# ─────────────────────────────────────────────────────────────────────────────

def test_health(AUTH: str, PATIENT: str, AI: str) -> None:
    _section("1 · Health checks")

    r = requests.get(f"{AUTH}/api/users/health/", timeout=10)
    _expect(
        "Auth service health",
        r, 200,
        extra_check=lambda b: (b.get("status") == "ok", f"status != ok: {b}")
    )

    r = requests.get(f"{PATIENT}/api/health/", timeout=10)
    _expect(
        "Patient service health",
        r, 200,
        extra_check=lambda b: (b.get("status") == "ok", f"status != ok: {b}")
    )

    r = requests.get(f"{AI}/api/health/", timeout=10)
    _expect(
        "AI service health",
        r, 200,
        extra_check=lambda b: (b.get("status") == "ok", f"status != ok: {b}")
    )


def test_dev_create_user(AUTH: str) -> None:
    _section("2 · Dev create user (open endpoint)")

    payload = {"username": "Cuddy-Lisa", "password": "pass"}
    r = requests.post(f"{AUTH}/api/users/dev-create-user/", json=payload, timeout=10)
    body = _expect(
        "POST /api/users/dev-create-user/ → 200",
        r, 200,
        store_key="admin_user_id",
        store_fn=lambda b: b.get("id"),
        extra_check=lambda b: ("id" in b, "Response missing 'id' field"),
    )

    if body:
        print(f"         Admin user id: {STATE['admin_user_id']}")


def test_token(AUTH: str) -> None:
    _section("3 · JWT — obtain & refresh")

    # --- obtain ---
    payload = {"username": "test_admin", "password": "TestAdmin@1234"}
    r = requests.post(f"{AUTH}/api/token/", json=payload, timeout=10)
    body = _expect(
        "POST /api/token/ → 200",
        r, 200,
        extra_check=lambda b: (
            "access" in b and "refresh" in b,
            "Missing 'access' or 'refresh' in response"
        ),
    )
    if body:
        STATE["access_token"]  = body["access"]
        STATE["refresh_token"] = body["refresh"]
        print(f"         Groups in token: {body.get('user', {}).get('groups', [])}")
        print(f"         is_superuser:    {body.get('user', {}).get('is_superuser')}")

    # --- /login/ alias ---
    r = requests.post(f"{AUTH}/api/users/login/", json=payload, timeout=10)
    _expect(
        "POST /api/users/login/ → 200",
        r, 200,
        extra_check=lambda b: ("access" in b, "Missing 'access' key"),
    )

    # --- refresh ---
    if STATE["refresh_token"]:
        r = requests.post(
            f"{AUTH}/api/token/refresh/",
            json={"refresh": STATE["refresh_token"]},
            timeout=10,
        )
        body = _expect(
            "POST /api/token/refresh/ → 200",
            r, 200,
            extra_check=lambda b: ("access" in b, "Missing 'access' key"),
        )
        if body:
            STATE["access_token"] = body["access"]  # use the freshest token


def test_me(AUTH: str) -> None:
    _section("4 · /me/ — token identity")

    r = requests.get(f"{AUTH}/api/users/me/", headers=_auth_headers(), timeout=10)
    _expect(
        "GET /api/users/me/ → 200",
        r, 200,
        extra_check=lambda b: ("username" in b, "Missing 'username' in body"),
    )

    # without token → 401
    r = requests.get(f"{AUTH}/api/users/me/", timeout=10)
    _expect("GET /api/users/me/ (no token) → 401", r, 401)


def test_specialties(AUTH: str) -> None:
    _section("5 · Specialties")

    r = requests.get(
        f"{AUTH}/api/users/specialties/",
        headers=_auth_headers(),
        timeout=10,
    )
    _expect(
        "GET /api/users/specialties/ → 200",
        r, 200,
        extra_check=lambda b: (isinstance(b, list), "Expected a JSON array"),
    )


def test_doctors(AUTH: str) -> None:
    _section("6 · Doctors CRUD")

    headers = _auth_headers()

    # --- create ---
    ts = int(time.time())
    doctor_payload = {
        "username":   f"dr_house_{ts}",
        "first_name": "Gregory",
        "last_name":  "House",
        "email":      f"house_{ts}@hospital.test",
        "password":   "Doctor@5678",
    }
    r = requests.post(f"{AUTH}/api/users/doctors/create/", json=doctor_payload, headers=headers, timeout=10)
    body = _expect(
        "POST /api/users/doctors/create/ → 201",
        r, 201,
        store_key="doctor_id",
        store_fn=lambda b: b.get("id"),
        extra_check=lambda b: ("id" in b, "Missing 'id' in doctor response"),
    )
    if body:
        print(f"         Doctor id: {STATE['doctor_id']}")

    if not STATE["doctor_id"]:
        _record("(Skipping remaining doctor tests — create failed)", False)
        return

    pk = STATE["doctor_id"]

    # --- list ---
    r = requests.get(f"{AUTH}/api/users/doctors/", headers=headers, timeout=10)
    _expect(
        "GET /api/users/doctors/ → 200",
        r, 200,
        extra_check=lambda b: (isinstance(b, list), "Expected JSON array"),
    )

    # --- detail ---
    r = requests.get(f"{AUTH}/api/users/doctors/{pk}/", headers=headers, timeout=10)
    _expect(
        f"GET /api/users/doctors/{pk}/ → 200",
        r, 200,
        extra_check=lambda b: (b.get("id") == pk, f"Expected id={pk}"),
    )

    # --- update (PATCH) ---
    r = requests.patch(
        f"{AUTH}/api/users/doctors/{pk}/update/",
        json={"first_name": "Greg"},
        headers=headers,
        timeout=10,
    )
    _expect(
        f"PATCH /api/users/doctors/{pk}/update/ → 200",
        r, 200,
        extra_check=lambda b: (b.get("first_name") == "Greg", "first_name not updated"),
    )

    # --- delete ---
    r = requests.delete(f"{AUTH}/api/users/doctors/{pk}/delete/", headers=headers, timeout=10)
    _expect(f"DELETE /api/users/doctors/{pk}/delete/ → 204", r, 204)

    # --- confirm gone ---
    r = requests.get(f"{AUTH}/api/users/doctors/{pk}/", headers=headers, timeout=10)
    _expect(f"GET /api/users/doctors/{pk}/ after delete → 404", r, 404)


def test_patients(PATIENT: str) -> None:
    _section("7 · Patients CRUD")

    headers = _auth_headers()
    ts = int(time.time())

    patient_payload = {
        "first_name":   "John",
        "last_name":    "Doe",
        "age":          35,
        "date_of_birth": "1990-01-15",
        "gender":       "male",
        "blood_type":   "O+",
        "diagnosis":    "Hypertension",
        "notes":        "Regular checkup needed.",
        "phone_number": f"+213{ts % 10_000_000_000:010d}",
        "address":      "123 Test Street, Algiers",
    }

    # --- create ---
    r = requests.post(f"{PATIENT}/api/patients/create/", json=patient_payload, headers=headers, timeout=10)
    body = _expect(
        "POST /api/patients/create/ → 201 (or 200 if duplicate phone)",
        r, [200, 201],
        store_key="patient_id",
        store_fn=lambda b: b.get("id") or b.get("patient", {}).get("id"),
        extra_check=lambda b: (
            ("id" in b or "patient" in b),
            "Missing 'id' or 'patient' key in response"
        ),
    )
    if body and STATE["patient_id"] is None:
        nested = body.get("patient", {})
        STATE["patient_id"] = nested.get("id")

    if not STATE["patient_id"]:
        _record("(Skipping remaining patient tests — create failed)", False)
        return

    pk = STATE["patient_id"]
    print(f"         Patient id: {pk}")

    # --- list ---
    r = requests.get(f"{PATIENT}/api/patients/", headers=headers, timeout=10)
    _expect(
        "GET /api/patients/ → 200",
        r, 200,
        extra_check=lambda b: (isinstance(b, list), "Expected JSON array"),
    )

    # --- detail ---
    r = requests.get(f"{PATIENT}/api/patients/{pk}/", headers=headers, timeout=10)
    _expect(
        f"GET /api/patients/{pk}/ → 200",
        r, 200,
        extra_check=lambda b: (b.get("id") == pk, f"Expected id={pk}"),
    )

    # --- update (PATCH) ---
    r = requests.patch(
        f"{PATIENT}/api/patients/{pk}/update/",
        json={"notes": "Updated during automated test."},
        headers=headers,
        timeout=10,
    )
    _expect(
        f"PATCH /api/patients/{pk}/update/ → 200",
        r, 200,
        extra_check=lambda b: ("Updated during automated test." in b.get("notes", ""), "notes not updated"),
    )


def test_files(PATIENT: str) -> None:
    _section("8 · Medical file upload & delete")

    pk = STATE["patient_id"]
    if not pk:
        _record("(Skipping — no patient_id)", False)
        return

    headers = _auth_headers()

    # --- upload ---
    dummy_content = b"%PDF-1.4 dummy content for testing purposes only"
    file_obj = io.BytesIO(dummy_content)

    r = requests.post(
        f"{PATIENT}/api/patients/{pk}/files/upload/",
        headers=headers,
        data={"label": "Test MRI Report"},
        files={"file": ("test_mri.pdf", file_obj, "application/pdf")},
        timeout=15,
    )
    body = _expect(
        f"POST /api/patients/{pk}/files/upload/ → 201",
        r, 201,
        store_key="file_id",
        store_fn=lambda b: b.get("id"),
        extra_check=lambda b: ("id" in b, "Missing 'id' in file response"),
    )
    if body:
        print(f"         File id: {STATE['file_id']}")

    # --- delete ---
    fid = STATE["file_id"]
    if fid:
        r = requests.delete(
            f"{PATIENT}/api/patients/files/{fid}/delete/",
            headers=headers,
            timeout=10,
        )
        _expect(f"DELETE /api/patients/files/{fid}/delete/ → 204", r, 204)
    else:
        _record("(Skipping file delete — upload failed)", False)


def test_appointments(PATIENT: str) -> None:
    _section("9 · Appointments CRUD")

    pk = STATE["patient_id"]
    if not pk:
        _record("(Skipping — no patient_id)", False)
        return

    headers = _auth_headers()

    future_dt = (datetime.now(timezone.utc) + timedelta(days=1)).strftime("%Y-%m-%dT%H:%M:%SZ")

    appointment_payload = {
        "patient":   pk,
        "date_time": future_dt,
        "notes":     "Routine follow-up appointment.",
    }

    # --- create ---
    r = requests.post(
        f"{PATIENT}/api/appointments/create/",
        json=appointment_payload,
        headers=headers,
        timeout=10,
    )
    body = _expect(
        "POST /api/appointments/create/ → 201",
        r, 201,
        store_key="appointment_id",
        store_fn=lambda b: b.get("id"),
        extra_check=lambda b: ("id" in b, "Missing 'id' in appointment response"),
    )
    if body:
        print(f"         Appointment id: {STATE['appointment_id']}")

    aid = STATE["appointment_id"]
    if not aid:
        _record("(Skipping remaining appointment tests — create failed)", False)
        return

    # --- list ---
    r = requests.get(f"{PATIENT}/api/appointments/", headers=headers, timeout=10)
    _expect(
        "GET /api/appointments/ → 200",
        r, 200,
        extra_check=lambda b: (isinstance(b, list), "Expected JSON array"),
    )

    # --- detail ---
    r = requests.get(f"{PATIENT}/api/appointments/{aid}/", headers=headers, timeout=10)
    _expect(
        f"GET /api/appointments/{aid}/ → 200",
        r, 200,
        extra_check=lambda b: (b.get("id") == aid, f"Expected id={aid}"),
    )

    # --- update (PATCH) ---
    r = requests.patch(
        f"{PATIENT}/api/appointments/{aid}/update/",
        json={"notes": "Rescheduled during automated test."},
        headers=headers,
        timeout=10,
    )
    _expect(
        f"PATCH /api/appointments/{aid}/update/ → 200",
        r, 200,
        extra_check=lambda b: (
            "Rescheduled during automated test." in b.get("notes", ""),
            "notes not updated"
        ),
    )

    # --- delete ---
    r = requests.delete(
        f"{PATIENT}/api/appointments/{aid}/delete/",
        headers=headers,
        timeout=10,
    )
    _expect(f"DELETE /api/appointments/{aid}/delete/ → 204", r, 204)

    # --- confirm gone ---
    r = requests.get(f"{PATIENT}/api/appointments/{aid}/", headers=headers, timeout=10)
    _expect(f"GET /api/appointments/{aid}/ after delete → 404", r, 404)


def test_patient_delete(PATIENT: str) -> None:
    _section("10 · Patient delete & cascade verification")

    pk = STATE["patient_id"]
    if not pk:
        _record("(Skipping — no patient_id)", False)
        return

    headers = _auth_headers()

    r = requests.delete(
        f"{PATIENT}/api/patients/{pk}/delete/",
        headers=headers,
        timeout=10,
    )
    _expect(f"DELETE /api/patients/{pk}/delete/ → 204", r, 204)

    r = requests.get(f"{PATIENT}/api/patients/{pk}/", headers=headers, timeout=10)
    _expect(f"GET /api/patients/{pk}/ after delete → 404", r, 404)


def test_ai(AI: str) -> None:
    _section("11 · AI Segmentation")

    headers = _auth_headers()

    # Build a valid 1x1 red PNG without any external library
    png_bytes = _make_test_png_bytes()
    buf = io.BytesIO(png_bytes)

    r = requests.post(
        f"{AI}/api/segment/",
        files={"image": ("test.png", buf, "image/png")},
        headers=headers,
        timeout=30,
    )
    _expect(
        "POST /api/segment/ → 200 (JWT with ai.use_segmentation)",
        r, 200,
        extra_check=lambda b: (
            "mask" in b and isinstance(b["mask"], str),
            "Expected base64-encoded 'mask' in response"
        ),
    )

    # Without token → 401 is tested later in test_auth_required


def test_auth_required(AUTH: str, PATIENT: str, AI: str) -> None:
    _section("12 · Auth enforcement — protected routes reject anonymous")

    pairs = [
        ("GET", f"{AUTH}/api/users/me/"),
        ("GET", f"{AUTH}/api/users/specialties/"),
        ("GET", f"{AUTH}/api/users/doctors/"),
        ("GET", f"{PATIENT}/api/patients/"),
        ("GET", f"{PATIENT}/api/appointments/"),
        ("POST", f"{AI}/api/segment/"),
    ]

    for method, url in pairs:
        r = requests.request(method, url, timeout=10)
        short = url.split("//", 1)[-1].split("/", 1)[-1]
        _expect(
            f"{method} /{short} (no token) → 401",
            r, 401,
        )


# ─────────────────────────────────────────────────────────────────────────────
# Summary
# ─────────────────────────────────────────────────────────────────────────────
def print_summary() -> int:
    total  = len(RESULTS)
    passed = sum(1 for r in RESULTS if r["passed"])
    failed = total - passed

    bar = "═" * 60
    print(f"\n{BOLD}{bar}{RESET}")
    print(f"{BOLD}  RESULTS: {GREEN}{passed} passed{RESET}{BOLD}, {RED}{failed} failed{RESET}{BOLD} / {total} total{RESET}")
    print(f"{BOLD}{bar}{RESET}")

    if failed:
        print(f"\n{RED}{BOLD}Failed tests:{RESET}")
        for r in RESULTS:
            if not r["passed"]:
                print(f"  {RED}✗  {r['name']}{RESET}")
                if r["detail"]:
                    print(textwrap.indent(r["detail"], "     "))
        print()

    return 0 if failed == 0 else 1


# ─────────────────────────────────────────────────────────────────────────────
# Entry point
# ─────────────────────────────────────────────────────────────────────────────
def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="End-to-end test suite for dl-wams-project backend."
    )
    p.add_argument("--auth-host",     default="localhost", help="Auth service hostname")
    p.add_argument("--patient-host",  default="localhost", help="Patient service hostname")
    p.add_argument("--ai-host",       default="localhost", help="AI service hostname")
    p.add_argument("--auth",          default=8001, type=int, help="Auth service port (default: 8001)")
    p.add_argument("--patient",       default=8002, type=int, help="Patient service port (default: 8002)")
    p.add_argument("--ai",            default=8003, type=int, help="AI service port (default: 8003)")
    return p.parse_args()


def main() -> None:
    args = parse_args()
    AUTH    = f"http://{args.auth_host}:{args.auth}"
    PATIENT = f"http://{args.patient_host}:{args.patient}"
    AI      = f"http://{args.ai_host}:{args.ai}"

    print(f"\n{BOLD}{'═'*60}{RESET}")
    print(f"{BOLD}  dl-wams-project · Full API Test Suite{RESET}")
    print(f"{BOLD}{'═'*60}{RESET}")
    print(f"  Auth service    → {CYAN}{AUTH}{RESET}")
    print(f"  Patient service → {CYAN}{PATIENT}{RESET}")
    print(f"  AI service      → {CYAN}{AI}{RESET}")

    try:
        test_health(AUTH, PATIENT, AI)
        test_dev_create_user(AUTH)
        test_token(AUTH)

        if not STATE["access_token"]:
            print(f"\n{RED}{BOLD}Cannot continue — failed to obtain a JWT token.{RESET}\n")
            sys.exit(1)

        test_me(AUTH)
        test_specialties(AUTH)
        test_doctors(AUTH)
        test_patients(PATIENT)
        test_files(PATIENT)
        test_appointments(PATIENT)
        test_patient_delete(PATIENT)
        test_ai(AI)
        test_auth_required(AUTH, PATIENT, AI)

    except requests.exceptions.ConnectionError as exc:
        print(f"\n{RED}{BOLD}Connection error — is the backend running?{RESET}")
        print(f"{RED}{exc}{RESET}\n")
        sys.exit(1)
    except KeyboardInterrupt:
        print(f"\n{YELLOW}Interrupted.{RESET}\n")
        sys.exit(1)

    sys.exit(print_summary())


if __name__ == "__main__":
    main()