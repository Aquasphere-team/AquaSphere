using AquaSphereBackend.DTOs;

namespace AquaSphereBackend.Interfaces;

public interface IAuthService
{
    public Task<TokenResponseDto> RegisterAsync(AuthDto dto);
    public Task<TokenResponseDto> LoginAsync(AuthDto dto);

    public Task LogoutAsync(Guid userId);

    public Task<TokenResponseDto> RefreshTokenAsync(string refreshToken);
    
    public void CreatePasswordHash(string password, out byte[] passwordHash, out byte[] passwordSalt);
    public bool VerifyPassword(string password, byte[] passwordHash, byte[] passwordSalt);
}