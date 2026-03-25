from django.urls import path
from .views import AdminOnlyView, MemberView

urlpatterns = [
    path('admin-only/', AdminOnlyView.as_view(), name='admin_only'),
    path('member/', MemberView.as_view(), name='member'),
]