#!/usr/bin/env python3
from pathlib import Path
import sys


def write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def main() -> int:
    root = Path(__file__).resolve().parent
    if not (root / "manage.py").exists() or not (root / "patients").exists():
        print("Run this script from the patient_service root (the folder that contains manage.py and patients/).")
        return 1

    patients = root / "patients"
    views_pkg = patients / "views"
    serializers_pkg = patients / "serializers"

    write(
        views_pkg / "__init__.py",
        "from .patient_viewset import PatientViewSet\n",
    )
    write(
        views_pkg / "patient_viewset.py",
        '''from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from ..models import Patient
from ..serializers.patient_serializer import PatientSerializer


class PatientViewSet(viewsets.ModelViewSet):
    queryset = Patient.objects.all().order_by("-id")
    serializer_class = PatientSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        user_id = getattr(self.request.user, "id", None)
        serializer.save(created_by_user_id=user_id)
''',
    )

    write(
        serializers_pkg / "__init__.py",
        "from .patient_serializer import PatientSerializer\n",
    )
    write(
        serializers_pkg / "patient_serializer.py",
        '''from rest_framework import serializers

from ..models import Patient


class PatientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Patient
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at", "created_by_user_id"]
''',
    )

    write(
        patients / "urls.py",
        '''from rest_framework.routers import DefaultRouter

from .views.patient_viewset import PatientViewSet

router = DefaultRouter()
router.register(r"patients", PatientViewSet, basename="patients")

urlpatterns = router.urls
''',
    )

    for old_file in [patients / "views.py", patients / "serializers.py"]:
        if old_file.exists():
            old_file.unlink()

    print("patient_service reorganized successfully.")
    print("New structure:")
    print("- patients/views/patient_viewset.py")
    print("- patients/serializers/patient_serializer.py")
    print("- patients/urls.py updated")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
