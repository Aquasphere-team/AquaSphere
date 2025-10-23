namespace AquaSphereBackend.Models;

public class User
{
    public Guid Id { get; set; }
    public string Username { get; set; } = String.Empty;
    public byte[] PasswordHash { get; set; }
    public byte[] PasswordSalt { get; set; }
    
    public string? Email { get; set; }
    
    public string RefreshToken { get; set; } = string.Empty;
    public DateTime RefreshTokenExpiryTime { get; set; }
    
    public SaveState? SaveState { get; set; }
}