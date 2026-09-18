# Force Expo/Metro to advertise the Wi-Fi IPv4 (avoids 127.0.0.1 when VPN/APIPA exist)
$ErrorActionPreference = 'Stop'

$wifi = Get-NetIPAddress -AddressFamily IPv4 |
  Where-Object { $_.InterfaceAlias -eq 'Wi-Fi' -and $_.IPAddress -notlike '169.254.*' } |
  Select-Object -First 1 -ExpandProperty IPAddress

if (-not $wifi) {
  Write-Error "Aucune IP Wi-Fi utile trouvée. Désactive le VPN ou reconnecte-toi au Wi-Fi."
}

$env:REACT_NATIVE_PACKAGER_HOSTNAME = $wifi
$env:EXPO_NO_ADB = '1'

Write-Host "Expo LAN host forcé: $wifi" -ForegroundColor Green
npx expo start --host lan --clear @args
