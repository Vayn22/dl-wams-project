from rest_framework.permissions import BasePermission


def _has_group(user, *names) -> bool:
    if not user or not user.is_authenticated:
        return False
    if getattr(user, "is_superuser", False):
        return True
    groups = set(getattr(user, "groups", ()) or ())
    return any(name in groups for name in names)


class IsAdminUserGroup(BasePermission):
    message = "Admin access required."

    def has_permission(self, request, view):
        return _has_group(request.user, "Admin")


class IsDoctorUserGroup(BasePermission):
    message = "Doctor access required."

    def has_permission(self, request, view):
        return _has_group(request.user, "Doctor", "Admin")


class IsAuthenticatedUser(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)
