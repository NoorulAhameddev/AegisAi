param()
Write-Host "Generating example secrets (print-only; do not store generated secrets in repo)"
$access = [System.Convert]::ToBase64String((New-Object System.Security.Cryptography.RNGCryptoServiceProvider).GetBytes(32))
$refresh = [System.Convert]::ToBase64String((New-Object System.Security.Cryptography.RNGCryptoServiceProvider).GetBytes(32))
$hex = -join ((1..16) | ForEach-Object { '{0:x2}' -f (Get-Random -Minimum 0 -Maximum 256) })
Write-Host "JWT_ACCESS_SECRET=$access"
Write-Host "JWT_REFRESH_SECRET=$refresh"
Write-Host "ENCRYPTION_KEY=$hex"
Write-Host "AUDIT_SIGNING_KEY=$access"
