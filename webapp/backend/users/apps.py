from django.apps import AppConfig

class UsersConfig(AppConfig):
    name = 'users'

    def ready(self):
        from django.contrib.auth.models import Group

        Group.objects.get_or_create(name="Admin")
        Group.objects.get_or_create(name="Doctor")