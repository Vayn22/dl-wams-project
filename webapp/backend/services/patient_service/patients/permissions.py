from rest_framework.permissions import BasePermission


def _has_permission(user, perm: str) -> bool:
    return bool(user and user.is_authenticated and (getattr(user, "is_superuser", False) or user.has_perm(perm)))


class CanViewPatient(BasePermission):
    def has_permission(self, request, view):
        return _has_permission(request.user, "patients.view_patient")


class CanAddPatient(BasePermission):
    def has_permission(self, request, view):
        return _has_permission(request.user, "patients.add_patient")


class CanChangePatient(BasePermission):
    def has_permission(self, request, view):
        return _has_permission(request.user, "patients.change_patient")


class CanDeletePatient(BasePermission):
    def has_permission(self, request, view):
        return _has_permission(request.user, "patients.delete_patient")


class CanViewAppointment(BasePermission):
    def has_permission(self, request, view):
        return _has_permission(request.user, "patients.view_appointment")


class CanAddAppointment(BasePermission):
    def has_permission(self, request, view):
        return _has_permission(request.user, "patients.add_appointment")


class CanChangeAppointment(BasePermission):
    def has_permission(self, request, view):
        return _has_permission(request.user, "patients.change_appointment")


class CanDeleteAppointment(BasePermission):
    def has_permission(self, request, view):
        return _has_permission(request.user, "patients.delete_appointment")


class CanViewMedicalFile(BasePermission):
    def has_permission(self, request, view):
        return _has_permission(request.user, "patients.view_medicalfile")


class CanAddMedicalFile(BasePermission):
    def has_permission(self, request, view):
        return _has_permission(request.user, "patients.add_medicalfile")


class CanDeleteMedicalFile(BasePermission):
    def has_permission(self, request, view):
        return _has_permission(request.user, "patients.delete_medicalfile")


class CanDownloadMedicalFile(BasePermission):
    def has_permission(self, request, view):
        return _has_permission(request.user, "patients.download_medicalfile")


class IsDoctorOrAdmin(BasePermission):
    message = "Doctor or admin access required."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        groups = set(getattr(request.user, "groups", ()) or ())
        return bool(
            getattr(request.user, "is_superuser", False)
            or "Admin" in groups
            or "Doctor" in groups
        )


class IsAdminOnly(BasePermission):
    message = "Admin access required."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        groups = set(getattr(request.user, "groups", ()) or ())
        return bool(getattr(request.user, "is_superuser", False) or "Admin" in groups)
