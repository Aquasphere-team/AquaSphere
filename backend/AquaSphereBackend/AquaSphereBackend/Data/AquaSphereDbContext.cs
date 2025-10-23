using AquaSphereBackend.Models;
using Microsoft.EntityFrameworkCore;

namespace AquaSphereBackend.Data;

public class AquaSphereDbContext : DbContext
{
    public AquaSphereDbContext(DbContextOptions<AquaSphereDbContext> options) : base(options)
    { }
    
    public DbSet<User> Users => Set<User>();
    public DbSet<SaveState> SaveStates => Set<SaveState>();
    
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        
        modelBuilder.Entity<User>().ToTable("users");
        
        modelBuilder.Entity<SaveState>().ToTable("savestates");
        
        modelBuilder.Entity<User>()
            .HasOne(u => u.SaveState)
            .WithOne(s => s.User)
            .HasForeignKey<SaveState>(s => s.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}