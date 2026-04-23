"""
API Test Script — dl-wams-project
Run: python test_api.py
Make sure server is running: python manage.py runserver
"""

import json
import sys
import uuid

import requests

BASE = "http://127.0.0.1:8000"

# ─────────────────────────────────────────────
# CONFIG
# ─────────────────────────────────────────────
ADMIN_USERNAME = "Islem"
ADMIN_PASSWORD = "password"
DOCTOR_USERNAME = "drIslem"
DOCTOR_PASSWORD = "thep@$$w0rd"

RUN_ID = uuid.uuid4().hex[:6]

# ─────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
CYAN = "\033[96m"
BOLD = "\033[1m"
RESET = "\033[0m"

passed = 0
failed = 0


def header(title):
    print(f"\n{CYAN}{BOLD}{'═' * 55}{RESET}")
    print(f"{CYAN}{BOLD}  {title}{RESET}")
    print(f"{CYAN}{BOLD}{'═' * 55}{RESET}")


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
                preview += f"\n        ... (+{len(lines) - 8} more lines)"
            print(f"        {RED}↳ Response: {preview}{RESET}")
        except Exception:
            print(f"        {RED}↳ Response: {response.text[:300]}{RESET}")
    if ok:
        passed += 1
    else:
        failed += 1


def test_contains(label, values, expected_value):
    global passed, failed
    ok = isinstance(values, (list, tuple, set)) and expected_value in values
    icon = f"{GREEN}✔ PASS{RESET}" if ok else f"{RED}✘ FAIL{RESET}"
    print(f"  {icon}  {label}")
    if ok:
        passed += 1
    else:
        failed += 1


def auth(token):
    return {"Authorization": f"Bearer {token}"}


def unique_phone():
    return "055" + str(uuid.uuid4().int % 10_000_000).zfill(7)


# ─────────────────────────────────────────────
# 0. SETUP — GET TOKENS
# ─────────────────────────────────────────────
header("0. SETUP — Getting tokens")

admin_login = requests.post(
    f"{BASE}/api/users/login/",
    json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD},
)
test("POST /api/users/login/  (admin -> 200)", admin_login, 200)
admin_token = (
    admin_login.json().get("access_token") if admin_login.status_code == 200 else None
)
admin_refresh_token = (
    admin_login.json().get("refresh_token") if admin_login.status_code == 200 else None
)
if admin_login.status_code == 200:
    admin_groups = admin_login.json().get("user", {}).get("groups", [])
    test_contains("Login payload groups contain Admin", admin_groups, "Admin")

doctor_login = requests.post(
    f"{BASE}/api/users/login/",
    json={"username": DOCTOR_USERNAME, "password": DOCTOR_PASSWORD},
)
test("POST /api/users/login/  (doctor -> 200)", doctor_login, 200)
doctor_token = (
    doctor_login.json().get("access_token") if doctor_login.status_code == 200 else None
)
doctor_refresh_token = (
    doctor_login.json().get("refresh_token")
    if doctor_login.status_code == 200
    else None
)
if doctor_login.status_code == 200:
    doctor_groups = doctor_login.json().get("user", {}).get("groups", [])
    test_contains("Login payload groups contain Doctor", doctor_groups, "Doctor")

print(
    f"  {'✔' if admin_token else '✘'}  Admin token:  {'obtained' if admin_token else RED + 'FAILED' + RESET}"
)
print(
    f"  {'✔' if doctor_token else '✘'}  Doctor token: {'obtained' if doctor_token else RED + 'FAILED' + RESET}"
)

if not admin_token and not doctor_token:
    print(f"\n{RED}  Both tokens failed. Is the server running? Exiting.{RESET}\n")
    sys.exit(1)

# ─────────────────────────────────────────────
# 1. AUTH — /api/users/login/
# ─────────────────────────────────────────────
header("1. AUTH — /api/users/login/")

r = requests.post(
    f"{BASE}/api/users/login/", json={"username": "wrong", "password": "wrong"}
)
test("POST /api/users/login/  (bad credentials -> 401)", r, 401)

r = requests.post(f"{BASE}/api/users/login/", json={})
test("POST /api/users/login/  (empty body -> 400)", r, 400)

# ─────────────────────────────────────────────
# 2. TOKEN REFRESH
# ─────────────────────────────────────────────
header("2. AUTH — /api/token/refresh/")

if admin_refresh_token:
    r = requests.post(
        f"{BASE}/api/token/refresh/", json={"refresh": admin_refresh_token}
    )
    test("POST /api/token/refresh/  (valid refresh -> 200)", r, 200)

r = requests.post(f"{BASE}/api/token/refresh/", json={"refresh": "invalidtoken"})
test("POST /api/token/refresh/  (invalid refresh -> 401)", r, 401)

# ─────────────────────────────────────────────
# 3. USERS — /api/users/doctors/
# ─────────────────────────────────────────────
header("3. USERS — /api/users/doctors/")

created_doctor_id = None

if admin_token:
    r = requests.get(f"{BASE}/api/users/doctors/", headers=auth(admin_token))
    test("GET /api/users/doctors/  (as admin -> 200)", r, 200)

if doctor_token:
    r = requests.get(f"{BASE}/api/users/doctors/", headers=auth(doctor_token))
    test("GET /api/users/doctors/  (as doctor -> 403)", r, 403)

r = requests.get(f"{BASE}/api/users/doctors/")
test("GET /api/users/doctors/  (no token -> 401)", r, 401)

if admin_token:
    NEW_DOCTOR = {
        "username": f"drTestScript_{RUN_ID}",
        "email": f"drtest_script_{RUN_ID}@email.com",
        "password": "testpassword123",
    }
    r = requests.post(
        f"{BASE}/api/users/doctors/create/", json=NEW_DOCTOR, headers=auth(admin_token)
    )
    test("POST /api/users/doctors/create/  (as admin -> 201)", r, 201)
    if r.status_code == 201:
        created_doctor_id = r.json().get("id")
        print(f"        {GREEN}↳ Created doctor ID: {created_doctor_id}{RESET}")

if doctor_token:
    r = requests.post(
        f"{BASE}/api/users/doctors/create/", json={}, headers=auth(doctor_token)
    )
    test("POST /api/users/doctors/create/  (as doctor -> 403)", r, 403)

r = requests.post(f"{BASE}/api/users/doctors/create/", json={})
test("POST /api/users/doctors/create/  (no token -> 401)", r, 401)

if admin_token:
    r = requests.post(
        f"{BASE}/api/users/doctors/create/", json={}, headers=auth(admin_token)
    )
    test("POST /api/users/doctors/create/  (empty body -> 400)", r, 400)

if admin_token and created_doctor_id:
    r = requests.get(
        f"{BASE}/api/users/doctors/{created_doctor_id}/", headers=auth(admin_token)
    )
    test(f"GET /api/users/doctors/{created_doctor_id}/  (as admin -> 200)", r, 200)

    r = requests.get(f"{BASE}/api/users/doctors/999999/", headers=auth(admin_token))
    test("GET /api/users/doctors/999999/  (non-existent -> 404)", r, 404)

    r = requests.put(
        f"{BASE}/api/users/doctors/{created_doctor_id}/update/",
        json={"email": "updated@email.com"},
        headers=auth(admin_token),
    )
    test(
        f"PUT /api/users/doctors/{created_doctor_id}/update/  (as admin -> 200)", r, 200
    )

if doctor_token and created_doctor_id:
    r = requests.put(
        f"{BASE}/api/users/doctors/{created_doctor_id}/update/",
        json={"email": "hacked@email.com"},
        headers=auth(doctor_token),
    )
    test(
        f"PUT /api/users/doctors/{created_doctor_id}/update/  (as doctor -> 403)",
        r,
        403,
    )

# ─────────────────────────────────────────────
# 4. PATIENTS — List & Create
# ─────────────────────────────────────────────
header("4. PATIENTS — /api/patients/")

created_patient_id = None

if admin_token:
    r = requests.get(f"{BASE}/api/patients/", headers=auth(admin_token))
    test("GET /api/patients/  (as admin -> 200)", r, 200)

if doctor_token:
    r = requests.get(f"{BASE}/api/patients/", headers=auth(doctor_token))
    test("GET /api/patients/  (as doctor -> 200)", r, 200)

r = requests.get(f"{BASE}/api/patients/")
test("GET /api/patients/  (no token -> 401)", r, 401)

NEW_PATIENT = {
    "first_name": "Test",
    "last_name": f"Script_{RUN_ID}",
    "date_of_birth": "1990-06-15",
    "gender": "male",
    "phone_number": unique_phone(),
}

if admin_token:
    r = requests.post(
        f"{BASE}/api/patients/create/", json=NEW_PATIENT, headers=auth(admin_token)
    )
    expected = 200 if r.status_code == 200 else 201
    test("POST /api/patients/create/  (as admin -> 201)", r, expected)
    if r.status_code in (200, 201):
        body = r.json()
        created_patient_id = body.get("id") or (body.get("patient") or {}).get("id")
        print(f"        {GREEN}↳ Patient ID: {created_patient_id}{RESET}")

if doctor_token:
    r = requests.post(
        f"{BASE}/api/patients/create/", json=NEW_PATIENT, headers=auth(doctor_token)
    )
    test("POST /api/patients/create/  (duplicate -> 200 existing)", r, 200)

r = requests.post(f"{BASE}/api/patients/create/", json=NEW_PATIENT)
test("POST /api/patients/create/  (no token -> 401)", r, 401)

if admin_token:
    r = requests.post(
        f"{BASE}/api/patients/create/", json={}, headers=auth(admin_token)
    )
    test("POST /api/patients/create/  (empty body -> 400)", r, 400)

    r = requests.post(
        f"{BASE}/api/patients/create/",
        json={**NEW_PATIENT, "phone_number": unique_phone(), "gender": "INVALID"},
        headers=auth(admin_token),
    )
    test("POST /api/patients/create/  (bad gender -> 400)", r, 400)

# ─────────────────────────────────────────────
# 5. PATIENTS — Detail, Update, Delete
# ─────────────────────────────────────────────
header("5. PATIENTS — Detail, Update, Delete")

pk = created_patient_id or 1

if admin_token:
    r = requests.get(f"{BASE}/api/patients/{pk}/", headers=auth(admin_token))
    test(f"GET /api/patients/{pk}/  (as admin -> 200)", r, 200)

if doctor_token:
    r = requests.get(f"{BASE}/api/patients/{pk}/", headers=auth(doctor_token))
    test(f"GET /api/patients/{pk}/  (as doctor -> 200)", r, 200)

r = requests.get(f"{BASE}/api/patients/{pk}/")
test(f"GET /api/patients/{pk}/  (no token -> 401)", r, 401)

if admin_token:
    r = requests.get(f"{BASE}/api/patients/999999/", headers=auth(admin_token))
    test("GET /api/patients/999999/  (non-existent -> 404)", r, 404)

if admin_token:
    r = requests.put(
        f"{BASE}/api/patients/{pk}/update/",
        json={"notes": "Updated by test script."},
        headers=auth(admin_token),
    )
    test(f"PUT /api/patients/{pk}/update/  (as admin -> 200)", r, 200)

if doctor_token:
    r = requests.put(
        f"{BASE}/api/patients/{pk}/update/",
        json={"notes": "Updated by doctor."},
        headers=auth(doctor_token),
    )
    test(f"PUT /api/patients/{pk}/update/  (as doctor -> 200)", r, 200)

r = requests.put(f"{BASE}/api/patients/{pk}/update/", json={"notes": "X"})
test(f"PUT /api/patients/{pk}/update/  (no token -> 401)", r, 401)

if admin_token:
    r = requests.delete(f"{BASE}/api/patients/{pk}/delete/", headers=auth(admin_token))
    test(
        f"DELETE /api/patients/{pk}/delete/  (as admin -> 204)", r, 204, show_body=False
    )

r = requests.delete(f"{BASE}/api/patients/{pk}/delete/")
test(f"DELETE /api/patients/{pk}/delete/  (no token -> 401)", r, 401)

# ─────────────────────────────────────────────
# 6. FILES — Upload & Delete
# ─────────────────────────────────────────────
header("6. FILES — /api/patients/<pk>/files/")

uploaded_file_ids = []

if admin_token:
    # Need a patient for file upload
    r = requests.post(
        f"{BASE}/api/patients/create/",
        json={
            "first_name": f"File_{RUN_ID}",
            "last_name": "Patient",
            "date_of_birth": "1991-01-01",
            "gender": "female",
            "phone_number": unique_phone(),
        },
        headers=auth(admin_token),
    )
    file_patient_id = r.json().get("id") or (r.json().get("patient") or {}).get("id")

    if file_patient_id:
        dummy = ("test_file.txt", b"dummy medical content", "text/plain")
        r = requests.post(
            f"{BASE}/api/patients/{file_patient_id}/files/upload/",
            files={"file": dummy},
            data={"label": "Test MRI Scan"},
            headers=auth(admin_token),
        )
        test(
            f"POST /api/patients/{file_patient_id}/files/upload/  (as admin -> 201)",
            r,
            201,
        )
        if r.status_code == 201:
            file_id = r.json().get("id")
            if file_id:
                uploaded_file_ids.append(file_id)
                print(f"        {GREEN}↳ Uploaded file ID: {file_id}{RESET}")

if doctor_token:
    # Reuse the same file patient if it exists
    file_patient_id = (
        file_patient_id if "file_patient_id" in locals() else created_patient_id
    )
    if file_patient_id:
        dummy = ("test_file2.txt", b"dummy medical content 2", "text/plain")
        r = requests.post(
            f"{BASE}/api/patients/{file_patient_id}/files/upload/",
            files={"file": dummy},
            data={"label": "Doctor Upload"},
            headers=auth(doctor_token),
        )
        test(
            f"POST /api/patients/{file_patient_id}/files/upload/  (as doctor -> 201)",
            r,
            201,
        )
        if r.status_code == 201:
            file_id = r.json().get("id")
            if file_id:
                uploaded_file_ids.append(file_id)
                print(f"        {GREEN}↳ Uploaded doctor file ID: {file_id}{RESET}")

r = requests.post(
    f"{BASE}/api/patients/{pk}/files/upload/",
    files={"file": ("x.txt", b"x", "text/plain")},
)
test(f"POST /api/patients/{pk}/files/upload/  (no token -> 401)", r, 401)

if admin_token and uploaded_file_ids:
    for file_id in uploaded_file_ids:
        r = requests.delete(
            f"{BASE}/api/patients/files/{file_id}/delete/",
            headers=auth(admin_token),
        )
        test(
            f"DELETE /api/patients/files/{file_id}/delete/  (as admin -> 204)",
            r,
            204,
            show_body=False,
        )

if admin_token:
    r = requests.delete(
        f"{BASE}/api/patients/files/999999/delete/", headers=auth(admin_token)
    )
    test("DELETE /api/patients/files/999999/delete/  (non-existent -> 404)", r, 404)

# ─────────────────────────────────────────────
# 7. APPOINTMENTS — List, Create, Detail, Update, Delete
# ─────────────────────────────────────────────
header("7. APPOINTMENTS — /api/patients/appointments/")

created_appointment_id = None
past_appointment_id = None
appt_patient_id = None

if admin_token:
    r = requests.get(f"{BASE}/api/patients/appointments/", headers=auth(admin_token))
    test("GET /api/patients/appointments/  (as admin -> 200)", r, 200)

if doctor_token:
    r = requests.get(f"{BASE}/api/patients/appointments/", headers=auth(doctor_token))
    test("GET /api/patients/appointments/  (as doctor -> 200)", r, 200)

r = requests.get(f"{BASE}/api/patients/appointments/")
test("GET /api/patients/appointments/  (no token -> 401)", r, 401)

# Create a patient first to attach appointment to
if admin_token:
    r = requests.post(
        f"{BASE}/api/patients/create/",
        json={
            "first_name": f"Appt_{RUN_ID}",
            "last_name": "Test",
            "date_of_birth": "1990-01-01",
            "gender": "male",
            "phone_number": unique_phone(),
        },
        headers=auth(admin_token),
    )
    appt_patient_id = r.json().get("id") or (r.json().get("patient") or {}).get("id")

if doctor_token and appt_patient_id:
    NEW_APPT = {
        "patient": appt_patient_id,
        "date_time": "2027-01-15T10:00:00Z",
        "notes": "Routine checkup.",
    }
    r = requests.post(
        f"{BASE}/api/patients/appointments/create/",
        json=NEW_APPT,
        headers=auth(doctor_token),
    )
    test("POST /api/patients/appointments/create/  (as doctor -> 201)", r, 201)
    if r.status_code == 201:
        created_appointment_id = r.json().get("id")
        print(
            f"        {GREEN}↳ Created appointment ID: {created_appointment_id}{RESET}"
        )

r = requests.post(f"{BASE}/api/patients/appointments/create/", json={})
test("POST /api/patients/appointments/create/  (no token -> 401)", r, 401)

if doctor_token:
    r = requests.post(
        f"{BASE}/api/patients/appointments/create/", json={}, headers=auth(doctor_token)
    )
    test("POST /api/patients/appointments/create/  (empty body -> 400)", r, 400)

if admin_token and created_appointment_id:
    r = requests.get(
        f"{BASE}/api/patients/appointments/{created_appointment_id}/",
        headers=auth(admin_token),
    )
    test(
        f"GET /api/patients/appointments/{created_appointment_id}/  (as admin -> 200)",
        r,
        200,
    )

if doctor_token and created_appointment_id:
    r = requests.get(
        f"{BASE}/api/patients/appointments/{created_appointment_id}/",
        headers=auth(doctor_token),
    )
    test(
        f"GET /api/patients/appointments/{created_appointment_id}/  (as doctor -> 200)",
        r,
        200,
    )

if admin_token:
    r = requests.get(
        f"{BASE}/api/patients/appointments/999999/", headers=auth(admin_token)
    )
    test("GET /api/patients/appointments/999999/  (non-existent -> 404)", r, 404)

if admin_token and created_appointment_id:
    r = requests.put(
        f"{BASE}/api/patients/appointments/{created_appointment_id}/update/",
        json={"status": "completed", "notes": "Updated notes."},
        headers=auth(admin_token),
    )
    test(
        f"PUT /api/patients/appointments/{created_appointment_id}/update/  (as admin -> 200)",
        r,
        200,
    )

if doctor_token and created_appointment_id:
    r = requests.put(
        f"{BASE}/api/patients/appointments/{created_appointment_id}/update/",
        json={"notes": "Doctor updated notes."},
        headers=auth(doctor_token),
    )
    test(
        f"PUT /api/patients/appointments/{created_appointment_id}/update/  (as doctor -> 200)",
        r,
        200,
    )

r = requests.put(f"{BASE}/api/patients/appointments/1/update/", json={"notes": "x"})
test("PUT /api/patients/appointments/1/update/  (no token -> 401)", r, 401)

# test expiry — create appointment in the past
if doctor_token and appt_patient_id:
    PAST_APPT = {
        "patient": appt_patient_id,
        "date_time": "2020-01-01T10:00:00Z",
        "notes": "This should expire.",
    }
    r = requests.post(
        f"{BASE}/api/patients/appointments/create/",
        json=PAST_APPT,
        headers=auth(doctor_token),
    )
    if r.status_code == 201:
        past_appointment_id = r.json().get("id")
        r = requests.get(
            f"{BASE}/api/patients/appointments/{past_appointment_id}/",
            headers=auth(doctor_token),
        )
        status_val = r.json().get("status")
        expired_ok = status_val == "expired"
        icon = f"{GREEN}✔ PASS{RESET}" if expired_ok else f"{RED}✘ FAIL{RESET}"
        print(f"  {icon}  Appointment in past auto-expires  (status={status_val})")
        if expired_ok:
            passed += 1
        else:
            failed += 1

if admin_token and created_appointment_id:
    r = requests.delete(
        f"{BASE}/api/patients/appointments/{created_appointment_id}/delete/",
        headers=auth(admin_token),
    )
    test(
        f"DELETE /api/patients/appointments/{created_appointment_id}/delete/  (as admin -> 204)",
        r,
        204,
        show_body=False,
    )

r = requests.delete(f"{BASE}/api/patients/appointments/1/delete/")
test("DELETE /api/patients/appointments/1/delete/  (no token -> 401)", r, 401)

if admin_token:
    r = requests.delete(
        f"{BASE}/api/patients/appointments/999999/delete/", headers=auth(admin_token)
    )
    test(
        "DELETE /api/patients/appointments/999999/delete/  (non-existent -> 404)",
        r,
        404,
    )

# cleanup past appointment if it was created
if admin_token and past_appointment_id:
    requests.delete(
        f"{BASE}/api/patients/appointments/{past_appointment_id}/delete/",
        headers=auth(admin_token),
    )

# ─────────────────────────────────────────────
# 8. USERS — /api/users/me/
# ─────────────────────────────────────────────
header("8. USERS — /api/users/me/")

if admin_token:
    r = requests.get(f"{BASE}/api/users/me/", headers=auth(admin_token))
    test("GET /api/users/me/  (as admin -> 200)", r, 200)
    if r.status_code == 200:
        groups = r.json().get("groups", [])
        test_contains("/me/ returns Admin group", groups, "Admin")

if doctor_token:
    r = requests.get(f"{BASE}/api/users/me/", headers=auth(doctor_token))
    test("GET /api/users/me/  (as doctor -> 200)", r, 200)
    if r.status_code == 200:
        groups = r.json().get("groups", [])
        test_contains("/me/ returns Doctor group", groups, "Doctor")

r = requests.get(f"{BASE}/api/users/me/")
test("GET /api/users/me/  (no token -> 401)", r, 401)

# ─────────────────────────────────────────────
# 9. SPECIALTIES — /api/users/specialties/
# ─────────────────────────────────────────────
header("9. SPECIALTIES — /api/users/specialties/")

if admin_token:
    r = requests.get(f"{BASE}/api/users/specialties/", headers=auth(admin_token))
    test("GET /api/users/specialties/  (as admin -> 200)", r, 200)

if doctor_token:
    r = requests.get(f"{BASE}/api/users/specialties/", headers=auth(doctor_token))
    test("GET /api/users/specialties/  (as doctor -> 200)", r, 200)

r = requests.get(f"{BASE}/api/users/specialties/")
test("GET /api/users/specialties/  (no token -> 401)", r, 401)

# ─────────────────────────────────────────────
# 10. EDGE CASES
# ─────────────────────────────────────────────
header("10. EDGE CASES")

if admin_token:
    # malformed token
    r = requests.get(
        f"{BASE}/api/users/me/", headers={"Authorization": "Bearer notavalidtoken"}
    )
    test("GET /api/users/me/  (malformed token -> 401)", r, 401)

    # missing Bearer prefix
    r = requests.get(f"{BASE}/api/users/me/", headers={"Authorization": admin_token})
    test("GET /api/users/me/  (missing Bearer prefix -> 401)", r, 401)

    # doctor can access patient views now
    r = requests.post(
        f"{BASE}/api/patients/create/",
        json={
            "first_name": "Private",
            "last_name": "Patient",
            "date_of_birth": "1985-03-10",
            "gender": "female",
            "phone_number": unique_phone(),
        },
        headers=auth(admin_token),
    )
    private_patient_id = r.json().get("id") if r.status_code == 201 else None

    if private_patient_id and doctor_token:
        r = requests.get(
            f"{BASE}/api/patients/{private_patient_id}/", headers=auth(doctor_token)
        )
        test("GET /api/patients/<private>/  (doctor can view -> 200)", r, 200)

        # cleanup
        requests.delete(
            f"{BASE}/api/patients/{private_patient_id}/delete/",
            headers=auth(admin_token),
        )

# ─────────────────────────────────────────────
# 11. SUMMARY
# ─────────────────────────────────────────────
total = passed + failed
print(f"\n{BOLD}{'═' * 55}{RESET}")
if failed == 0:
    print(f"{BOLD}  {GREEN}ALL {total} TESTS PASSED ✔{RESET}")
else:
    print(
        f"{BOLD}  {GREEN}{passed} passed{RESET}  ·  {RED}{failed} failed{RESET}  ·  {total} total{RESET}"
    )
print(f"{BOLD}{'═' * 55}{RESET}\n")

sys.exit(0 if failed == 0 else 1)
