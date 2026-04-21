from django.db.models.signals import post_migrate
from django.dispatch import receiver
from django.contrib.auth.models import Group, Permission


@receiver(post_migrate)
def create_groups_and_permissions(sender, **kwargs):

     #ONLY RUN FOR USERS APP
    if sender.name != "users":
        return
    print("\n🔧 Setting up groups and permissions...")

    # Create groups
    doctor_group, _ = Group.objects.get_or_create(name="Doctor")
    admin_group, _ = Group.objects.get_or_create(name="Admin")

    print("✔ Groups created")

    # 🔹 DOCTOR PERMISSIONS (from your images)
    doctor_permission_codenames = [
        # Appointment
        "add_appointment",
        "change_appointment",
        "delete_appointment",
        "view_appointment",
        "cancel_appointment",

        # Medical File
        "add_medicalfile",
        "delete_medicalfile",
        "view_medicalfile",
        "download_medicalfile",

        # Patient
        "add_patient",
        "change_patient",
        "delete_patient",
        "view_patient",
        "archive_patient",

        # AI
        "view_ai_model",
        "run_ai_model",
    ]

    # Clear existing perms (avoid duplicates)
    doctor_group.permissions.clear()

    for codename in doctor_permission_codenames:
        try:
            perm = Permission.objects.get(codename=codename)
            doctor_group.permissions.add(perm)
            print(f"✔ Added {codename} to Doctor")
        except Permission.DoesNotExist:
            print(f"⚠ Permission not found: {codename}")

    print("✔ Doctor permissions assigned")

    # 🔹 ADMIN → ALL PERMISSIONS
    admin_group.permissions.set(Permission.objects.all())

    print("✔ Admin permissions assigned (ALL)")

    print("Setup complete!\n")