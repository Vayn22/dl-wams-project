from .models import DoctorProfile

PATIENT_SERVICE_PERMISSIONS = {
    "patients.view_patient",
    "patients.add_patient",
    "patients.change_patient",
    "patients.delete_patient",
    "patients.export_patient",
    "patients.archive_patient",
    "patients.view_appointment",
    "patients.add_appointment",
    "patients.change_appointment",
    "patients.delete_appointment",
    "patients.cancel_appointment",
    "patients.reschedule_appointment",
    "patients.view_medicalfile",
    "patients.add_medicalfile",
    "patients.delete_medicalfile",
    "patients.download_medicalfile",
}

# -----------------------------------------------------------------
# ADD AI SERVICE PERMISSIONS
# -----------------------------------------------------------------
AI_SERVICE_PERMISSIONS = {
    "ai.use_segmentation",
    # Add more AI‑specific permissions here in the future
}

def get_doctor_profile(user):
    try:
        return user.doctor_profile
    except DoctorProfile.DoesNotExist:
        return None


def build_permissions(user):
    permissions = set(user.get_all_permissions())
    groups = {group.name for group in user.groups.all()}

    if "Doctor" in groups:
        permissions.update(PATIENT_SERVICE_PERMISSIONS)
        permissions.update(AI_SERVICE_PERMISSIONS)   # <-- ADDED

    if "Admin" in groups or user.is_superuser:
        permissions.update(PATIENT_SERVICE_PERMISSIONS)
        permissions.update(AI_SERVICE_PERMISSIONS)   # <-- ADDED

    return sorted(permissions)