using AquaSphereBackend.Data;
using AquaSphereBackend.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AquaSphereBackend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SaveStateController : ControllerBase
{
    private readonly ISaveStateService _saveStateService;
    private readonly AquaSphereDbContext _dbContext;
    
    public SaveStateController(ISaveStateService saveStateService, AquaSphereDbContext dbContext)
    {
        _saveStateService = saveStateService;
        _dbContext = dbContext;
    }

    [Authorize]
    [HttpPost("save")]
    public async Task<IActionResult> SaveState([FromBody] DTOs.SaveStateDto dto)
    {
        if (dto.UserId == Guid.Empty)
        {
            var user = await _dbContext.Users.FindAsync(dto.UserId);
            if (user == null)
            {
                return BadRequest("User not found");
            }
        }

        _dbContext.SaveStates.AddAsync(new Models.SaveState
        {
            Id = Guid.NewGuid(),
            UserId = dto.UserId,
            StateData = dto.Data,
            LastUpdate = DateTime.UtcNow
        });
        await _dbContext.SaveChangesAsync();
        return Ok();
    }

    [HttpPut("autoSave")]
    public async Task<IActionResult> AutoSaveState([FromBody] DTOs.SaveStateDto saveStateDto)
    {
        var existingState = await _dbContext.SaveStates
            .FirstOrDefaultAsync(s => s.UserId == saveStateDto.UserId);
        if (existingState != null)
        {
            existingState.StateData = saveStateDto.Data;
            existingState.LastUpdate = DateTime.UtcNow;
        }
        else
        {
            await SaveState(saveStateDto);
        }
        await _dbContext.SaveChangesAsync();
        return Ok();
    }
    
    [HttpGet("load")]
    public async Task<IActionResult> GetState([FromQuery] DTOs.UserDto dto)
    {
        var saveState = await _dbContext.SaveStates
            .FirstOrDefaultAsync(s => s.UserId == dto.Id);
        if (saveState == null)
        {
            return NotFound("No save state found for this user");
        }

        var saveStateDto = new DTOs.SaveStateDto
        {
            UserId = saveState.UserId,
            Data = saveState.StateData
        };
        return Ok(saveStateDto);
    }
}