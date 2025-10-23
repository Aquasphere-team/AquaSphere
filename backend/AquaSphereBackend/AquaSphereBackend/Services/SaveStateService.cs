using AquaSphereBackend.DTOs;
using AquaSphereBackend.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace AquaSphereBackend.Services;

public class SaveStateService : ISaveStateService
{
    public Task<IActionResult> SaveStateAsync(SaveStateDto dto)
    {
        throw new NotImplementedException();
    }

    public Task<IActionResult> GetStateAsync(UserDto dto)
    {
        throw new NotImplementedException();
    }
}