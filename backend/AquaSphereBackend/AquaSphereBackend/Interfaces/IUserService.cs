using AquaSphereBackend.DTOs;

namespace AquaSphereBackend.Interfaces;

public interface IUserService
{
    Guid GetUserId(System.Security.Claims.ClaimsPrincipal user);
    bool IsValidEmail(UserDto user);
}