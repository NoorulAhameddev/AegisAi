# Cleanup script for generated artifacts
# Removes .next, .logs, and other build outputs

$paths = @(".next", ".logs", "server_debug.log", "worker_debug.log")
foreach ($path in $paths) {
    if (Test-Path $path) {
        Remove-Item $path -Recurse -Force
        Write-Host "Removed $path"
    } else {
        Write-Host "$path not found"
    }
}

Write-Host "Cleanup complete."
