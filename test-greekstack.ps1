#requires -Version 5.1
<#
.SYNOPSIS
  Greek Stack local smoke gate - fast pre-commit / pre-handover health check.

.DESCRIPTION
  Runs, in order, and prints a clear PASS/FAIL line per gate plus a final table:
    1. prisma generate       (regenerate the Prisma client)
    2. tsc --noEmit          (full TypeScript type-check)
    3. next lint             (ESLint via next lint;  skip with -SkipLint)
    4. SMOKE tests (a HANDFUL, not the full suite), each its own gate:
         - billing gate           (entitlement lockout + server guard)
         - dues checkout/webhook  (double-charge guard + webhook secret source)
         - go-live gate           (chapter-live decision)
         - event guard            (new-event past-date rejection)
       All test gates run with --maxWorkers=2 to stay light on Windows node procs.

  Windows PowerShell 5.1 compatible: no '&&' chaining; each native command's
  result is read from $LASTEXITCODE. ASCII-only on purpose (BOM-less .ps1 files
  are read as Windows-1252 by PS 5.1, so non-ASCII would corrupt parsing).
  Exits 0 only if every run gate passed.

.PARAMETER SkipLint
  Skip the `next lint` gate.

.PARAMETER SkipTests
  Skip the smoke-test gates (only prisma generate + tsc run).

.PARAMETER Help
  Print usage and exit.

.EXAMPLE
  pwsh ./test-greekstack.ps1
.EXAMPLE
  powershell -File .\test-greekstack.ps1 -SkipLint
#>
[CmdletBinding()]
param(
  [switch]$SkipLint,
  [switch]$SkipTests,
  [switch]$Help
)

if ($Help) {
  Get-Help -Full $PSCommandPath
  exit 0
}

$ErrorActionPreference = 'Continue'
# Run from the repo root regardless of the caller's cwd.
Set-Location -Path $PSScriptRoot

$results = New-Object System.Collections.Generic.List[object]

function Record-Gate {
  param(
    [string]$Name,
    [int]$Code,
    [double]$Seconds
  )
  $status = if ($Code -eq 0) { 'PASS' } else { 'FAIL' }
  $results.Add([pscustomobject]@{
    Gate     = $Name
    Status   = $status
    ExitCode = $Code
    Seconds  = [math]::Round($Seconds, 1)
  })
  Write-Host ""
  if ($Code -eq 0) {
    Write-Host ("  [PASS] {0}  ({1}s)" -f $Name, [math]::Round($Seconds, 1)) -ForegroundColor Green
  } else {
    Write-Host ("  [FAIL] {0}  (exit {1}, {2}s)" -f $Name, $Code, [math]::Round($Seconds, 1)) -ForegroundColor Red
  }
}

function Invoke-Gate {
  param(
    [string]$Name,
    [scriptblock]$Action
  )
  Write-Host ""
  Write-Host ("=== {0} ===" -f $Name) -ForegroundColor Cyan
  $sw = [System.Diagnostics.Stopwatch]::StartNew()
  & $Action
  $code = $LASTEXITCODE
  if ($null -eq $code) { $code = 0 }  # scriptblocks with no native exe leave $LASTEXITCODE unset
  $sw.Stop()
  Record-Gate -Name $Name -Code $code -Seconds $sw.Elapsed.TotalSeconds
}

Write-Host "Greek Stack smoke gate - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor White
Write-Host ("Repo: {0}" -f $PSScriptRoot)

# --- Gate 1: prisma generate --------------------------------------------------
Invoke-Gate -Name "prisma generate" -Action { & npx prisma generate }

# --- Gate 2: tsc --noEmit -----------------------------------------------------
Invoke-Gate -Name "tsc --noEmit" -Action { & npx tsc --noEmit }

# --- Gate 3: next lint --------------------------------------------------------
if (-not $SkipLint) {
  Invoke-Gate -Name "next lint" -Action { & npx next lint }
} else {
  Write-Host ""
  Write-Host "  [SKIP] next lint (-SkipLint)" -ForegroundColor Yellow
}

# --- Gate 4: SMOKE tests (handful, per-gate) ---------------------------------
if (-not $SkipTests) {
  # Ordered so the summary reads top-to-bottom the way the gates are described.
  $suites = [ordered]@{
    "test: billing gate"          = @("tests/billing-lockout.test.ts", "tests/billing-lockout-server-guard.test.ts")
    "test: dues checkout/webhook" = @("tests/dues-double-charge-guard.test.ts", "tests/dues-webhook-secret-source.test.ts")
    "test: go-live gate"          = @("tests/chapter-live-gate.test.ts")
    "test: event guard"           = @("tests/event-past-date-guard.test.ts")
  }
  foreach ($name in $suites.Keys) {
    $files = $suites[$name]
    Invoke-Gate -Name $name -Action { & npx vitest run @files --maxWorkers=2 }
  }
} else {
  Write-Host ""
  Write-Host "  [SKIP] smoke tests (-SkipTests)" -ForegroundColor Yellow
}

# --- Summary ------------------------------------------------------------------
Write-Host ""
Write-Host "================= SMOKE SUMMARY =================" -ForegroundColor White
($results | Format-Table Gate, Status, ExitCode, Seconds -AutoSize | Out-String).TrimEnd() | Write-Host

$failed = @($results | Where-Object { $_.Status -eq 'FAIL' })
$overall = 0
Write-Host ""
if ($failed.Count -eq 0) {
  Write-Host "ALL GATES PASSED" -ForegroundColor Green
} else {
  Write-Host ("FAILED: " + (($failed | ForEach-Object { $_.Gate }) -join ', ')) -ForegroundColor Red
  $overall = 1
}

# --- How to use / run the full suite + dev server ----------------------------
Write-Host ""
Write-Host "------------------------------------------------" -ForegroundColor DarkGray
Write-Host "How to use:" -ForegroundColor White
Write-Host "  pwsh ./test-greekstack.ps1              # all gates (default)"
Write-Host "  pwsh ./test-greekstack.ps1 -SkipLint    # skip next lint"
Write-Host "  pwsh ./test-greekstack.ps1 -SkipTests   # only prisma generate + tsc"
Write-Host ""
Write-Host "Full suite (heavy - run only when no other build is competing for CPU):" -ForegroundColor White
Write-Host "  npx vitest run --maxWorkers=2           # whole tests/ suite, throttled"
Write-Host "  npm test                                # same as vitest run (all cores)"
Write-Host ""
Write-Host "Dev server:" -ForegroundColor White
Write-Host "  npm run dev                             # next dev on http://localhost:3000"
Write-Host "  (log in on a tenant subdomain, e.g. http://phi-sig.localhost:3000)"
Write-Host "------------------------------------------------" -ForegroundColor DarkGray

exit $overall
