from dataclasses import dataclass

from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken


@dataclass
class ServiceUser:
    id: int
    username: str = ""
    email: str = ""
    groups: tuple[str, ...] = ()
    permissions: tuple[str, ...] = ()
    is_superuser: bool = False
    is_staff: bool = False
    is_authenticated: bool = True
    is_anonymous: bool = False

    def has_perm(self, perm, obj=None):
        return self.is_superuser or perm in self.permissions

    def has_perms(self, perm_list):
        return all(self.has_perm(perm) for perm in perm_list)

    def has_module_perms(self, app_label):
        prefix = f"{app_label}."
        return self.is_superuser or any(perm.startswith(prefix) for perm in self.permissions)

    def get_all_permissions(self, obj=None):
        return set(self.permissions)


class StatelessJWTAuthentication(JWTAuthentication):
    def get_user(self, validated_token):
        user_id = validated_token.get("user_id")
        if user_id is None:
            raise InvalidToken("Token missing user_id claim")

        groups = validated_token.get("groups") or ()
        permissions = validated_token.get("permissions") or ()
        return ServiceUser(
            id=int(user_id),
            username=validated_token.get("username", ""),
            email=validated_token.get("email", ""),
            groups=tuple(groups),
            permissions=tuple(permissions),
            is_superuser=bool(validated_token.get("is_superuser", False)),
            is_staff=bool(validated_token.get("is_staff", False)),
        )
