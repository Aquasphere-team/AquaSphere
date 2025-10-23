using AquaSphereBackend.DTOs;
using Microsoft.AspNetCore.Mvc;

namespace AquaSphereBackend.Interfaces;

public interface ISaveStateService
{
    public Task<IActionResult> SaveStateAsync([FromBody] SaveStateDto dto);
    
    public Task<IActionResult> GetStateAsync(UserDto dto);
}