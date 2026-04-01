from functools import wraps
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.exceptions import AuthenticationFailed


def get_authenticated_user(request):
    """Extract and authenticate user from JWT token."""
    authenticator = JWTAuthentication()
    try:
        result = authenticator.authenticate(request)
        if result is None:
            return None
        user, token = result
        return user
    except AuthenticationFailed:
        return None


def any_role(*roles):
    """Allow access if the user has ANY of the specified roles."""
    def decorator(func):
        @wraps(func)
        def wrapper(request, *args, **kwargs):
            user = get_authenticated_user(request)
            if user is None:
                return Response(
                    {'detail': 'Authentication required.'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            if user.role not in roles:
                return Response(
                    {'detail': 'You do not have permission to perform this action.'},
                    status=status.HTTP_403_FORBIDDEN
                )
            request.user = user
            return func(request, *args, **kwargs)
        return wrapper
    return decorator


def all_roles(*roles):
    """Allow access only if the user has ALL of the specified roles."""
    def decorator(func):
        @wraps(func)
        def wrapper(request, *args, **kwargs):
            user = get_authenticated_user(request)
            if user is None:
                return Response(
                    {'detail': 'Authentication required.'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            for role in roles:
                if user.role != role:
                    return Response(
                        {'detail': 'You do not have permission to perform this action.'},
                        status=status.HTTP_403_FORBIDDEN
                    )
            request.user = user
            return func(request, *args, **kwargs)
        return wrapper
    return decorator