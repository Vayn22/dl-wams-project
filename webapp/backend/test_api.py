"""
API Test Script - dl-wams-project
Run from your backend folder:  python test_api.py
Requires: pip install requests
"""

import requests
import json

BASE = "http://127.0.0.1:8000/api"

# ─────────────────────────────────────────────
#  CONFIG — fill these in before running
# ─────────────────────────────────────────────
ADMIN_USERNAME  = "Islem"
ADMIN_PASSWORD  = "password"
DOCTOR_USERNAME = "Islem"
DOCTOR_PASSWORD = "password"

# A patient ID that already exists in your DB (for detail/update/delete tests)
EXISTING_PATIENT_ID = 1
# A medical file ID that already exists (for file_delete test)
EXISTING_FILE_ID = 1
# ─────────────────────────────────────────────

PASS = "\033[92m✔ PASS\033[0m"
FAIL = "\033[91m✘ FAIL\033[0m"
INFO = "\033[94m─\033[0m"


def section(title):
    print(f"\n\033[1m{'='*55}\033[0m")
    print(f"\033[1m  {title}\033[0m")
    print(f"\033[1m{'='*55}\033[0m")


def check(label, response, expected_status):
    ok = response.status_code == expected_status
    badge = PASS if ok else FAIL
    print(f"  {badge}  [{response.status_code}]  {label}")
    if not ok:
        try:
            print(f"        {INFO} Response: {json.dumps(response.json(), indent=8)}")
        except Exception:
            print(f"        {INFO} Response: {response.text[:200]}")
    return response


def get_token(username, password):
    r = requests.post(f"{BASE}/token/", json={"username": username, "password": password})
    if r.status_code == 200:
        return r.json().get("access")
    print(f"  \033[91m✘ Could not get token for '{username}' (status {r.status_code})\033[0m")
    print(f"    {INFO} {r.text[:200]}")
    return None


def auth(token):
    return {"Authorization": f"Bearer {token}"}


# ══════════════════════════════════════════════
#  1. TOKEN ENDPOINTS
# ══════════════════════════════════════════════
section("1. AUTH — Token endpoints")

r = requests.post(f"{BASE}/token/", json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD})
check("POST /api/token/  (admin login)", r, 200)
admin_token = r.json().get("access") if r.status_code == 200 else None
admin_refresh = r.json().get("refresh") if r.status_code == 200 else None

r = requests.post(f"{BASE}/token/", json={"username": DOCTOR_USERNAME, "password": DOCTOR_PASSWORD})
check("POST /api/token/  (doctor login)", r, 200)
doctor_token = r.json().get("access") if r.status_code == 200 else None

if admin_refresh:
    r = requests.post(f"{BASE}/token/refresh/", json={"refresh": admin_refresh})
    check("POST /api/token/refresh/", r, 200)

r = requests.post(f"{BASE}/token/", json={"username": "wrong", "password": "wrong"})
check("POST /api/token/  (bad credentials -> 401)", r, 401)


# ══════════════════════════════════════════════
#  2. USER VIEWS
# ══════════════════════════════════════════════
section("2. USERS — /api/users/")

if admin_token:
    r = requests.get(f"{BASE}/users/admin-only/", headers=auth(admin_token))
    check("GET /api/users/admin-only/  (as admin -> 200)", r, 200)

if doctor_token:
    r = requests.get(f"{BASE}/users/admin-only/", headers=auth(doctor_token))
    check("GET /api/users/admin-only/  (as doctor -> 403)", r, 403)

r = requests.get(f"{BASE}/users/admin-only/")
check("GET /api/users/admin-only/  (no token -> 401)", r, 401)

if doctor_token:
    r = requests.get(f"{BASE}/users/doctor/", headers=auth(doctor_token))
    check("GET /api/users/doctor/  (as doctor -> 200)", r, 200)

if admin_token:
    r = requests.get(f"{BASE}/users/doctor/", headers=auth(admin_token))
    check("GET /api/users/doctor/  (as admin -> 200)", r, 200)

r = requests.get(f"{BASE}/users/doctor/")
check("GET /api/users/doctor/  (no token -> 401)", r, 401)


# ══════════════════════════════════════════════
#  3. PATIENT LIST
# ══════════════════════════════════════════════
section("3. PATIENTS — GET /api/patients/")

if admin_token:
    r = requests.get(f"{BASE}/patients/", headers=auth(admin_token))
    check("GET /api/patients/  (as admin -> 200)", r, 200)

if doctor_token:
    r = requests.get(f"{BASE}/patients/", headers=auth(doctor_token))
    check("GET /api/patients/  (as doctor -> 200)", r, 200)

r = requests.get(f"{BASE}/patients/")
check("GET /api/patients/  (no token -> 401)", r, 401)


# ══════════════════════════════════════════════
#  4. PATIENT CREATE
# ══════════════════════════════════════════════
section("4. PATIENTS — POST /api/patients/create/")

new_patient_data = {
    "first_name": "Test",
    "last_name": "Patient",
    "phone_number": "0699999999",
    "date_of_birth": "1990-01-01",
}

created_patient_id = None

if admin_token:
    r = requests.post(f"{BASE}/patients/create/", json=new_patient_data, headers=auth(admin_token))
    ok_status = r.status_code in (200, 201)
    print(f"  {'%s' % PASS if ok_status else FAIL}  [{r.status_code}]  POST /api/patients/create/  (as admin -> 201 or 200 if exists)")
    if r.status_code in (200, 201):
        created_patient_id = r.json().get("id") or r.json().get("patient", {}).get("id")

if doctor_token:
    data = {**new_patient_data, "phone_number": "0688888888"}
    r = requests.post(f"{BASE}/patients/create/", json=data, headers=auth(doctor_token))
    ok_status = r.status_code in (200, 201)
    print(f"  {'%s' % PASS if ok_status else FAIL}  [{r.status_code}]  POST /api/patients/create/  (as doctor -> 201 or 200)")

r = requests.post(f"{BASE}/patients/create/", json=new_patient_data)
check("POST /api/patients/create/  (no token -> 401)", r, 401)


# ══════════════════════════════════════════════
#  5. PATIENT DETAIL
# ══════════════════════════════════════════════
pid = created_patient_id or EXISTING_PATIENT_ID
section(f"5. PATIENTS — GET /api/patients/{pid}/")

if admin_token:
    r = requests.get(f"{BASE}/patients/{pid}/", headers=auth(admin_token))
    check(f"GET /api/patients/{pid}/  (as admin -> 200)", r, 200)

if doctor_token:
    r = requests.get(f"{BASE}/patients/{pid}/", headers=auth(doctor_token))
    ok_status = r.status_code in (200, 403)
    print(f"  {'%s' % PASS if ok_status else FAIL}  [{r.status_code}]  GET /api/patients/{pid}/  (as doctor -> 200 or 403)")

r = requests.get(f"{BASE}/patients/{pid}/")
check(f"GET /api/patients/{pid}/  (no token -> 401)", r, 401)

if admin_token:
    r = requests.get(f"{BASE}/patients/999999/", headers=auth(admin_token))
    check("GET /api/patients/999999/  (non-existent -> 404)", r, 404)


# ══════════════════════════════════════════════
#  6. PATIENT UPDATE
# ══════════════════════════════════════════════
section(f"6. PATIENTS — PUT /api/patients/{pid}/update/")

if admin_token:
    r = requests.put(f"{BASE}/patients/{pid}/update/", json={"first_name": "Updated"}, headers=auth(admin_token))
    check(f"PUT /api/patients/{pid}/update/  (as admin -> 200)", r, 200)

if doctor_token:
    r = requests.put(f"{BASE}/patients/{pid}/update/", json={"first_name": "DocUpdate"}, headers=auth(doctor_token))
    ok_status = r.status_code in (200, 403)
    print(f"  {'%s' % PASS if ok_status else FAIL}  [{r.status_code}]  PUT /api/patients/{pid}/update/  (as doctor -> 200 or 403)")

r = requests.put(f"{BASE}/patients/{pid}/update/", json={"first_name": "NoAuth"})
check(f"PUT /api/patients/{pid}/update/  (no token -> 401)", r, 401)


# ══════════════════════════════════════════════
#  7. FILE UPLOAD
# ══════════════════════════════════════════════
section(f"7. PATIENTS — POST /api/patients/{pid}/files/upload/")

import os, tempfile

tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".txt")
tmp.write(b"test medical file content")
tmp.close()

uploaded_file_id = None

if admin_token:
    with open(tmp.name, "rb") as f:
        r = requests.post(
            f"{BASE}/patients/{pid}/files/upload/",
            files={"file": ("test.txt", f, "text/plain")},
            headers=auth(admin_token)
        )
    check(f"POST /api/patients/{pid}/files/upload/  (as admin -> 201)", r, 201)
    if r.status_code == 201:
        uploaded_file_id = r.json().get("id")

if doctor_token:
    with open(tmp.name, "rb") as f:
        r = requests.post(
            f"{BASE}/patients/{pid}/files/upload/",
            files={"file": ("test2.txt", f, "text/plain")},
            headers=auth(doctor_token)
        )
    ok_status = r.status_code in (201, 403)
    print(f"  {'%s' % PASS if ok_status else FAIL}  [{r.status_code}]  POST /api/patients/{pid}/files/upload/  (as doctor -> 201 or 403)")

with open(tmp.name, "rb") as f:
    r = requests.post(f"{BASE}/patients/{pid}/files/upload/", files={"file": ("test3.txt", f, "text/plain")})
check(f"POST /api/patients/{pid}/files/upload/  (no token -> 401)", r, 401)

os.unlink(tmp.name)


# ══════════════════════════════════════════════
#  8. FILE DELETE
# ══════════════════════════════════════════════
fid = uploaded_file_id or EXISTING_FILE_ID
section(f"8. PATIENTS — DELETE /api/patients/files/{fid}/delete/")

r = requests.delete(f"{BASE}/patients/files/{fid}/delete/")
check(f"DELETE /api/patients/files/{fid}/delete/  (no token -> 401)", r, 401)

if admin_token:
    r = requests.delete(f"{BASE}/patients/files/{fid}/delete/", headers=auth(admin_token))
    check(f"DELETE /api/patients/files/{fid}/delete/  (as admin -> 204)", r, 204)

    r = requests.delete(f"{BASE}/patients/files/999999/delete/", headers=auth(admin_token))
    check("DELETE /api/patients/files/999999/delete/  (non-existent -> 404)", r, 404)


# ══════════════════════════════════════════════
#  9. PATIENT DELETE  (last — destroys data)
# ══════════════════════════════════════════════
section(f"9. PATIENTS — DELETE /api/patients/{pid}/delete/")

if doctor_token:
    r = requests.delete(f"{BASE}/patients/{pid}/delete/", headers=auth(doctor_token))
    check(f"DELETE /api/patients/{pid}/delete/  (as doctor -> 403)", r, 403)

r = requests.delete(f"{BASE}/patients/{pid}/delete/")
check(f"DELETE /api/patients/{pid}/delete/  (no token -> 401)", r, 401)

if admin_token and created_patient_id:
    r = requests.delete(f"{BASE}/patients/{created_patient_id}/delete/", headers=auth(admin_token))
    check(f"DELETE /api/patients/{created_patient_id}/delete/  (as admin -> 204)", r, 204)

    r = requests.delete(f"{BASE}/patients/999999/delete/", headers=auth(admin_token))
    check("DELETE /api/patients/999999/delete/  (non-existent -> 404)", r, 404)


print(f"\n\033[1m{'='*55}\033[0m")
print("\033[1m  Done. Fix any X lines above.\033[0m")
print(f"\033[1m{'='*55}\033[0m\n")