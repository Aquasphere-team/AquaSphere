using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using AquaSphereBackend.Data;
using AquaSphereBackend.DTOs;
using AquaSphereBackend.Interfaces;
using AquaSphereBackend.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace AquaSphereBackend.Services;

public class AuthService : IAuthService
{
    private readonly IConfiguration _configuration;
    private readonly AquaSphereDbContext _dbContext;
    
    public AuthService(IConfiguration configuration, AquaSphereDbContext dbContext)
    {
        _configuration = configuration;
        _dbContext = dbContext;
    }
    
    public async Task<TokenResponseDto> RegisterAsync(AuthDto dto)
    {
        if (await _dbContext.Users.AnyAsync(u => u.Username == dto.Username)) return null!;
        
        CreatePasswordHash(dto.Password, out var passwordHash, out var passwordSalt);

        var user = new User()
        {
            Username = dto.Username,
            PasswordHash = passwordHash,
            PasswordSalt = passwordSalt
        };

        user.RefreshToken = GenerateRefreshToken();
        user.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(30);
        
        _dbContext.Users.Add(user);
        await _dbContext.SaveChangesAsync();
        
        return new TokenResponseDto
        {
            AccessToken = CreateJwtToken(user),
            RefreshToken = user.RefreshToken,
            ExpiresAt = DateTime.UtcNow.AddMinutes(15),
            TokenType = "Bearer"
        };
    }

    public async Task<TokenResponseDto> LoginAsync(AuthDto dto)
    {
        var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.Username == dto.Username);
        if (user == null)
            throw new UnauthorizedAccessException("Invalid username.");

        if (!VerifyPassword(dto.Password, user.PasswordHash, user.PasswordSalt))
            throw new UnauthorizedAccessException("Wrong password.");

        user.RefreshToken = GenerateRefreshToken();
        user.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(30);
        await _dbContext.SaveChangesAsync();

        return new TokenResponseDto
        {
            AccessToken = CreateJwtToken(user),
            RefreshToken = user.RefreshToken,
            ExpiresAt = DateTime.UtcNow.AddMinutes(15),
            TokenType = "Bearer"
        };
    }

    public void CreatePasswordHash(string password, out byte[] passwordHash, out byte[] passwordSalt)
    {
        using var hmac = new System.Security.Cryptography.HMACSHA512();
        passwordSalt = hmac.Key;
        passwordHash = hmac.ComputeHash(System.Text.Encoding.UTF8.GetBytes(password));
    }

    public bool VerifyPassword(string password, byte[] passwordHash, byte[] passwordSalt)
    {
        using var hmac = new System.Security.Cryptography.HMACSHA512(passwordSalt);
        var computedHash = hmac.ComputeHash(System.Text.Encoding.UTF8.GetBytes(password));
        return computedHash.SequenceEqual(passwordHash);
    }

    private string CreateJwtToken(User user)
    {
        var claims = new List<Claim>
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Name, user.Username),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()), // eindeutige Token-ID
            new Claim(JwtRegisteredClaimNames.Iat, DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString(), ClaimValueTypes.Integer64) // issued at
        };

        var creds = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["JwtSettings:Secret"]!)),
            SecurityAlgorithms.HmacSha512
        );

        var token = new JwtSecurityToken(
            issuer: _configuration["JwtSettings:Issuer"],
            audience: _configuration["JwtSettings:Audience"],
            claims: claims,
            notBefore: DateTime.UtcNow,
            expires: DateTime.UtcNow.AddMinutes(15),
            signingCredentials: creds);
        
        Console.WriteLine("SIGNING ALG: " + SecurityAlgorithms.HmacSha512);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private string GenerateRefreshToken()
    {
        var randomBytes = new byte[64];
        using var rng = System.Security.Cryptography.RandomNumberGenerator.Create();
        rng.GetBytes(randomBytes);
        return Base64UrlEncode(randomBytes);
    }

    private string Base64UrlEncode(byte[] input)
    {
        var base64 = Convert.ToBase64String(input);
        base64 = base64.Replace("/", "_");
        base64 = base64.Replace("+", "-");
        base64 = base64.Replace("=", "");
        
        return base64;
    }

    public async Task LogoutAsync(Guid userId)
    {
        var user = await _dbContext.Users.FindAsync(userId);
        if (user == null)
            throw new UnauthorizedAccessException("User not found.");

        user.RefreshToken = string.Empty;
        user.RefreshTokenExpiryTime = DateTime.MinValue;
        await _dbContext.SaveChangesAsync();
    }
    public async Task<TokenResponseDto> RefreshTokenAsync(string refreshToken)
    {
        var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.RefreshToken == refreshToken);
        if (user == null)
            throw new UnauthorizedAccessException("Invalid Refresh Token.");

        if (user.RefreshTokenExpiryTime < DateTime.UtcNow)
            throw new UnauthorizedAccessException("Refresh Token timed out.");

        // Sliding expiration: neuen Refresh Token erzeugen
        user.RefreshToken = GenerateRefreshToken();
        user.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(30);
        await _dbContext.SaveChangesAsync();

        return new TokenResponseDto
        {
            AccessToken = CreateJwtToken(user),
            RefreshToken = user.RefreshToken,
            ExpiresAt = DateTime.UtcNow.AddMinutes(15),
            TokenType = "Bearer"
        };
    }
}