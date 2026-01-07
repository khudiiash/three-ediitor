Add-Type -AssemblyName System.Drawing

$bmp = New-Object System.Drawing.Bitmap(256, 256)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.Clear([System.Drawing.Color]::FromArgb(41, 128, 185))

$brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
$font = New-Object System.Drawing.Font('Arial', 120, [System.Drawing.FontStyle]::Bold)
$g.DrawString('3D', $font, $brush, 20, 50)
$g.Dispose()

$icon = [System.Drawing.Icon]::FromHandle($bmp.GetHicon())
$stream = [System.IO.File]::Create("$PSScriptRoot\icon.ico")
$icon.Save($stream)
$stream.Close()

$bmp.Dispose()
$icon.Dispose()

Write-Host "Icon created successfully!"

