Param(
  [string]$Email = 'demo@example.com',
  [string]$Password = 'demo123',
  [string]$Name = 'Extension Demo',
  [string]$ProjectName = 'Demo Project A',
  [string]$Description = 'Seeded by script'
)

$ErrorActionPreference = 'Stop'
$base = 'http://localhost:3001/api'

Write-Host "Authenticating as $Email ..."
$token = $null
try {
  $loginPayload = @{ email = $Email; password = $Password } | ConvertTo-Json
  $loginResp = Invoke-RestMethod -Method Post -Uri ($base + '/auth/login') -Body $loginPayload -ContentType 'application/json'
  $token = $loginResp.accessToken
  if ($token) { Write-Host "Logged in" }
} catch {
  Write-Host "Login failed, attempting registration ..."
}

if (-not $token) {
  $registerPayload = @{ email = $Email; password = $Password; name = $Name } | ConvertTo-Json
  $regResp = Invoke-RestMethod -Method Post -Uri ($base + '/auth/register') -Body $registerPayload -ContentType 'application/json'
  $token = $regResp.accessToken
  if (-not $token) { throw 'Registration failed' }
  Write-Host "Registered new user"
}

$headers = @{ Authorization = "Bearer $token" }
$projPayload = @{ name = $ProjectName; description = $Description } | ConvertTo-Json

Write-Host "Creating project '$ProjectName' ..."
$proj = Invoke-RestMethod -Method Post -Headers $headers -Uri ($base + '/projects') -Body $projPayload -ContentType 'application/json'
Write-Host "Created project:" ($proj | ConvertTo-Json -Depth 5)

Write-Host "Listing projects ..."
$list = Invoke-RestMethod -Method Get -Headers $headers -Uri ($base + '/projects')
$list | ConvertTo-Json -Depth 5