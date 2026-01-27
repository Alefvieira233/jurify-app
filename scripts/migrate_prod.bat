@echo off
echo ==========================================
echo 🚀 JURIFY - MIGRACAO PARA PRODUCAO
echo ==========================================
echo.
echo Este script vai conectar ao seu projeto Supabase (yfxgncbopvnsltjqetxw)
echo e criar todas as tabelas necessarias.
echo.
echo 1. Verificando login...
call npx supabase login
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Falha no login. Tente rodar 'npx supabase login' manualmente primeiro.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo 2. Linkando projeto...
call npx supabase link --project-ref yfxgncbopvnsltjqetxw
if %ERRORLEVEL% NEQ 0 (
    echo ⚠️ Aviso: Se pedir a senha do banco, digite-a. Se falhar, verifique se o Docker esta rodando (opcional, mas recomendado).
)

echo.
echo 3. Aplicando migracoes (Criando tabelas)...
call npx supabase db push
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Erro ao aplicar migracoes. Verifique o console.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo ==========================================
echo ✅ SUCESSO! Banco de dados de producao pronto.
echo Agora voce pode acessar http://localhost:8080 e criar sua conta.
echo ==========================================
pause
