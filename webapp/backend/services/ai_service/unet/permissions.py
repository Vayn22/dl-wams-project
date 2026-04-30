from rest_framework.permissions import BasePermission


class CanSegment(BasePermission):
    """
    Grant access if the incoming JWT contains the 'ai.use_segmentation' permission.
    """
    message = "AI segmentation permission (ai.use_segmentation) required."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.has_perm("ai.use_segmentation")
        )