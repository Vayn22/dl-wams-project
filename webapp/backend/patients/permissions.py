from rest_framework.permissions import BasePermission


def _has_clinical_access(user):
    """
    Allow API access for authenticated clinical accounts without requiring
    manual Django model-permission assignment on every environment.
    """
    if not user or not user.is_authenticated:
        return False
    if user.is_superuser:
        return True

    groups = set(user.groups.values_list('name', flat=True))
    return 'Doctor' in groups or 'Admin' in groups


class CanViewPatient(BasePermission):
    def has_permission(self, request, view):
        return _has_clinical_access(request.user) or request.user.has_perm('patients.view_patient')


class CanAddPatient(BasePermission):
    def has_permission(self, request, view):
        return _has_clinical_access(request.user) or request.user.has_perm('patients.add_patient')


class CanChangePatient(BasePermission):
    def has_permission(self, request, view):
        return _has_clinical_access(request.user) or request.user.has_perm('patients.change_patient')


class CanDeletePatient(BasePermission):
    def has_permission(self, request, view):
        return _has_clinical_access(request.user) or request.user.has_perm('patients.delete_patient')
    
class CanViewAppointment(BasePermission):
    def has_permission(self, request, view):
        return _has_clinical_access(request.user) or request.user.has_perm('patients.view_appointment')


class CanAddAppointment(BasePermission):
    def has_permission(self, request, view):
        return _has_clinical_access(request.user) or request.user.has_perm('patients.add_appointment')


class CanChangeAppointment(BasePermission):
    def has_permission(self, request, view):
        return _has_clinical_access(request.user) or request.user.has_perm('patients.change_appointment')


class CanDeleteAppointment(BasePermission):
    def has_permission(self, request, view):
        return _has_clinical_access(request.user) or request.user.has_perm('patients.delete_appointment')
    
class CanViewMedicalFile(BasePermission):
    def has_permission(self, request, view):
        return _has_clinical_access(request.user) or request.user.has_perm('patients.view_medicalfile')


class CanAddMedicalFile(BasePermission):
    def has_permission(self, request, view):
        return _has_clinical_access(request.user) or request.user.has_perm('patients.add_medicalfile')


class CanDeleteMedicalFile(BasePermission):
    def has_permission(self, request, view):
        return _has_clinical_access(request.user) or request.user.has_perm('patients.delete_medicalfile')