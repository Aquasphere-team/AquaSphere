using AquaSphereBackend.DTOs;
using AquaSphereBackend.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AquaSphereBackend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    
    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register(AuthDto dto)
    {
        var token = await _authService.RegisterAsync(dto);
        return token == null ? BadRequest("Invalid username or password") : Ok(token);
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(AuthDto dto)
    {
        var token = await _authService.LoginAsync(dto);
        return token == null ? Unauthorized(new { error = "Wrong credentials" }) : Ok(token);
    }

    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh([FromBody] TokenResponseDto dto)
    {
        try 
        {
            var token = await _authService.RefreshTokenAsync(dto.RefreshToken);
            return Ok(token);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { error = ex.Message });
        }
    }
    
    [Authorize]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        try
        {
            var subClaim = User.FindFirst(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub);
            if (subClaim == null || !Guid.TryParse(subClaim.Value, out var userId))
                return Unauthorized(new { error = "Not even logged in" });
            await _authService.LogoutAsync(userId);
            return NoContent();
        }
        catch
        {
            return StatusCode(500, new { error = "An error occurred while logging out." });
        }
    }
}