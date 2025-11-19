# Run server and capture output
$ErrorActionPreference = "Continue"
Start-Process -NoNewWindow -FilePath "npx" -ArgumentList "tsx", "server/index.ts" -RedirectStandardOutput "server-output.txt" -RedirectStandardError "server-error.txt"
Start-Sleep -Seconds 5
Get-Content "server-output.txt" -ErrorAction SilentlyContinue
Get-Content "server-error.txt" -ErrorAction SilentlyContinue

