"""
API Test Script — dl-wams-project
Run from the backend folder:  python test_api.py
Make sure your Django server is running first: python manage.py runserver
"""

import requests
import json
import sys

BASE = "http://127.0.0.1:8000"

# ─────────────────────────────────────────────
# CONFIG — fill these in before running
# ─────────────────────────────────────────────
ADMIN_USERNAME  = "Islem" # change em i just put mine to test
ADMIN_PASSWORD  = "password"
DOCTOR_USERNAME = "drIslem"
DOCTOR_PASSWORD = "thep@$$w0rd"

# ─────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────
GREEN  = "\033[92m"
RED    = "\033[91m"
YELLOW = "\033[93m"
CYAN   = "\033[96m"
BOLD   = "\033[1m"
RESET  = "\033[0m"

passed = 0
failed = 0

def header(title):
    print(f"\n{CYAN}{BOLD}{'═'*55}{RESET}")
    print(f"{CYAN}{BOLD}  {title}{RESET}")
    print(f"{CYAN}{BOLD}{'═'*55}{RESET}")

def test(label, response, expected_status, show_body=True):
    global passed, failed
    ok = response.status_code == expected_status
    icon = f"{GREEN}✔ PASS{RESET}" if ok else f"{RED}✘ FAIL{RESET}"
    status_color = GREEN if ok else RED
    print(f"  {icon}  [{status_color}{response.status_code}{RESET}]  {label}")
    if not ok and show_body:
        try:
            body = json.dumps(response.json(), indent=8)
            lines = body.splitlines()
            preview = "\n".join(lines[:8])
            if len(lines) > 8:
                preview += f"\n        ... (+{len(lines)-8} more lines)"
            print(f"        {RED}↳ Response: {preview}{RESET}")
        except Exception:
            print(f"        {RED}↳ Response: {response.text[:300]}{RESET}")
    if ok:
        passed += 1
    else:
        failed += 1

def auth(token):
    return {"Authorization": f"Bearer {token}"}

def skip(label):
    print(f"  {YELLOW}⚠ SKIP{RESET}  {label}")


# ══════════════════════════════════════════════
# GET TOKENS
# ══════════════════════════════════════════════
header("0. SETUP — Getting tokens")

r = requests.post(f"{BASE}/api/token/", json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD})
admin_token = r.json().get("access") if r.status_code == 200 else None
print(f"  {'✔' if admin_token else '✘'}  Admin token:  {'obtained' if admin_token else RED + 'FAILED — check ADMIN_USERNAME/ADMIN_PASSWORD' + RESET}")

r = requests.post(f"{BASE}/api/token/", json={"username": DOCTOR_USERNAME, "password": DOCTOR_PASSWORD})
doctor_token = r.json().get("access") if r.status_code == 200 else None
print(f"  {'✔' if doctor_token else '✘'}  Doctor token: {'obtained' if doctor_token else RED + 'FAILED — check DOCTOR_USERNAME/DOCTOR_PASSWORD' + RESET}")

if not admin_token and not doctor_token:
    print(f"\n{RED}  Both tokens failed. Is the server running? Exiting.{RESET}\n")
    sys.exit(1)


# ══════════════════════════════════════════════
# 1. AUTH
# ══════════════════════════════════════════════
header("1. AUTH — Token endpoints")

r = requests.post(f"{BASE}/api/token/", json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD})
test("POST /api/token/  (admin login)", r, 200)

r = requests.post(f"{BASE}/api/token/", json={"username": DOCTOR_USERNAME, "password": DOCTOR_PASSWORD})
test("POST /api/token/  (doctor login)", r, 200)

r = requests.post(f"{BASE}/api/token/refresh/", json={"refresh": ""})
test("POST /api/token/refresh/  (empty refresh -> 401)", r, 401)

r = requests.post(f"{BASE}/api/token/", json={"username": "wrong", "password": "wrong"})
test("POST /api/token/  (bad credentials -> 401)", r, 401)

r = requests.post(f"{BASE}/api/token/", json={})
test("POST /api/token/  (empty body -> 400)", r, 400)


# ══════════════════════════════════════════════
# 2. USERS
# ══════════════════════════════════════════════
header("2. USERS — /api/users/")

if admin_token:
    r = requests.get(f"{BASE}/api/users/admin-only/", headers=auth(admin_token))
    test("GET /api/users/admin-only/  (as admin -> 200)", r, 200)
else:
    skip("GET /api/users/admin-only/  (as admin) — no admin token")

if doctor_token:
    r = requests.get(f"{BASE}/api/users/admin-only/", headers=auth(doctor_token))
    test("GET /api/users/admin-only/  (as doctor -> 403)", r, 403)
else:
    skip("GET /api/users/admin-only/  (as doctor) — no doctor token")

r = requests.get(f"{BASE}/api/users/admin-only/")
test("GET /api/users/admin-only/  (no token -> 401)", r, 401)

if doctor_token:
    r = requests.get(f"{BASE}/api/users/doctor/", headers=auth(doctor_token))
    test("GET /api/users/doctor/  (as doctor -> 200)", r, 200)

if admin_token:
    r = requests.get(f"{BASE}/api/users/doctor/", headers=auth(admin_token))
    test("GET /api/users/doctor/  (as admin -> 200)", r, 200)

r = requests.get(f"{BASE}/api/users/doctor/")
test("GET /api/users/doctor/  (no token -> 401)", r, 401)


# ══════════════════════════════════════════════
# 3. PATIENTS — List
# ══════════════════════════════════════════════
header("3. PATIENTS — GET /api/patients/")

if admin_token:
    r = requests.get(f"{BASE}/api/patients/", headers=auth(admin_token))
    test("GET /api/patients/  (as admin -> 200)", r, 200)

if doctor_token:
    r = requests.get(f"{BASE}/api/patients/", headers=auth(doctor_token))
    test("GET /api/patients/  (as doctor -> 200)", r, 200)

r = requests.get(f"{BASE}/api/patients/")
test("GET /api/patients/  (no token -> 401)", r, 401)


# ══════════════════════════════════════════════
# 4. PATIENTS — Create
# ══════════════════════════════════════════════
header("4. PATIENTS — POST /api/patients/create/")

# gender must be 'male' | 'female' | 'other'  (not 'M')
NEW_PATIENT = {
    "first_name":    "Test",
    "last_name":     "Patient",
    "date_of_birth": "1990-06-15",
    "gender":        "male",
    "phone_number":  "0550000099",
}

created_patient_id = None

if admin_token:
    r = requests.post(f"{BASE}/api/patients/create/", json=NEW_PATIENT, headers=auth(admin_token))
    expected = 200 if r.status_code == 200 else 201
    test("POST /api/patients/create/  (as admin -> 201, or 200 if already exists)", r, expected)
    if r.status_code in (200, 201):
        body = r.json()
        created_patient_id = body.get("id") or (body.get("patient") or {}).get("id")
        print(f"        {GREEN}↳ Created patient ID: {created_patient_id}{RESET}")

if doctor_token:
    r = requests.post(f"{BASE}/api/patients/create/", json=NEW_PATIENT, headers=auth(doctor_token))
    # same phone → patient exists → doctor gets linked → 200
    test("POST /api/patients/create/  (as doctor, duplicate -> 200 linked)", r, 200)
    if r.status_code in (200, 201) and not created_patient_id:
        body = r.json()
        created_patient_id = body.get("id") or (body.get("patient") or {}).get("id")

r = requests.post(f"{BASE}/api/patients/create/", json=NEW_PATIENT)
test("POST /api/patients/create/  (no token -> 401)", r, 401)

if admin_token:
    r = requests.post(f"{BASE}/api/patients/create/", json={}, headers=auth(admin_token))
    test("POST /api/patients/create/  (empty body -> 400)", r, 400)

if admin_token:
    r = requests.post(
        f"{BASE}/api/patients/create/",
        json={**NEW_PATIENT, "phone_number": "0550000088", "gender": "INVALID"},
        headers=auth(admin_token)
    )
    test("POST /api/patients/create/  (bad gender value -> 400)", r, 400)


# ══════════════════════════════════════════════
# 5. PATIENTS — Detail
# ══════════════════════════════════════════════
header("5. PATIENTS — GET /api/patients/<pk>/")

pk = created_patient_id or 1
if not created_patient_id:
    print(f"  {YELLOW}⚠ Patient creation failed earlier — using pk=1 as fallback (may 404){RESET}")

if admin_token:
    r = requests.get(f"{BASE}/api/patients/{pk}/", headers=auth(admin_token))
    test(f"GET /api/patients/{pk}/  (as admin -> 200)", r, 200)

if doctor_token:
    r = requests.get(f"{BASE}/api/patients/{pk}/", headers=auth(doctor_token))
    # doctor was linked above, so expect 200
    test(f"GET /api/patients/{pk}/  (as doctor, linked -> 200)", r, 200)

r = requests.get(f"{BASE}/api/patients/{pk}/")
test(f"GET /api/patients/{pk}/  (no token -> 401)", r, 401)

if admin_token:
    r = requests.get(f"{BASE}/api/patients/999999/", headers=auth(admin_token))
    test("GET /api/patients/999999/  (non-existent -> 404)", r, 404)


# ══════════════════════════════════════════════
# 6. PATIENTS — Update
# ══════════════════════════════════════════════
header("6. PATIENTS — PUT /api/patients/<pk>/update/")

if admin_token:
    r = requests.put(
        f"{BASE}/api/patients/{pk}/update/",
        json={"first_name": "Updated", "gender": "male"},
        headers=auth(admin_token)
    )
    test(f"PUT /api/patients/{pk}/update/  (as admin -> 200)", r, 200)

if doctor_token:
    r = requests.put(
        f"{BASE}/api/patients/{pk}/update/",
        json={"last_name": "DocUpdated"},
        headers=auth(doctor_token)
    )
    test(f"PUT /api/patients/{pk}/update/  (as doctor, linked -> 200)", r, 200)

r = requests.put(f"{BASE}/api/patients/{pk}/update/", json={"first_name": "X"})
test(f"PUT /api/patients/{pk}/update/  (no token -> 401)", r, 401)


# ══════════════════════════════════════════════
# 7. FILES — Upload & Delete
# ══════════════════════════════════════════════
header("7. FILES — /api/patients/<pk>/files/")

uploaded_file_id = None

if admin_token and created_patient_id:
    dummy = ("test_file.txt", b"dummy medical content", "text/plain")
    r = requests.post(
        f"{BASE}/api/patients/{pk}/files/upload/",
        files={"file": dummy},
        headers=auth(admin_token)
    )
    test(f"POST /api/patients/{pk}/files/upload/  (as admin -> 201)", r, 201)
    if r.status_code == 201:
        uploaded_file_id = r.json().get("id")
        print(f"        {GREEN}↳ Uploaded file ID: {uploaded_file_id}{RESET}")

    dummy = ("test_file.txt", b"dummy medical content", "text/plain")
    r = requests.post(f"{BASE}/api/patients/{pk}/files/upload/", files={"file": dummy})
    test(f"POST /api/patients/{pk}/files/upload/  (no token -> 401)", r, 401)
else:
    skip("File upload tests — no patient ID available")

if admin_token and uploaded_file_id:
    r = requests.delete(
        f"{BASE}/api/patients/files/{uploaded_file_id}/delete/",
        headers=auth(admin_token)
    )
    test(f"DELETE /api/patients/files/{uploaded_file_id}/delete/  (as admin -> 204)", r, 204, show_body=False)

if admin_token:
    r = requests.delete(f"{BASE}/api/patients/files/999999/delete/", headers=auth(admin_token))
    test("DELETE /api/patients/files/999999/delete/  (non-existent -> 404)", r, 404)


# ══════════════════════════════════════════════
# 8. PATIENTS — Delete (last, destroys data)
# ══════════════════════════════════════════════
header("8. PATIENTS — DELETE /api/patients/<pk>/delete/")

if doctor_token and created_patient_id:
    r = requests.delete(f"{BASE}/api/patients/{pk}/delete/", headers=auth(doctor_token))
    test(f"DELETE /api/patients/{pk}/delete/  (as doctor -> 403)", r, 403)

r = requests.delete(f"{BASE}/api/patients/{pk}/delete/")
test(f"DELETE /api/patients/{pk}/delete/  (no token -> 401)", r, 401)

if admin_token and created_patient_id:
    r = requests.delete(f"{BASE}/api/patients/{pk}/delete/", headers=auth(admin_token))
    test(f"DELETE /api/patients/{pk}/delete/  (as admin -> 204)", r, 204, show_body=False)
else:
    skip("DELETE patient (admin) — no test patient to clean up")

if admin_token and created_patient_id:
    r = requests.delete(f"{BASE}/api/patients/{pk}/delete/", headers=auth(admin_token))
    print(f"Status: {r.status_code}")
    print(f"Response: {r.text}")
    test(f"DELETE /api/patients/{pk}/delete/  (as admin -> 204)", r, 204, show_body=False)


# ══════════════════════════════════════════════
# SUMMARY
# ══════════════════════════════════════════════
total = passed + failed
print(f"\n{BOLD}{'═'*55}{RESET}")
if failed == 0:
    print(f"{BOLD}  {GREEN}ALL {total} TESTS PASSED ✔{RESET}")
else:
    print(f"{BOLD}  {GREEN}{passed} passed{RESET}  ·  {RED}{failed} failed{RESET}  ·  {total} total{RESET}")
print(f"{BOLD}{'═'*55}{RESET}\n")

sys.exit(0 if failed == 0 else 1)
