# Build Script for AI Quiz Android APK

Write-Host "🚀 Starting Android Build Process..." -ForegroundColor Cyan

# 1. Build Vue Project
Write-Host "📦 Building Vue Frontend..." -ForegroundColor Yellow
Set-Location "client"
npm run build
if ($LASTEXITCODE -ne 0) { Write-Error "Vue Build Failed"; exit 1 }

# 2. Generate Assets (Icons & Splash)
if (Test-Path "assets/icon.png") {
    Write-Host "🎨 Generating App Icons & Splash Screen..." -ForegroundColor Yellow
    npx capacitor-assets generate --android
} else {
    Write-Host "⚠️  No icon.png found in client/assets. Using default Capacitor icons." -ForegroundColor Magenta
}

# 3. Sync Capacitor
Write-Host "🔄 Syncing with Android Project..." -ForegroundColor Yellow
npx cap sync android

# 4. Build APK using Gradle
Write-Host "🔨 Building APK (Debug)..." -ForegroundColor Yellow
Set-Location "android"
./gradlew assembleDebug

if ($LASTEXITCODE -eq 0) {
    $apkPath = "app/build/outputs/apk/debug/app-debug.apk"
    if (Test-Path $apkPath) {
        $destPath = "../../../AI_Quiz_Debug.apk"
        Copy-Item $apkPath $destPath
        Write-Host "✅ Build Success!" -ForegroundColor Green
        Write-Host "📱 APK exported to: $destPath" -ForegroundColor Green
    } else {
        Write-Error "❌ APK file not found after build."
    }
} else {
    Write-Error "❌ Gradle Build Failed. Please check Android SDK configuration."
}

Set-Location ../..
