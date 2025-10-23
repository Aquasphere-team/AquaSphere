using System.ComponentModel.DataAnnotations.Schema;

namespace AquaSphereBackend.Models;

public class SaveState
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public User User { get; set; }
    [Column(TypeName = "jsonb")]
    public string StateData { get; set; } = string.Empty;
    public DateTime LastUpdate { get; set; }
}