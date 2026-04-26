#!/usr/bin/env python3
from pathlib import Path
import sys


def write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def main() -> int:
    root = Path(__file__).resolve().parent
    if not (root / "manage.py").exists() or not (root / "users").exists():
        print("Run this script from the auth_service root (the folder that contains manage.py and users/).")
        return 1

    users = root / "users"
    views_pkg = users / "views"
    serializers_pkg = users / "serializers"

    write(
        views_pkg / "__init__.py",
        "from .me import MeView\n",
    )
    write(
        views_pkg / "me.py",
        '''from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from ..serializers.user_me import UserMeSerializer


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserMeSerializer(request.user).data)
''',
    )

    write(
        serializers_pkg / "__init__.py",
        "from .user_me import UserMeSerializer\n",
    )
    write(
        serializers_pkg / "user_me.py",
        '''from django.contrib.auth.models import User
from rest_framework import serializers


class UserMeSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "email", "first_name", "last_name"]
''',
    )

    write(
        users / "urls.py",
        '''from django.urls import path

from .views.me import MeView

urlpatterns = [
    path("me/", MeView.as_view(), name="me"),
]
''',
    )

    for old_file in [users / "views.py", users / "serializers.py"]:
        if old_file.exists():
            old_file.unlink()

    print("auth_service reorganized successfully.")
    print("New structure:")
    print("- users/views/me.py")
    print("- users/serializers/user_me.py")
    print("- users/urls.py updated")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
