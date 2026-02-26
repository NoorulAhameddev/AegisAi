param()
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location -Path $ProjectRoot
Write-Host "Running local setup for Aegis-Ai in $ProjectRoot..."
Write-Host "1) Installing npm dependencies (workspaces)"
# Ensure npm runs in project root
npm install
if ($LASTEXITCODE -ne 0) { Write-Error "npm install failed with code $LASTEXITCODE"; exit $LASTEXITCODE }
Write-Host "2) Installing husky hooks"
npm run prepare --silent
Write-Host "Setup complete. Next steps: review .env files, run 'npm run build:all' or 'npm run dev' as needed."