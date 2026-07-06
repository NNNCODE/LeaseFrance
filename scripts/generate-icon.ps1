# Regenerates build/icon.ico (Baillio app icon).
# Design: indigo->violet rounded tile + white house glyph with door/window negative space,
# matching the in-app sidebar logo (primary #6366F1 on dark surfaces).
# Usage: powershell -ExecutionPolicy Bypass -File scripts/generate-icon.ps1
Add-Type -AssemblyName System.Drawing

$repo = Split-Path -Parent $PSScriptRoot
$icoPath = Join-Path $repo 'build\icon.ico'

function New-RoundedRectPath([float]$x, [float]$y, [float]$w, [float]$h, [float]$r) {
  $p = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = 2 * $r
  $p.AddArc($x, $y, $d, $d, 180, 90)
  $p.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
  $p.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
  $p.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
  $p.CloseFigure()
  return $p
}

function New-IconBitmap([int]$s) {
  $bmp = New-Object System.Drawing.Bitmap($s, $s, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

  # Rounded gradient tile
  $m = [float]($s * 0.03)
  $w = [float]($s - 2 * $m)
  $r = [float]($w * 0.23)
  $tile = New-RoundedRectPath $m $m $w $w $r
  $bg = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    (New-Object System.Drawing.PointF(0, 0)),
    (New-Object System.Drawing.PointF($s, $s)),
    [System.Drawing.Color]::FromArgb(255, 76, 70, 229),
    [System.Drawing.Color]::FromArgb(255, 150, 92, 255))
  $bg.WrapMode = [System.Drawing.Drawing2D.WrapMode]::TileFlipXY
  $g.FillPath($bg, $tile)

  # Soft top sheen
  $sheen = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    (New-Object System.Drawing.PointF(0, $m)),
    (New-Object System.Drawing.PointF(0, [float]($m + $w * 0.6))),
    [System.Drawing.Color]::FromArgb(48, 255, 255, 255),
    [System.Drawing.Color]::FromArgb(0, 255, 255, 255))
  $sheen.WrapMode = [System.Drawing.Drawing2D.WrapMode]::TileFlipXY
  $g.FillPath($sheen, $tile)

  # House silhouette (pentagon), white with faint vertical tint
  $pts = @(
    (New-Object System.Drawing.PointF([float]($s * 0.500), [float]($s * 0.215))),
    (New-Object System.Drawing.PointF([float]($s * 0.790), [float]($s * 0.470))),
    (New-Object System.Drawing.PointF([float]($s * 0.790), [float]($s * 0.785))),
    (New-Object System.Drawing.PointF([float]($s * 0.210), [float]($s * 0.785))),
    (New-Object System.Drawing.PointF([float]($s * 0.210), [float]($s * 0.470)))
  )
  # Shadow pass (skipped at tiny sizes where it reads as noise)
  if ($s -ge 24) {
    $shadowPts = $pts | ForEach-Object { New-Object System.Drawing.PointF($_.X, [float]($_.Y + $s * 0.018)) }
    $shadowBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(52, 20, 12, 60))
    $g.FillPolygon($shadowBrush, [System.Drawing.PointF[]]$shadowPts)
  }
  # Body
  $houseBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    (New-Object System.Drawing.PointF(0, [float]($s * 0.215))),
    (New-Object System.Drawing.PointF(0, [float]($s * 0.785))),
    [System.Drawing.Color]::FromArgb(255, 255, 255, 255),
    [System.Drawing.Color]::FromArgb(255, 224, 223, 252))
  $houseBrush.WrapMode = [System.Drawing.Drawing2D.WrapMode]::TileFlipXY
  $g.FillPolygon($houseBrush, [System.Drawing.PointF[]]$pts)

  # Door cutout (rounded top), filled with the tile gradient so it reads as negative space
  $doorPath = New-Object System.Drawing.Drawing2D.GraphicsPath
  if ($s -lt 24) {
    $dx = [float]($s * 0.395); $dw = [float]($s * 0.21)
    $dTop = [float]($s * 0.50)
  } else {
    $dx = [float]($s * 0.425); $dw = [float]($s * 0.15)
    $dTop = [float]($s * 0.565)
  }
  $dBottom = [float]($s * 0.785)
  $doorPath.AddArc($dx, $dTop, $dw, $dw, 180, 180)
  $doorPath.AddLine([float]($dx + $dw), [float]($dTop + $dw / 2), [float]($dx + $dw), $dBottom)
  $doorPath.AddLine([float]($dx + $dw), $dBottom, $dx, $dBottom)
  $doorPath.CloseFigure()
  $g.FillPath($bg, $doorPath)

  # Round window above the door (skipped at tiny sizes)
  if ($s -ge 24) {
    $wr = [float]($s * 0.052)
    $g.FillEllipse($bg, [float]($s * 0.5 - $wr), [float]($s * 0.40 - $wr), [float](2 * $wr), [float](2 * $wr))
  }

  $g.Dispose()
  return $bmp
}

function Get-PngBytes($bmp) {
  $ms = New-Object System.IO.MemoryStream
  $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
  $bytes = $ms.ToArray(); $ms.Dispose(); return , $bytes
}

function Get-BmpEntryBytes($bmp) {
  $s = $bmp.Width
  $maskRowBytes = [int]([math]::Ceiling($s / 32.0) * 4)
  $ms = New-Object System.IO.MemoryStream
  $bw = New-Object System.IO.BinaryWriter($ms)
  $bw.Write([int32]40); $bw.Write([int32]$s); $bw.Write([int32]($s * 2))
  $bw.Write([int16]1);  $bw.Write([int16]32)
  $bw.Write([int32]0);  $bw.Write([int32]($s * $s * 4 + $maskRowBytes * $s))
  $bw.Write([int32]0);  $bw.Write([int32]0); $bw.Write([int32]0); $bw.Write([int32]0)
  $rect = New-Object System.Drawing.Rectangle(0, 0, $s, $s)
  $data = $bmp.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $stride = $data.Stride
  $buf = New-Object byte[] ($stride * $s)
  [System.Runtime.InteropServices.Marshal]::Copy($data.Scan0, $buf, 0, $buf.Length)
  $bmp.UnlockBits($data)
  for ($y = $s - 1; $y -ge 0; $y--) { $bw.Write($buf, $y * $stride, $s * 4) }
  $mask = New-Object byte[] ($maskRowBytes * $s)
  $bw.Write($mask)
  $bytes = $ms.ToArray(); $bw.Dispose(); $ms.Dispose(); return , $bytes
}

$bmpSizes = 16, 20, 24, 32, 40, 48, 64, 128
$entries = @()
foreach ($sz in $bmpSizes) {
  $bmp = New-IconBitmap $sz
  $entries += , @{ Size = $sz; Data = (Get-BmpEntryBytes $bmp); Bmp = $bmp }
}
$bmp256 = New-IconBitmap 256
$entries += , @{ Size = 256; Data = (Get-PngBytes $bmp256); Bmp = $bmp256 }

# Assemble ICO: BMP entries for classic small sizes, PNG entry for 256.
$count = $entries.Count
$offset = 6 + 16 * $count
$out = New-Object System.IO.MemoryStream
$w = New-Object System.IO.BinaryWriter($out)
$w.Write([int16]0); $w.Write([int16]1); $w.Write([int16]$count)
foreach ($e in $entries) {
  $dim = if ($e.Size -ge 256) { 0 } else { $e.Size }
  $w.Write([byte]$dim); $w.Write([byte]$dim); $w.Write([byte]0); $w.Write([byte]0)
  $w.Write([int16]1); $w.Write([int16]32)
  $w.Write([int32]$e.Data.Length); $w.Write([int32]$offset)
  $offset += $e.Data.Length
}
foreach ($e in $entries) { $w.Write($e.Data) }
[System.IO.File]::WriteAllBytes($icoPath, $out.ToArray())
$w.Dispose(); $out.Dispose()
foreach ($e in $entries) { $e.Bmp.Dispose() }

$len = (Get-Item $icoPath).Length
Write-Output "ICO written: $icoPath ($len bytes, $count entries: $(($entries | ForEach-Object { $_.Size }) -join ', '))"
