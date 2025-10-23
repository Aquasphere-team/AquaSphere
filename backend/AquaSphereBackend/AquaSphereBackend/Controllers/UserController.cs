using AquaSphereBackend.Data;
using AquaSphereBackend.DTOs;
using AquaSphereBackend.Interfaces;
using AquaSphereBackend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AquaSphereBackend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class UserController : ControllerBase
{
    private readonly IUserService _userService;
    private readonly AquaSphereDbContext _dbContext;
    
    public UserController(IUserService userService, AquaSphereDbContext dbContext)
    {
        _userService = userService;
        _dbContext = dbContext;
    }

    [Authorize]
    [HttpPost("addEmail")]
    public async Task<ActionResult<User>> AddEmail(UserDto dto)
    {
        var userId = _userService.GetUserId(User);
        var user = await _dbContext.Users.FindAsync(userId);
        if (user == null) return BadRequest();
        if (!_userService.IsValidEmail(dto)) return BadRequest("Invalid email");
        user.Email = dto.Email;
        await _dbContext.SaveChangesAsync();
        return Ok();
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<ActionResult<User>> GetCurrentUser()
    {
        var userId = _userService.GetUserId(User);
        var user = await _dbContext.Users.FindAsync(userId);
        if (user == null) return NotFound();

        var userDto = new UserDto
        {
            Id = user.Id,
            Email = user.Email,
            Username = user.Username,
        };
        return Ok(userDto);
    }
}