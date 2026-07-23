# Runs the app on a device with the console + Supabase defines set for
# LAN testing: phone and PC on the same Wi-Fi, console on this PC.
#
#   cd safezone
#   .\run-lan.ps1                # uses the current Wi-Fi IPv4 automatically
#   .\run-lan.ps1 -Ip 10.0.2.2   # Android emulator instead of a real phone
#
# Supabase URL/key are read from ..\safezone-console\.env.local so they are
# never duplicated here.

param(
    [string]$Ip
)

$ErrorActionPreference = 'Stop'

if (-not $Ip) {
    $wifi = Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias 'Wi-Fi' -ErrorAction SilentlyContinue |
        Select-Object -First 1 -ExpandProperty IPAddress
    if (-not $wifi) {
        Write-Error "No Wi-Fi IPv4 found. Pass one explicitly: .\run-lan.ps1 -Ip 192.168.1.105"
    }
    $Ip = $wifi
}

$envFile = Join-Path $PSScriptRoot '..\safezone-console\.env.local'
if (-not (Test-Path $envFile)) {
    Write-Error "Missing $envFile - fill in the console env first."
}

$supabaseUrl = $null
$supabaseKey = $null
foreach ($line in Get-Content $envFile) {
    if ($line -match '^NEXT_PUBLIC_SUPABASE_URL="(.+)"')      { $supabaseUrl = $Matches[1] }
    if ($line -match '^NEXT_PUBLIC_SUPABASE_ANON_KEY="(.+)"') { $supabaseKey = $Matches[1] }
}
if (-not $supabaseUrl -or -not $supabaseKey) {
    Write-Error "Supabase URL or anon key not found in $envFile"
}

$consoleUrl = "http://${Ip}:3000"
Write-Host "CONSOLE_URL  = $consoleUrl"
Write-Host "SUPABASE_URL = $supabaseUrl"
Write-Host "TEST_MODE    = true  (phone verification bypassed - dev only)"
Write-Host ""
Write-Host "Make sure the console is running with APP_AUTH_TEST_MODE=1 (set in .env.local):"
Write-Host "  cd ..\safezone-console; npm run dev"
Write-Host ""

# TEST_MODE bypasses Supabase SMS verification (the dev project has no SMS
# provider). The console must also run with APP_AUTH_TEST_MODE=1 to honour it.
flutter run `
    --dart-define=CONSOLE_URL=$consoleUrl `
    --dart-define=SUPABASE_URL=$supabaseUrl `
    --dart-define=SUPABASE_PUBLISHABLE_KEY=$supabaseKey `
    --dart-define=TEST_MODE=true
