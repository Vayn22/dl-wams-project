from rest_framework.permissions import BasePermission


def _has_group(user, *names) -> bool:
    if not user or not user.is_authenticated:
        return False
    if getattr(user, "is_superuser", False):
        return True

    user_groups = getattr(user, "groups", None)
    if user_groups is None:
        groups = set()
    elif hasattr(user_groups, "values_list"):
        # Django relation manager (auth service user model)
        groups = set(user_groups.values_list("name", flat=True))
    else:
        # Fallback for tuple/list-like custom user objects
        groups = set(user_groups or ())

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
