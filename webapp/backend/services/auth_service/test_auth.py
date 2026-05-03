import os
import json
import sys
import requests

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

import django
django.setup()

from django.contrib.auth import get_user_model

BASE_URL = "http://127.0.0.1:8001"
USERNAME = "testuser"
PASSWORD = "Testpass123!"
EMAIL = "testuser@example.com"

User = get_user_model()

user, created = User.objects.get_or_create(
    username=USERNAME,
    defaults={"email": EMAIL},
)

if created:
    user.set_password(PASSWORD)
    user.save()
    print(f"Created user: {USERNAME}")
else:
    user.email = EMAIL
    user.set_password(PASSWORD)
    user.save()
    print(f"Updated user: {USERNAME}")

print("\nRequesting token...")

token_resp = requests.post(
    f"{BASE_URL}/api/token/",
    json={"username": USERNAME, "password": PASSWORD},
    timeout=10,
)

print("Token status:", token_resp.status_code)
print("Token response:", token_resp.text)

if token_resp.status_code != 200:
    sys.exit(1)

data = token_resp.json()
access = data["access"]

print("\nCalling /api/users/me/ ...")
me_resp = requests.get(
    f"{BASE_URL}/api/users/me/",
    headers={"Authorization": f"Bearer {access}"},
    timeout=10,
)

print("Me status:", me_resp.status_code)
print("Me response:", me_resp.text)