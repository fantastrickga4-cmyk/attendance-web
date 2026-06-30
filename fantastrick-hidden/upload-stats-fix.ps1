# ============================================================
#  히든페이지 통계 비콘 수정분 업로드 (1호점 + 2호점 script.js)
#  cross-origin sendBeacon Content-Type을 text/plain 으로 고친 script.js 2개를
#  gabia 의 각 폴더로 한 번에 올린다. (비밀번호 1회 입력)
# ============================================================
$ErrorActionPreference = "Continue"

$FtpHost = "fantastrickside.gabia.io"
$FtpUser = "fantastrickside"

# (로컬 파일, 원격 폴더) 쌍 — script.js 만 바뀜
$Jobs = @(
    @{ Local = "D:\test3\fantastrick-hidden\production\script.js";          Remote = "/hidden-page-first/script.js";  Name = "1호점 태초의 신부" },
    @{ Local = "D:\test3\fantastrick-hidden\hidden-page-second\script.js";  Remote = "/hidden-page-second/script.js"; Name = "2호점 사자의 서" }
)

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  히든페이지 통계 비콘 수정분 업로드" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
foreach ($j in $Jobs) {
    if (Test-Path $j.Local) {
        $kb = [math]::Round((Get-Item $j.Local).Length / 1024, 1)
        Write-Host ("  {0,-18} {1}  -> {2}  ({3} KB)" -f $j.Name, "script.js", $j.Remote, $kb)
    } else {
        Write-Host ("  [없음] {0}" -f $j.Local) -ForegroundColor Red
    }
}
Write-Host ""

# 비밀번호 (가비아 FTP). 530 에러면 가비아 콘솔 > 보안 > 차단 해제 먼저.
$securePwd = Read-Host "  FTP 비밀번호" -AsSecureString
$plainPwd  = [System.Net.NetworkCredential]::new("", $securePwd).Password
if (-not $plainPwd) { Write-Host "  비밀번호 없음 — 중단" -ForegroundColor Red; exit 1 }

$webclient = New-Object System.Net.WebClient
$webclient.Credentials = New-Object System.Net.NetworkCredential($FtpUser, $plainPwd)

$ok = 0; $fail = 0
foreach ($j in $Jobs) {
    if (-not (Test-Path $j.Local)) { $fail++; continue }
    $remote = "ftp://$FtpHost$($j.Remote)"
    try {
        $webclient.UploadFile($remote, "STOR", $j.Local) | Out-Null
        Write-Host ("  ✓ 업로드 성공: {0}" -f $j.Remote) -ForegroundColor Green
        $ok++
    } catch {
        Write-Host ("  ✗ 실패: {0}  ({1})" -f $j.Remote, $_.Exception.Message) -ForegroundColor Red
        $fail++
    }
}
Write-Host ""
Write-Host ("  완료 — 성공 $ok / 실패 $fail") -ForegroundColor Cyan
Write-Host "  업로드 후: 모바일에서 ?v=stat 붙여 캐시 무시하고 한 번 들어가보면 통계에 잡힙니다." -ForegroundColor DarkGray
