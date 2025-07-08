@echo off
setlocal

echo ========================================
echo INICIANDO DIGITAL DETECTIVE...
echo ========================================

:: Caminhos
set PROJECT_DIR=C:\laragon\www\DigitalDetective
set VENV_DIR=%PROJECT_DIR%\venv
set PYTHON_FILE=%PROJECT_DIR%\main.py
set REQUIREMENTS=%PROJECT_DIR%\requirements.txt

:: Navegador (usar o padrão do sistema)
set URL= %BROWSER% file:///C:/laragon/www/DigitalDetective/digitaldetective-api/Index.html

:: 1. Criar ambiente virtual se necessário
if not exist "%VENV_DIR%" (
    echo [1/5] Criando ambiente virtual...
    python -m venv "%VENV_DIR%"
)

:: 2. Ativar ambiente virtual
echo [2/5] Ativando ambiente virtual...
call "%VENV_DIR%\Scripts\activate.bat"

:: 3. Instalar dependências
echo [3/5] Instalando dependências...
pip install -r "%REQUIREMENTS%"

:: 4. Executar o servidor Flask (em segundo plano)
echo [4/5] Iniciando servidor Python...
start "" python "%PYTHON_FILE%"

:: 5. Aguardar e abrir o navegador no site
echo [5/5] Abrindo site no navegador...
timeout /t 2 > nul
start "" %URL%

echo ----------------------------------------
echo Tudo pronto! Pressione qualquer tecla...
pause >nul
echo ========================================
endlocal