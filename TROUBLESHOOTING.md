# Troubleshooting: "Export 'import_react3' is not defined in module"

This error is typically caused by browser cache issues. Follow these steps:

## Solution 1: Clear Browser Cache (RECOMMENDED)

1. **Open Chrome/Edge DevTools** (F12)
2. **Right-click on the refresh button** (while DevTools is open)
3. Select **"Empty Cache and Hard Reload"**

OR

1. Press **Ctrl + Shift + Delete** (Windows) or **Cmd + Shift + Delete** (Mac)
2. Select **"Cached images and files"**
3. Click **"Clear data"**
4. Close and reopen your browser
5. Navigate to `http://localhost:5179`

## Solution 2: Use Incognito/Private Window

1. Open a new **Incognito/Private window**
2. Navigate to `http://localhost:5179`
3. If it works, the issue is browser cache

## Solution 3: Clear Server Cache

Run this PowerShell script:
```powershell
.\clear-cache.ps1
```

Or manually:
```powershell
# Stop Node processes
Get-Process -Name node | Stop-Process -Force

# Clear Vite cache
Remove-Item -Path "node_modules\.vite" -Recurse -Force

# Restart server
npm run dev
```

## Solution 4: Complete Fresh Start

```powershell
# Stop all Node processes
Get-Process -Name node | Stop-Process -Force

# Remove node_modules and reinstall
Remove-Item -Path "node_modules" -Recurse -Force
Remove-Item -Path "package-lock.json" -Force
npm install

# Clear Vite cache
Remove-Item -Path "node_modules\.vite" -Recurse -Force

# Start server
npm run dev
```

Then **clear your browser cache** (Solution 1) and try again.

## Why This Happens

Vite pre-bundles dependencies for faster loading. Sometimes the browser caches old bundled files that reference modules that no longer exist. Clearing the cache forces the browser to download fresh files.

## Still Not Working?

1. Check that the server is running on port 5179
2. Try a different browser (Firefox, Chrome, Edge)
3. Check the terminal for any server errors
4. Verify `node_modules` is installed correctly

