from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from ..models import Patient
from ..permissions import CanAddPatient
from ..serializers import PatientSerializer


@api_view(["POST"])
@permission_classes([CanAddPatient])
def patient_create(request):
    data = request.data.copy()
    phone = data.get("phone_number")

    if phone:
        existing = Patient.objects.filter(phone_number=phone).first()
        if existing:
            return Response(
                {
                    "detail": "Patient already exists.",
                    "patient": PatientSerializer(existing).data,
                },
                status=status.HTTP_200_OK,
            )

    if not data.get("assigned_doctor_ids"):
        groups = set(getattr(request.user, "groups", ()) or ())
        if "Doctor" in groups and getattr(request.user, "id", None):
            data["assigned_doctor_ids"] = [request.user.id]

    serializer = PatientSerializer(data=data)
    serializer.is_valid(raise_exception=True)
    serializer.save(created_by_user_id=getattr(request.user, "id", None))
    return Response(serializer.data, status=status.HTTP_201_CREATED)
