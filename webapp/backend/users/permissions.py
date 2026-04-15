from rest_framework.permissions import BasePermission


class CanViewUser(BasePermission):
    def has_permission(self, request, view):
        return request.user.has_perm('users.view_user')


class CanAddUser(BasePermission):
    def has_permission(self, request, view):
        return request.user.has_perm('users.add_user')


class CanChangeUser(BasePermission):
    def has_permission(self, request, view):
        return request.user.has_perm('users.change_user')


class CanDeleteUser(BasePermission):
    def has_permission(self, request, view):
        return request.user.has_perm('users.delete_user')