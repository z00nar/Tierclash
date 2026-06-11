# start-tierclash.ps1
# Checks the setup and launches the Tier Clash app in your browser.

Write-Host "=== Tier Clash launcher ===" -ForegroundColor Cyan

# 1. Is Node installed? (used to run a small local web server)
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
    Write-Host "Node.js isn't installed. Get it from https://nodejs.org, then run this again." -ForegroundColor Red
    exit 1
}
Write-Host "Node.js found: $(node --version)" -ForegroundColor Green

# 2. Are we in the project folder? (check the app file is here)
if (-not (Test-Path ".\src\Tier Clash.html")) {
    Write-Host "Can't find the app. Run this from your project folder (the one with 'src')." -ForegroundColor Red
    exit 1
}
Write-Host "App found." -ForegroundColor Green

# 3. Start the server (in its own window) and open the app
try {
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "npx --yes http-server . -p 3000 -c-1"
    Start-Sleep -Seconds 3
    Start-Process "http://localhost:3000/src/Tier%20Clash.html"
    Write-Host "Launched! App is in your browser; the server runs in the new window." -ForegroundColor Green
} catch {
    Write-Host "Couldn't launch: $_" -ForegroundColor Red
    exit 1
}