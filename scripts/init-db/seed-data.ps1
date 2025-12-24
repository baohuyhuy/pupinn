# PowerShell script to seed database with sample data
# Usage: .\scripts\init-db\seed-data.ps1

param(
    [string]$DatabaseName = "pupinn_db",
    [string]$DatabaseUser = "dtdat"
)

Write-Host " Seeding database with sample data..." -ForegroundColor Green
Write-Host ""

$seedFiles = @(
    "scripts/init-db/seeds/01-seed-users.sql",
    "scripts/init-db/seeds/02-seed-rooms.sql",
    "scripts/init-db/seeds/03-seed-bookings.sql"
)

foreach ($file in $seedFiles) {
    if (Test-Path $file) {
        Write-Host "Loading: $(Split-Path $file -Leaf)" -ForegroundColor Cyan
        Get-Content $file | docker compose exec -T postgres psql -U $DatabaseUser -d $DatabaseName
        if ($LASTEXITCODE -eq 0) {
            Write-Host "   Completed" -ForegroundColor Green
        } else {
            Write-Host "   Failed" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "   File not found: $file" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host " Database seeding complete!" -ForegroundColor Green

