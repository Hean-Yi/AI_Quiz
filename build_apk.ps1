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

# PATCH: Force Java 17 in generated capacitor.build.gradle
$capBuildFile = "android/app/capacitor.build.gradle"
if (Test-Path $capBuildFile) {
    Write-Host "🔧 Patching capacitor.build.gradle to use Java 17..." -ForegroundColor Cyan
    (Get-Content $capBuildFile) -replace 'VERSION_21', 'VERSION_17' | Set-Content $capBuildFile
}

# PATCH: Force Java 17 in all Capacitor Plugins (node_modules)
Write-Host "🔧 Patching Capacitor plugins to use Java 17..." -ForegroundColor Cyan
$pluginBuildFiles = Get-ChildItem -Path "node_modules/@capacitor/*/android/build.gradle" -Recurse
$coreBuildFile = "node_modules/@capacitor/android/capacitor/build.gradle"
if (Test-Path $coreBuildFile) {
    $pluginBuildFiles += Get-Item $coreBuildFile
}

foreach ($file in $pluginBuildFiles) {
    Write-Host "  - Patching $($file.FullName)" -ForegroundColor DarkGray
    (Get-Content $file.FullName) -replace 'VERSION_21', 'VERSION_17' -replace 'jvmToolchain\(21\)', 'jvmToolchain(17)' | Set-Content $file.FullName
}

# 4. Build APK using Gradle
Write-Host "🔨 Building APK (Debug)..." -ForegroundColor Yellow
Set-Location "android"

# 临时设置 JAVA_HOME 为 JDK 17 (仅对当前脚本会话有效)
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-17.0.17.10-hotspot"
Write-Host "☕ Using JDK at: $env:JAVA_HOME" -ForegroundColor Cyan

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
