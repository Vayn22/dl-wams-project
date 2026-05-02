from django.contrib.auth.models import Group, Permission
from django.db.models.signals import post_migrate
from django.dispatch import receiver


@receiver(post_migrate)
def create_groups_and_permissions(sender, **kwargs):
    if sender.name != "users":
        return

    doctor_group, _ = Group.objects.get_or_create(name="Doctor")
    admin_group, _ = Group.objects.get_or_create(name="Admin")

    doctor_group.permissions.clear()
    admin_group.permissions.clear()

    # Auth-service permissions live here.
    auth_permission_codenames = [
        "view_user",
        "add_user",
        "change_user",
        "delete_user",
        "view_group",
        "add_group",
        "change_group",
        "delete_group",
    ]

    doctor_permission_codenames = [
        "view_user",
    ]

    for codename in doctor_permission_codenames:
        perm = Permission.objects.filter(codename=codename).first()
        if perm:
            doctor_group.permissions.add(perm)

    for codename in auth_permission_codenames:
        perm = Permission.objects.filter(codename=codename).first()
        if perm:
            admin_group.permissions.add(perm)

    # Admin should inherit every auth permission available in this service.
    admin_group.permissions.add(*Permission.objects.all())
