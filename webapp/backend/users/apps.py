from django.apps import AppConfig
from django.db.models.signals import post_migrate


def create_default_groups(sender, **kwargs):
    from django.contrib.auth.models import Group

    Group.objects.get_or_create(name="Admin")
    Group.objects.get_or_create(name="Doctor")

class UsersConfig(AppConfig):
    name = 'users'

    def ready(self):
        post_migrate.connect(
            create_default_groups,
            sender=self,
            dispatch_uid="users.create_default_groups",
        )