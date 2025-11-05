# Clear all caches and restart dev server
Write-Host "Stopping all Node processes..." -ForegroundColor Yellow
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force

Write-Host "Clearing Vite cache..." -ForegroundColor Yellow
Remove-Item -Path "node_modules\.vite" -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "Clearing dist folder..." -ForegroundColor Yellow
Remove-Item -Path "dist" -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "All caches cleared! Starting dev server..." -ForegroundColor Green
Start-Sleep -Seconds 2
npm run dev

