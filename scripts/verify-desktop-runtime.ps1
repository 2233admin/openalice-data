param(
    [string]$InstallDirectory = (Join-Path $env:USERPROFILE "OpenBB"),
    [string]$Environment = "openbb",
    [switch]$SkipRealData
)

$ErrorActionPreference = "Stop"

$conda = Join-Path $InstallDirectory "conda\Scripts\conda.exe"
if (-not (Test-Path -LiteralPath $conda -PathType Leaf)) {
    throw "Desktop Conda executable not found: $conda"
}

$expectedPrefix = Join-Path $InstallDirectory "conda\envs\$Environment"
$python = Join-Path $expectedPrefix "python.exe"
if (-not (Test-Path -LiteralPath $python -PathType Leaf)) {
    throw "Environment Python not found: $python"
}

$probe = @'
import importlib.metadata as metadata
import json
import os
import sys
import sysconfig

packages = ["openbb-cli", "openbb-platform-api", "openbb-mcp-server", "jupyterlab", "openbb-yfinance"]
commands = ["openbb", "openbb-api", "openbb-mcp", "jupyter"]
scripts = sysconfig.get_path("scripts")
suffix = ".exe" if os.name == "nt" else ""
print(json.dumps({
    "python": sys.executable,
    "prefix": sys.prefix,
    "packages": {name: metadata.version(name) for name in packages},
    "commands": {name: os.path.join(scripts, name + suffix) if os.path.isfile(os.path.join(scripts, name + suffix)) else None for name in commands},
}))
'@
$probeFile = Join-Path ([System.IO.Path]::GetTempPath()) "openalice-runtime-probe-$PID.py"
[System.IO.File]::WriteAllText($probeFile, $probe, [System.Text.UTF8Encoding]::new($false))

try {
    $result = & $python $probeFile
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to inspect Desktop environment '$Environment'."
    }
} finally {
    Remove-Item -LiteralPath $probeFile -Force -ErrorAction SilentlyContinue
}

$runtime = $result | ConvertFrom-Json
if (-not $runtime.prefix.StartsWith($expectedPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Environment escaped Desktop installation: expected '$expectedPrefix', got '$($runtime.prefix)'."
}

foreach ($name in @("openbb", "openbb-api", "openbb-mcp", "jupyter")) {
    $path = $runtime.commands.$name
    if (-not $path) {
        throw "Missing runtime command: $name"
    }
    if (-not $path.StartsWith($expectedPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Runtime command '$name' escaped Desktop environment: $path"
    }
}

$runtime | ConvertTo-Json -Depth 4

if (-not $SkipRealData) {
    $realDataProbe = @'
from openbb import obb

result = obb.equity.price.historical("AAPL", provider="yfinance")
assert result.results, "yfinance returned no AAPL historical rows"
row = result.results[-1]
print(f"REAL_DATA_OK provider={result.provider} date={row.date} close={row.close} volume={row.volume}")
'@
    $realDataProbeFile = Join-Path ([System.IO.Path]::GetTempPath()) "openalice-real-data-probe-$PID.py"
    [System.IO.File]::WriteAllText($realDataProbeFile, $realDataProbe, [System.Text.UTF8Encoding]::new($false))
    try {
        & $python $realDataProbeFile
    } finally {
        Remove-Item -LiteralPath $realDataProbeFile -Force -ErrorAction SilentlyContinue
    }
    if ($LASTEXITCODE -ne 0) {
        throw "Runtime is present, but the real yfinance request failed."
    }
}
