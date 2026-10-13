param([switch]$ForceNew)

$ErrorActionPreference = 'Stop'
$outputDirectory = Join-Path (Resolve-Path (Join-Path $PSScriptRoot '..')) '.local'
New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null

$openssl = Get-Command openssl.exe -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source -First 1
if (-not $openssl) {
  $openssl = @(
    'C:\Program Files\Git\usr\bin\openssl.exe',
    'C:\Program Files\Git\mingw64\bin\openssl.exe',
    'C:\msys64\usr\bin\openssl.exe'
  ) | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
}
if (-not $openssl) {
  throw 'OpenSSL was not found. Install Git for Windows (which includes OpenSSL) and rerun this script.'
}

$certificate = Join-Path $outputDirectory 'localhost-cert.pem'
$privateKey = Join-Path $outputDirectory 'localhost-key.pem'
if ($ForceNew -or -not ((Test-Path -LiteralPath $certificate) -and (Test-Path -LiteralPath $privateKey))) {
  & $openssl req -x509 -newkey rsa:2048 -nodes -keyout $privateKey -out $certificate -days 365 -subj '/CN=localhost' -addext 'subjectAltName=DNS:localhost,IP:127.0.0.1' -addext 'basicConstraints=critical,CA:FALSE' -addext 'keyUsage=critical,digitalSignature,keyEncipherment' -addext 'extendedKeyUsage=serverAuth'
  if ($LASTEXITCODE -ne 0) { throw 'OpenSSL could not create the localhost certificate.' }
  Write-Output 'Created a localhost development certificate in .local/.'
} else {
  Write-Output 'Using the existing localhost development certificate in .local/.'
}

Write-Output 'Run npm.cmd run dev:https to use HTTPS. The self-signed certificate may show a browser warning.'
