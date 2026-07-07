# Regenerates build/icon.ico (Baillio app icon).
# Design: white rounded tile + brand mark (ascending bars, swoosh, dot),
# matching the Baillio wordmark logo and the website brand assets.
# Usage: powershell -ExecutionPolicy Bypass -File scripts/generate-icon.ps1
Add-Type -AssemblyName System.Drawing

$repo = Split-Path -Parent $PSScriptRoot
$icoPath = Join-Path $repo 'build\icon.ico'

function New-IconBitmap([int]$s) {
  $bmp = New-Object System.Drawing.Bitmap($s, $s, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

  # White rounded tile with a hairline border
  $m = [float]($s * 0.03); $w = [float]($s - 2 * $m); $r = [float]($w * 0.22); $d = 2 * $r
  $tile = New-Object System.Drawing.Drawing2D.GraphicsPath
  $tile.AddArc($m, $m, $d, $d, 180, 90); $tile.AddArc($m + $w - $d, $m, $d, $d, 270, 90)
  $tile.AddArc($m + $w - $d, $m + $w - $d, $d, $d, 0, 90); $tile.AddArc($m, $m + $w - $d, $d, $d, 90, 90)
  $tile.CloseFigure()
  $g.FillPath([System.Drawing.Brushes]::White, $tile)
  if ($s -ge 32) {
    $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(28, 24, 24, 60), [float]([math]::Max(1, $s * 0.012)))
    $g.DrawPath($pen, $tile)
  }

  # Mark geometry in 0..1 space of the mark area (centered, 72% of tile)
  $ox = [float]($s * 0.14); $oy = [float]($s * 0.14); $u = [float]($s * 0.72)
  function XY([float]$x, [float]$y) { New-Object System.Drawing.PointF(($script:ox + $x * $script:u), ($script:oy + $y * $script:u)) }
  Set-Variable -Name ox -Value $ox -Scope Script; Set-Variable -Name oy -Value $oy -Scope Script; Set-Variable -Name u -Value $u -Scope Script

  # Ascending bars with slanted tops, cyan -> indigo gradient
  $barGrad = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    (XY 0.05 0.10), (XY 0.75 0.95),
    [System.Drawing.Color]::FromArgb(255, 56, 182, 232),
    [System.Drawing.Color]::FromArgb(255, 91, 76, 230))
  $barGrad.WrapMode = [System.Drawing.Drawing2D.WrapMode]::TileFlipXY
  $bw = 0.17; $gap = 0.07; $slant = 0.06
  $bars = @(
    @{ x = 0.03; top = 0.44 },
    @{ x = 0.03 + $bw + $gap; top = 0.27 },
    @{ x = 0.03 + 2 * ($bw + $gap); top = 0.06 }
  )
  foreach ($b in $bars) {
    $pts = @(
      (XY $b.x ($b.top + $slant)),
      (XY ($b.x + $bw) $b.top),
      (XY ($b.x + $bw) 1.0),
      (XY $b.x 1.0)
    )
    $g.FillPolygon($barGrad, [System.Drawing.PointF[]]$pts)
  }

  # White cut: erase everything below the separation curve, then draw the
  # purple swoosh back on top.
  $white = New-Object System.Drawing.Drawing2D.GraphicsPath
  $white.AddBezier((XY -0.06 1.02), (XY 0.22 0.90), (XY 0.55 0.66), (XY 0.86 0.56))
  $white.AddLine((XY 0.86 0.56), (XY 1.10 0.56))
  $white.AddLine((XY 1.10 0.56), (XY 1.10 1.30))
  $white.AddLine((XY 1.10 1.30), (XY -0.06 1.30))
  $white.CloseFigure()
  $g.FillPath([System.Drawing.Brushes]::White, $white)

  $swooshGrad = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    (XY 0.0 0.95), (XY 0.86 0.58),
    [System.Drawing.Color]::FromArgb(255, 89, 55, 219),
    [System.Drawing.Color]::FromArgb(255, 124, 58, 237))
  $swooshGrad.WrapMode = [System.Drawing.Drawing2D.WrapMode]::TileFlipXY
  $sw = New-Object System.Drawing.Drawing2D.GraphicsPath
  $sw.AddBezier((XY 0.00 0.99), (XY 0.24 0.87), (XY 0.54 0.68), (XY 0.86 0.60))
  $sw.AddLine((XY 0.86 0.60), (XY 0.86 0.78))
  $sw.AddBezier((XY 0.86 0.78), (XY 0.50 0.88), (XY 0.24 0.97), (XY 0.02 1.06))
  $sw.CloseFigure()
  $g.FillPath($swooshGrad, $sw)

  # Dot (i-dot) right of the tallest bar
  $dotBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 109, 40, 217))
  $dc = XY 0.87 0.36; $dr = [float](0.09 * $u)
  $g.FillEllipse($dotBrush, ($dc.X - $dr), ($dc.Y - $dr), (2 * $dr), (2 * $dr))

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
