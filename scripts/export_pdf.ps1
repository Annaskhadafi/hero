$ppt = New-Object -ComObject PowerPoint.Application
$p = $ppt.Presentations.Open("D:\Raya\hero\Monthly\MONTHLY NOVEMBER 2026 SDS.pptx", 0, 0, 0)
$p.SaveAs("D:\Raya\hero\Monthly\MONTHLY NOVEMBER 2026 SDS.pdf", 32)
$p.SaveAs("C:\Users\IRIS\.gemini\antigravity\brain\e60eb4c4-f1c2-455f-83f3-714bbcc811df\MONTHLY_NOVEMBER_2026_SDS.pdf", 32)
$p.Close()
$ppt.Quit()
Write-Host "PDF EXPORT SUCCESS"
