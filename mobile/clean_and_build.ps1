Write-Host "Cleaning and Building Memento APK..." -ForegroundColor Cyan

# Set JAVA_HOME to Microsoft OpenJDK 17 to avoid version mismatch (Java 25 causes "major version 69" error)
$env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-17.0.17.10-hotspot"
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
Write-Host "Set JAVA_HOME to: $env:JAVA_HOME" -ForegroundColor Gray

# Set ANDROID_HOME
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
Write-Host "Set ANDROID_HOME to: $env:ANDROID_HOME" -ForegroundColor Gray

# 0. Set Node.js Path (Fix for npm not found)
$env:Path = "C:\Program Files\nodejs;$env:Path"
Write-Host "Added Node.js to PATH: C:\Program Files\nodejs" -ForegroundColor Gray

# 1. Install Dependencies (use --legacy-peer-deps due to react-native-android-notification-listener compatibility)
Write-Host "Installing dependencies..." -ForegroundColor Yellow
npm install --legacy-peer-deps
if ($LASTEXITCODE -ne 0) {
    Write-Error "npm install failed! Please ensure Node.js is installed and in your PATH."
    exit 1
}

# 2. Clean Android Build
Write-Host "Cleaning Android build..." -ForegroundColor Yellow
Push-Location android
./gradlew.bat clean
if ($LASTEXITCODE -ne 0) {
    Write-Error "Gradle clean failed!"
    Pop-Location
    exit 1
}
Pop-Location

# 3. Build APK
Write-Host "Building APK..." -ForegroundColor Yellow
./build_apk_local.ps1
