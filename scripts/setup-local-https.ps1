param([switch]$Trust)

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
& $openssl req -x509 -newkey rsa:2048 -nodes -keyout $privateKey -out $certificate -days 365 -subj '/CN=localhost' -addext 'subjectAltName=DNS:localhost,IP:127.0.0.1'
if ($LASTEXITCODE -ne 0) { throw 'OpenSSL could not create the localhost certificate.' }

if ($Trust) {
  $publicCertificate = Join-Path $outputDirectory 'localhost.cer'
  & $openssl x509 -in $certificate -outform DER -out $publicCertificate
  if ($LASTEXITCODE -ne 0) { throw 'OpenSSL could not export the public certificate.' }
  Import-Certificate -FilePath $publicCertificate -CertStoreLocation 'Cert:\CurrentUser\Root' | Out-Null
  Write-Output 'Trusted the localhost development certificate for your Windows user account.'
}

Write-Output 'Created the certificate in .local/. Restart Vite and open https://localhost:5173/.'
