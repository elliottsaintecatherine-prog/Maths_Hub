$srcPath = "..\Maths_Hub\vecthorreur_gemini\vecthorreur.js"
$content = Get-Content $srcPath

$sections = @()
$currentSectionNum = 0
$currentLines = @()

foreach ($line in $content) {
    if ($line -match "^\/\/\s*SECTION\s+(\d+)") {
        $sectionNum = [int]$matches[1]
        
        # Check if previous line is decorative (====)
        $decorativeLine = $null
        if ($currentLines.Count -gt 0 -and $currentLines[-1] -match "^\/\/\s*[═=]{10,}") {
            $decorativeLine = $currentLines[-1]
            $currentLines = $currentLines[0..($currentLines.Count - 2)]
        }
        
        $sections += [PSCustomObject]@{ Num = $currentSectionNum; Lines = $currentLines }
        
        $currentSectionNum = $sectionNum
        $currentLines = @()
        if ($decorativeLine) {
            $currentLines += $decorativeLine
        }
        $currentLines += $line
    } else {
        $currentLines += $line
    }
}
$sections += [PSCustomObject]@{ Num = $currentSectionNum; Lines = $currentLines }

# Helper to write to file
function Write-Section ($filename, $sectionNums) {
    $outLines = @("// $filename - Extrait de vecthorreur.js", "")
    foreach ($num in $sectionNums) {
        $sec = $sections | Where-Object { $_.Num -eq $num }
        if ($sec) {
            $outLines += $sec.Lines
        } else {
            Write-Host "Warning: Section $num not found!"
        }
    }
    $outPath = "..\Maths_Hub\vecthorreur_gemini\$filename"
    $outLines | Set-Content $outPath
}

Write-Section "v-audio.js" @(1)
Write-Section "v-data.js" @(0, 2, 3) # Include section 0 for the top comments
Write-Section "v-state.js" @(4)
Write-Section "v-engine.js" @(5, 6, 10, 11, 12, 18, 19, 20, 22, 23, 24, 25)
Write-Section "v-ui.js" @(7, 8, 9, 13, 14, 15, 16, 17, 21, 26)

Rename-Item $srcPath "vecthorreur.js.bak"
Write-Host "Done splitting."
