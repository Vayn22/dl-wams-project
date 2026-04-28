#!/usr/bin/env python3
from pathlib import Path


def main() -> int:
    root = Path(__file__).resolve().parent
    if not (root / "manage.py").exists() or not (root / "users").exists():
        print("Run this script from the auth_service root (the folder that contains manage.py and users/).")
        return 1

    print("The auth service is already structured with function-based views and decorators.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
