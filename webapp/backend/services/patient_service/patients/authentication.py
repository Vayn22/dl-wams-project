from dataclasses import dataclass

from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken


@dataclass
class ServiceUser:
    id: int
    username: str = ""
    email: str = ""
    is_authenticated: bool = True
    is_anonymous: bool = False


class StatelessJWTAuthentication(JWTAuthentication):
    def get_user(self, validated_token):
        user_id = validated_token.get("user_id")
        if user_id is None:
            raise InvalidToken("Token missing user_id claim")

        return ServiceUser(
            id=int(user_id),
            username=validated_token.get("username", ""),
            email=validated_token.get("email", ""),
        )