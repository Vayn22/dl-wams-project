from rest_framework.permissions import BasePermission


class CanViewPatient(BasePermission):
    def has_permission(self, request, view):
        return request.user.has_perm('patients.view_patient')


class CanAddPatient(BasePermission):
    def has_permission(self, request, view):
        return request.user.has_perm('patients.add_patient')


class CanChangePatient(BasePermission):
    def has_permission(self, request, view):
        return request.user.has_perm('patients.change_patient')


class CanDeletePatient(BasePermission):
    def has_permission(self, request, view):
        return request.user.has_perm('patients.delete_patient')
    
class CanViewAppointment(BasePermission):
    def has_permission(self, request, view):
        return request.user.has_perm('patients.view_appointment')


class CanAddAppointment(BasePermission):
    def has_permission(self, request, view):
        return request.user.has_perm('patients.add_appointment')


class CanChangeAppointment(BasePermission):
    def has_permission(self, request, view):
        return request.user.has_perm('patients.change_appointment')


class CanDeleteAppointment(BasePermission):
    def has_permission(self, request, view):
        return request.user.has_perm('patients.delete_appointment')
    
class CanViewMedicalFile(BasePermission):
    def has_permission(self, request, view):
        return request.user.has_perm('patients.view_medicalfile')


class CanAddMedicalFile(BasePermission):
    def has_permission(self, request, view):
        return request.user.has_perm('patients.add_medicalfile')


class CanDeleteMedicalFile(BasePermission):
    def has_permission(self, request, view):
        return request.user.has_perm('patients.delete_medicalfile')