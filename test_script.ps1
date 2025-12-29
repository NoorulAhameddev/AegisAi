$ErrorActionPreference = "Stop"
try {
    $email = "testuser" + (Get-Random) + "@example.com"
    $pass = "password123"
    $base = "http://localhost:3000"

    Write-Host "1. Registering $email..."
    $reg = Invoke-RestMethod -Uri "$base/api/auth/register" -Method Post -Body (@{name="Tester"; email=$email; password=$pass} | ConvertTo-Json) -ContentType "application/json"
    Write-Host "   Registered: $($reg.message)"

    Write-Host "2. Logging in..."
    $loginResponse = Invoke-WebRequest -Uri "$base/api/auth/login" -Method Post -Body (@{email=$email; password=$pass} | ConvertTo-Json) -ContentType "application/json" -SessionVariable sess
    Write-Host "   Logged In. Status: $($loginResponse.StatusCode)"

    Write-Host "3. Creating Conversation..."
    $convo = Invoke-RestMethod -Uri "$base/api/conversations" -Method Post -WebSession $sess
    Write-Host "   Conversation ID: $($convo.id)"

    Write-Host "4. Sending Chat Message..."
    $response = Invoke-WebRequest -Uri "$base/api/chat/stream" -Method Post -Body (@{conversationId=$convo.id; message="Hello AI"} | ConvertTo-Json) -ContentType "application/json" -WebSession $sess
    
    Write-Host "   Response Received (First 500 chars):"
    $content = $response.Content
    if ($content.Length -gt 500) { $content = $content.Substring(0, 500) }
    Write-Host $content
} catch {
    Write-Error "Error: $_"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader $_.Exception.Response.GetResponseStream()
        Write-Error "Response content: $($reader.ReadToEnd())"
    }
}
