from rest_framework.permissions import BasePermission


def _has_admin_access(user):
    if not user or not user.is_authenticated:
        return False
    if user.is_superuser:
        return True

    groups = set(user.groups.values_list('name', flat=True))
    return 'Admin' in groups


class CanViewUser(BasePermission):
    def has_permission(self, request, view):
        return _has_admin_access(request.user) or request.user.has_perm('users.view_user')


class CanAddUser(BasePermission):
    def has_permission(self, request, view):
        return _has_admin_access(request.user) or request.user.has_perm('users.add_user')


class CanChangeUser(BasePermission):
    def has_permission(self, request, view):
        return _has_admin_access(request.user) or request.user.has_perm('users.change_user')


class CanDeleteUser(BasePermission):
    def has_permission(self, request, view):
        return _has_admin_access(request.user) or request.user.has_perm('users.delete_user')