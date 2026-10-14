Add-Type -AssemblyName System.Drawing
$qaRoot = $PSScriptRoot
$qaJobs = (Get-Content -LiteralPath (Join-Path $qaRoot 'prompts.json') -Raw | ConvertFrom-Json).jobs
$qaRefs = Get-Content -LiteralPath (Join-Path $qaRoot 'references.json') -Raw | ConvertFrom-Json
$qaDir = Join-Path $qaRoot 'qa'
New-Item -ItemType Directory -Path $qaDir -Force | Out-Null
$qaFont = [System.Drawing.Font]::new('Arial',11)
for($qaGroup=0; $qaGroup -lt 4; $qaGroup++){
 $qaCanvas = [System.Drawing.Bitmap]::new(1500,1680)
 $qaG = [System.Drawing.Graphics]::FromImage($qaCanvas)
 $qaG.Clear([System.Drawing.Color]::FromArgb(251,243,228))
 for($qaRow=0; $qaRow -lt 6; $qaRow++){
  $qaIndex = $qaGroup*6+$qaRow
  if($qaIndex -ge 22){continue}
  $qaProductJobs = @($qaJobs | Where-Object productIndex -eq $qaIndex)
  $qaRef = $qaRefs | Where-Object { $_.index -eq $qaIndex -and $_.reference -eq 0 }
  $qaItems = @(@{path=$qaRef.path; label="REF $($qaIndex+1)"})
  foreach($qaJob in $qaProductJobs){
   $qaTaskPath = Join-Path $qaRoot "tasks\$($qaJob.id).json"
   $qaState = if(Test-Path -LiteralPath $qaTaskPath){Get-Content -LiteralPath $qaTaskPath -Raw | ConvertFrom-Json}else{$null}
   $qaItems += @{path=if($qaState.status -eq 'downloaded'){$qaState.path}else{$null}; label="$($qaJob.id) $($qaState.status)"}
  }
  for($qaCol=0; $qaCol -lt $qaItems.Count; $qaCol++){
   $qaItem = $qaItems[$qaCol]
   $qaX=$qaCol*250
   $qaY=$qaRow*280
   if($qaItem.path -and (Test-Path -LiteralPath $qaItem.path)){
    $qaImage=[System.Drawing.Image]::FromFile($qaItem.path)
    $qaScale=[Math]::Min(240.0/$qaImage.Width,240.0/$qaImage.Height)
    $qaG.DrawImage($qaImage,[int]($qaX+(250-$qaImage.Width*$qaScale)/2),[int]$qaY,[int]($qaImage.Width*$qaScale),[int]($qaImage.Height*$qaScale))
    $qaImage.Dispose()
   }
   $qaG.DrawString($qaItem.label,$qaFont,[System.Drawing.Brushes]::Black,[System.Drawing.RectangleF]::new($qaX+5,$qaY+242,240,38))
  }
 }
 $qaCanvas.Save((Join-Path $qaDir "sheet-$($qaGroup+1).jpg"),[System.Drawing.Imaging.ImageFormat]::Jpeg)
 $qaG.Dispose()
 $qaCanvas.Dispose()
}
$qaFont.Dispose()
Write-Output 'Four visual-review sheets updated.'

