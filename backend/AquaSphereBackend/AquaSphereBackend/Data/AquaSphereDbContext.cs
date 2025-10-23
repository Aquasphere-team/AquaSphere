using AquaSphereBackend.Models;
using Microsoft.EntityFrameworkCore;

namespace AquaSphereBackend.Data;

public class AquaSphereDbContext : DbContext
{
    public AquaSphereDbContext(DbContextOptions<AquaSphereDbContext> options) : base(options)
    { }
    
    public DbSet<User> Users => Set<User>();
    
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        
        modelBuilder.Entity<User>()
            .Property(u => u.Id)
            .ValueGeneratedNever();

        modelBuilder.Entity<User>().ToTable("users");
    }
}