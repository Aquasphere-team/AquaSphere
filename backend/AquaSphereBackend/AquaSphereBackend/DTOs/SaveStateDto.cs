using System.Text.Json.Nodes;

namespace AquaSphereBackend.DTOs;

public class SaveStateDto
{
    public Guid UserId { get; set; }
    public JsonObject? Data  { get; set; }
}