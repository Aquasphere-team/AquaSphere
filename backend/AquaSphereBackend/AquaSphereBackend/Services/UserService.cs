using System.Security.Claims;
using AquaSphereBackend.DTOs;
using AquaSphereBackend.Interfaces;
using System.IdentityModel.Tokens.Jwt;

namespace AquaSphereBackend.Services;

public class UserService : IUserService
{
    public Guid GetUserId(ClaimsPrincipal user)
    {
        var userIdClaim =
            user.FindFirst(ClaimTypes.NameIdentifier)?.Value ??
            user.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (!Guid.TryParse(userIdClaim, out var userId))
            throw new UnauthorizedAccessException("Invalid user ID.");
        
        return userId;
        
    }

    public bool IsValidEmail(UserDto user)
    {
        return string.IsNullOrEmpty(user.Email) && user.Email.Contains('@');
    }
}