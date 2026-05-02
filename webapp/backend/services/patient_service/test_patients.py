import os
import json
import sys
import urllib.request
import urllib.error

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

import django
django.setup()

from django.contrib.auth import get_user_model
from patients.models import Patient

AUTH_URL = "http://127.0.0.1:8001"
PATIENT_URL = "http://127.0.0.1:8002"
USERNAME = "testuser"
PASSWORD = "Testpass123!"
EMAIL = "testuser@example.com"

User = get_user_model()

# Make sure user exists in auth_service manually already.
# We only ask auth_service for a token here.

def post_json(url, data, headers=None):
    body = json.dumps(data).encode("utf-8")
    req_headers = {
        "Content-Type": "application/json",
        **(headers or {}),
    }
    req = urllib.request.Request(url, data=body, headers=req_headers, method="POST")
    with urllib.request.urlopen(req, timeout=10) as resp:
        return resp.status, resp.read().decode("utf-8")

def get(url, headers=None):
    req = urllib.request.Request(url, headers=headers or {}, method="GET")
    with urllib.request.urlopen(req, timeout=10) as resp:
        return resp.status, resp.read().decode("utf-8")

print("Requesting token from auth-service...")
try:
    status, body = post_json(
        f"{AUTH_URL}/api/token/",
        {"username": USERNAME, "password": PASSWORD},
    )
    print("Token status:", status)
    print("Token response:", body)
except urllib.error.HTTPError as e:
    print("Token status:", e.code)
    print("Token response:", e.read().decode("utf-8"))
    sys.exit(1)

token_data = json.loads(body)
access = token_data["access"]

print("\nCreating a patient...")
try:
    status, body = post_json(
        f"{PATIENT_URL}/api/patients/",
        {
            "first_name": "Ali",
            "last_name": "Ben",
            "age": 22,
            "gender": "male",
            "diagnosis": "Test diagnosis",
            "notes": "Created by script"
        },
        headers={"Authorization": f"Bearer {access}"},
    )
    print("Create status:", status)
    print("Create response:", body)
except urllib.error.HTTPError as e:
    print("Create status:", e.code)
    print("Create response:", e.read().decode("utf-8"))
    sys.exit(1)

print("\nListing patients...")
try:
    status, body = get(
        f"{PATIENT_URL}/api/patients/",
        headers={"Authorization": f"Bearer {access}"},
    )
    print("List status:", status)
    print("List response:", body)
except urllib.error.HTTPError as e:
    print("List status:", e.code)
    print("List response:", e.read().decode("utf-8"))
    sys.exit(1)