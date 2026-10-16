param(
    [ValidateSet('download', 'index', 'serve', 'test')][string]$Acao = 'serve',
    [string]$Endereco = '127.0.0.1'
)
$ErrorActionPreference = 'Stop'
# Atalho para o ambiente Python 3.11 preparado durante a validação neste computador.
# Em outra máquina, use o ambiente virtual convencional descrito no README.
$runtimeRoot = Join-Path $env:USERPROFILE 'Documents\Codex'
$mvpPython = Join-Path $runtimeRoot 'mvp-python311\python\python.exe'
$mvpPackages = Join-Path $runtimeRoot 'mvp-deps311'
if (!(Test-Path -LiteralPath $mvpPython) -or !(Test-Path -LiteralPath $mvpPackages)) {
    throw 'Ambiente local não encontrado. Siga a instalação padrão do README com Python 3.11.'
}
$previousPythonPath = $env:PYTHONPATH
$previousEncoding = $env:PYTHONIOENCODING
Push-Location $PSScriptRoot
try {
    $env:PYTHONPATH = $mvpPackages
    $env:PYTHONIOENCODING = 'utf-8'
    switch ($Acao) {
        'download' { & $mvpPython download_photos.py }
        'index' { & $mvpPython index_photos.py }
        'serve' { & $mvpPython -m uvicorn app.main:app --host $Endereco --port 8000 }
        'test' { & $mvpPython -m unittest discover -s tests -v }
    }
    $resultCode = $LASTEXITCODE
} finally {
    $env:PYTHONPATH = $previousPythonPath
    $env:PYTHONIOENCODING = $previousEncoding
    Pop-Location
}
exit $resultCode
