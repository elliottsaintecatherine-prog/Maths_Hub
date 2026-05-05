$dest = "c:\Users\Herve\Documents\Elliott\Projet\Maths_Hub\Vecthorreur\assets\img\brouillon"
if (-not (Test-Path $dest)) { New-Item -ItemType Directory -Path $dest }

Copy-Item "C:\Users\Herve\.gemini\antigravity\brain\c9aed17e-6fec-4cdd-beb2-c0300fffeb19\screamer_v1_1777960994634.png" "$dest\screamer_v1.png"
Copy-Item "C:\Users\Herve\.gemini\antigravity\brain\c9aed17e-6fec-4cdd-beb2-c0300fffeb19\screamer_v2_1777961007920.png" "$dest\screamer_v2.png"
Copy-Item "C:\Users\Herve\.gemini\antigravity\brain\c9aed17e-6fec-4cdd-beb2-c0300fffeb19\screamer_v3_1777961020239.png" "$dest\screamer_v3.png"
Copy-Item "C:\Users\Herve\.gemini\antigravity\brain\c9aed17e-6fec-4cdd-beb2-c0300fffeb19\screamer_v4_1777961035122.png" "$dest\screamer_v4.png"
Copy-Item "C:\Users\Herve\.gemini\antigravity\brain\c9aed17e-6fec-4cdd-beb2-c0300fffeb19\screamer_v5_1777961048387.png" "$dest\screamer_v5.png"
Copy-Item "C:\Users\Herve\.gemini\antigravity\brain\c9aed17e-6fec-4cdd-beb2-c0300fffeb19\screamer_v6_1777961062679.png" "$dest\screamer_v6.png"

Write-Host "Images sauvegardées dans $dest"
