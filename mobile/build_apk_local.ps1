# Script to build a Debug APK locally
Write-Host "Building Debug APK..." -ForegroundColor Cyan

# 0. Set JAVA_HOME to Microsoft OpenJDK 17
$env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-17.0.9.8-hotspot"
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
Write-Host "Using JAVA_HOME: $env:JAVA_HOME" -ForegroundColor Gray

# 1. Set Android Home (Common path on Windows)
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
if (-not (Test-Path $env:ANDROID_HOME)) {
    Write-Error "Android SDK not found at $env:ANDROID_HOME. Please install Android Studio or set ANDROID_HOME manually."
    exit 1
}

# 2. Navigate to android folder
Push-Location android

# 3. Run Gradle Build
# assembleRelease creates a release APK (bundled JS, standalone)
# We use the debug keystore for signing (configured in build.gradle), so it's easy to install.
./gradlew.bat assembleRelease

if ($LASTEXITCODE -ne 0) {
    Write-Error "Build failed!"
    Pop-Location
    exit 1
}

Pop-Location

# 4. Copy APK to root
$apkPath = "android\app\build\outputs\apk\release\app-release.apk"
$destPath = "memento-release.apk"

if (Test-Path $apkPath) {
    Copy-Item $apkPath $destPath -Force
    Write-Host "--------------------------------------------------" -ForegroundColor Green
    Write-Host "SUCCESS! APK created at: $PWD\$destPath" -ForegroundColor Green
    Write-Host "Transfer this file to your phone and install it." -ForegroundColor Green
    Write-Host "--------------------------------------------------" -ForegroundColor Green
} else {
    Write-Error "APK file not found at expected path: $apkPath"
}
