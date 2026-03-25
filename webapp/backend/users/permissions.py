from rest_framework.permissions import BasePermission


class IsAdmin(BasePermission):
    """Allow access only to admin users."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'admin'


class IsMember(BasePermission):
    """Allow access only to member users."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'member'


class IsAdminOrMember(BasePermission):
    """Allow access to any authenticated user regardless of role."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ['admin', 'member']