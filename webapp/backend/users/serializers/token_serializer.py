from rest_framework_simplejwt.serializers import TokenObtainPairSerializer


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        # ✅ Replace role with groups
        token["groups"] = [group.name for group in user.groups.all()]
        token["email"] = user.email

        return token
