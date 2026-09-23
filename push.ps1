$ErrorActionPreference = "Stop"
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $dir
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host ""
Write-Host "=== 每日计划 · 上传到 GitHub Pages ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "如果还没有仓库：打开 https://github.com/new 新建一个空仓库（不要勾 README），" -ForegroundColor Yellow
Write-Host "建好后把页面上的 HTTPS 地址复制过来。" -ForegroundColor Yellow
Write-Host ""

$url = Read-Host "仓库地址(例如 https://github.com/你的用户名/daily-plan.git)"
$url = $url.Trim()
if ($url -notmatch "\.git$") { $url = $url + ".git" }

if (-not (Test-Path ".git")) { git init -b main | Out-Null }
git add -A
git -c user.name="daily-plan" -c user.email="dp@local" commit -m "update daily plan" 2>$null
if ($LASTEXITCODE -ne 0) { Write-Host "(没有文件变化，直接推送已有内容)" -ForegroundColor DarkGray }

$cur = git remote get-url origin 2>$null
if ($cur) { git remote set-url origin $url } else { git remote add origin $url }
git branch -M main

Write-Host ""
Write-Host "正在推送，若弹出登录窗口请登录 GitHub..." -ForegroundColor Cyan
git push -u origin main

if ($LASTEXITCODE -eq 0) {
  $m = [regex]::Match($url, "github\.com[:/]([^/]+)/([^/\.]+)")
  if ($m.Success) {
    $pages = "https://" + $m.Groups[1].Value + ".github.io/" + $m.Groups[2].Value + "/"
    Write-Host ""
    Write-Host "推送成功！" -ForegroundColor Green
    Write-Host "还差最后一步：打开 https://github.com/$($m.Groups[1].Value)/$($m.Groups[2].Value)/settings/pages" -ForegroundColor Yellow
    Write-Host "Source 选 Deploy from a branch，Branch 选 main、目录 / (root)，点 Save。" -ForegroundColor Yellow
    Write-Host "约 1-2 分钟后访问：$pages" -ForegroundColor Green
    Write-Host ""
    Write-Host "手机提醒：用系统浏览器打开上面的地址再添加到主屏，别从 WorkBuddy 里打开。" -ForegroundColor Cyan
  }
} else {
  Write-Host "推送失败，检查仓库地址是否正确、是否已登录 GitHub。" -ForegroundColor Red
}
Write-Host ""
Read-Host "按回车关闭"
