# ============================================================
# StudioKasir Cloud Setup Script
# Jalankan dari C:\StudioKasirCloud
# ============================================================

Write-Host "Setting up StudioKasir Cloud..." -ForegroundColor Cyan

# 1. Hapus file yang tidak diperlukan untuk cloud
$removeFiles = @(
    "StudioKasir-service.exe",
    "StudioKasir-service.xml",
    "install_service.bat",
    "restart-service.bat",
    "update_app.bat",
    "MasterSetup.ps1",
    "CreateShortcut.ps1",
    "open_browser.bat",
    "node-installer.msi",
    "gdrive-key.json",
    "license.key",
    "unins000.dat",
    "unins000.exe",
    "unins001.dat",
    "unins001.exe",
    "fix_all.bat",
    "setup_database.bat",
    "prisma.rar",
    "src.rar",
    "src.zip",
    "import_skip_log.txt",
    "WriteAuth.ps1"
)

foreach ($f in $removeFiles) {
    if (Test-Path "C:\StudioKasirCloud\$f") {
        Remove-Item "C:\StudioKasirCloud\$f" -Force
        Write-Host "Removed: $f" -ForegroundColor Gray
    }
}

Write-Host "Cleanup done!" -ForegroundColor Green
