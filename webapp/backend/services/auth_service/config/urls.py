from django.contrib import admin
from django.urls import include, path

from users.views.token_obtain import token_obtain
from users.views.token_refresh import token_refresh

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/token/", token_obtain, name="token_obtain_pair"),
    path("api/token/refresh/", token_refresh, name="token_refresh"),
    path("api/users/", include("users.urls")),
]
