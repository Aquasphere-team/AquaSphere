using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Nodes;

namespace AquaSphereBackend.Models;

public class SaveState
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public User? User { get; set; }

    [Column(TypeName = "jsonb")] 
    public JsonObject? StateData { get; set; }
    public DateTime LastUpdate { get; set; }
}