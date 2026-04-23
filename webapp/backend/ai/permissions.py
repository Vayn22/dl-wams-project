from rest_framework.permissions import BasePermission


class CanViewAIModel(BasePermission):
    def has_permission(self, request, view):
        return request.user.has_perm("ai.view_ai_model")


class CanRunAIModel(BasePermission):
    def has_permission(self, request, view):
        return request.user.has_perm("ai.run_ai_model")
