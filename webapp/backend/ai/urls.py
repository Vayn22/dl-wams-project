from django.urls import path
from ai.views import ai_model_list, ai_run

urlpatterns = [
    path("models/", ai_model_list),
    path("run/", ai_run),
]
