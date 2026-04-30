from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from ..rbac import build_permissions, get_doctor_profile


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["username"] = user.username
        token["email"] = user.email
        token["groups"] = [group.name for group in user.groups.all()]
        token["permissions"] = build_permissions(user)
        token["is_superuser"] = user.is_superuser
        token["is_staff"] = user.is_staff

        profile = get_doctor_profile(user)
        if profile and profile.specialty:
            token["specialty_id"] = profile.specialty_id

        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        profile = get_doctor_profile(self.user)

        data["user"] = {
            "id": self.user.id,
            "username": self.user.username,
            "email": self.user.email,
            "first_name": self.user.first_name,
            "last_name": self.user.last_name,
            "groups": [group.name for group in self.user.groups.all()],
            "permissions": build_permissions(self.user),
            "is_superuser": self.user.is_superuser,
            "is_staff": self.user.is_staff,
            "specialty": (
                {
                    "id": profile.specialty_id,
                    "name": profile.specialty.name,
                    "description": profile.specialty.description,
                }
                if profile and profile.specialty
                else None
            ),
        }
        return data
