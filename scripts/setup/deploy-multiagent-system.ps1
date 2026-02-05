# 🚀 JURIFY MULTIAGENT SYSTEM - DEPLOY SCRIPT (Windows PowerShell)
#
# Script automatizado para deploy do sistema multiagentes refatorado.
# Versão: 2.0.0
# Autor: Senior Principal Software Architect
#
# Uso: .\deploy-multiagent-system.ps1

param(
    [switch]$SkipTests = $false,
    [switch]$SkipBuild = $false
)

# Configurações
$ErrorActionPreference = "Stop"

# Funções helper
function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Info {
    param([string]$Message)
    Write-Host "ℹ️  $Message" -ForegroundColor Cyan
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠️  $Message" -ForegroundColor Yellow
}

function Write-Error-Custom {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

function Write-Header {
    param([string]$Message)
    Write-Host ""
    Write-Host "=========================================" -ForegroundColor Blue
    Write-Host "  $Message" -ForegroundColor Blue
    Write-Host "=========================================" -ForegroundColor Blue
    Write-Host ""
}

function Test-Command {
    param([string]$Command)

    if (Get-Command $Command -ErrorAction SilentlyContinue) {
        Write-Success "$Command está instalado"
        return $true
    } else {
        Write-Error-Custom "$Command não está instalado. Instale antes de continuar."
        return $false
    }
}

# Início do script
Clear-Host

Write-Header "🚀 JURIFY MULTIAGENT SYSTEM - DEPLOY"

# Pré-requisitos
Write-Header "🔍 VERIFICANDO PRÉ-REQUISITOS"

$allCommandsOk = $true
$allCommandsOk = $allCommandsOk -and (Test-Command "node")
$allCommandsOk = $allCommandsOk -and (Test-Command "npm")
$allCommandsOk = $allCommandsOk -and (Test-Command "supabase")

if (-not $allCommandsOk) {
    Write-Error-Custom "Instale as ferramentas faltantes e execute novamente."
    exit 1
}

# Verificar versão do Node
$nodeVersion = (node -v).Replace('v', '').Split('.')[0]
if ([int]$nodeVersion -lt 18) {
    Write-Error-Custom "Node.js versão 18 ou superior é necessário (atual: $nodeVersion)"
    exit 1
}
Write-Success "Node.js versão $nodeVersion (OK)"

# Verificar arquivos necessários
Write-Info "Verificando arquivos necessários..."

$requiredFiles = @(
    "advo-ai-hub-main (1)\advo-ai-hub-main\supabase\functions\ai-agent-processor\index.ts",
    "advo-ai-hub-main (1)\advo-ai-hub-main\supabase\migrations\20251210000000_add_agent_ai_logs.sql",
    "advo-ai-hub-main (1)\advo-ai-hub-main\src\lib\multiagents\core\BaseAgent.ts",
    "advo-ai-hub-main (1)\advo-ai-hub-main\src\lib\multiagents\core\MultiAgentSystem.ts",
    "advo-ai-hub-main (1)\advo-ai-hub-main\src\lib\multiagents\validation\schemas.ts"
)

$allFilesExist = $true
foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        Write-Success "$file existe"
    } else {
        Write-Error-Custom "$file não encontrado!"
        $allFilesExist = $false
    }
}

if (-not $allFilesExist) {
    Write-Error-Custom "Arquivos necessários faltando. Verifique a estrutura do projeto."
    exit 1
}

# Mudar para o diretório do projeto
Write-Header "📂 NAVEGANDO PARA O PROJETO"
Set-Location "advo-ai-hub-main (1)\advo-ai-hub-main"
Write-Success "Diretório: $(Get-Location)"

# Verificar .env
Write-Header "🔐 CONFIGURAÇÃO DE AMBIENTE"

if (-not (Test-Path ".env")) {
    Write-Warning ".env não encontrado"

    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
        Write-Success ".env criado a partir do .env.example"
        Write-Warning "IMPORTANTE: Edite o arquivo .env com suas credenciais!"
        Read-Host "Pressione ENTER quando terminar de configurar o .env"
    } else {
        Write-Error-Custom ".env.example não encontrado"
        exit 1
    }
} else {
    Write-Success ".env existe"
}

# Verificar env vars
$envContent = Get-Content ".env" -Raw

if ($envContent -match "VITE_SUPABASE_URL=your" -or $envContent -match "VITE_SUPABASE_ANON_KEY=your") {
    Write-Error-Custom "Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env"
    exit 1
}

Write-Success "Variáveis de ambiente configuradas"

# Instalação de dependências
Write-Header "📦 INSTALAÇÃO DE DEPENDÊNCIAS"
Write-Info "Instalando dependências npm..."

npm install --silent

if ($LASTEXITCODE -eq 0) {
    Write-Success "Dependências instaladas"
} else {
    Write-Error-Custom "Falha na instalação de dependências"
    exit 1
}

# Testes
if (-not $SkipTests) {
    Write-Header "🧪 EXECUTANDO TESTES"

    Write-Info "Executando type-check..."
    npm run type-check

    if ($LASTEXITCODE -eq 0) {
        Write-Success "Type-check passou"
    } else {
        Write-Error-Custom "Type-check falhou"
        exit 1
    }

    Write-Info "Executando testes..."
    npm run test -- --run

    if ($LASTEXITCODE -eq 0) {
        Write-Success "Testes passaram"
    } else {
        Write-Error-Custom "Testes falharam"
        exit 1
    }

    Write-Info "Executando lint..."
    npm run lint

    if ($LASTEXITCODE -eq 0) {
        Write-Success "Lint passou"
    } else {
        Write-Warning "Lint encontrou problemas (continuando...)"
    }
} else {
    Write-Warning "Testes pulados (-SkipTests)"
}

# Migrações de banco
Write-Header "🗄️ MIGRAÇÕES DE BANCO"

$applyMigrations = Read-Host "Deseja aplicar as migrações do banco? (y/n)"

if ($applyMigrations -eq "y" -or $applyMigrations -eq "Y") {
    Write-Info "Aplicando migrações..."

    Set-Location "supabase"
    supabase db push

    if ($LASTEXITCODE -eq 0) {
        Write-Success "Migrações aplicadas com sucesso"
    } else {
        Write-Error-Custom "Falha ao aplicar migrações"
        exit 1
    }

    Set-Location ".."
} else {
    Write-Warning "Migrações puladas"
}

# Deploy Edge Function
Write-Header "⚡ DEPLOY DA EDGE FUNCTION"

$deployFunction = Read-Host "Deseja fazer deploy da Edge Function? (y/n)"

if ($deployFunction -eq "y" -or $deployFunction -eq "Y") {
    Write-Info "Fazendo deploy da ai-agent-processor..."

    supabase functions deploy ai-agent-processor

    if ($LASTEXITCODE -eq 0) {
        Write-Success "Edge Function deployed com sucesso"
    } else {
        Write-Error-Custom "Falha no deploy da Edge Function"
        exit 1
    }
} else {
    Write-Warning "Deploy da Edge Function pulado"
}

# Configuração de Secrets
Write-Header "🔑 CONFIGURAÇÃO DE SECRETS"

$configureSecrets = Read-Host "Deseja configurar os secrets da Edge Function? (y/n)"

if ($configureSecrets -eq "y" -or $configureSecrets -eq "Y") {
    Write-Info "Configurando secrets..."

    $openaiKey = Read-Host "Digite sua OPENAI_API_KEY" -MaskInput
    if ($openaiKey) {
        supabase secrets set OPENAI_API_KEY="$openaiKey"
        Write-Success "OPENAI_API_KEY configurada"
    }

    $serviceKey = Read-Host "Digite sua SUPABASE_SERVICE_ROLE_KEY" -MaskInput
    if ($serviceKey) {
        supabase secrets set SUPABASE_SERVICE_ROLE_KEY="$serviceKey"
        Write-Success "SUPABASE_SERVICE_ROLE_KEY configurada"
    }

    Write-Info "Listando secrets..."
    supabase secrets list
} else {
    Write-Warning "Configuração de secrets pulada"
}

# Build de produção
if (-not $SkipBuild) {
    Write-Header "🏗️ BUILD DE PRODUÇÃO"

    $doBuild = Read-Host "Deseja fazer o build de produção? (y/n)"

    if ($doBuild -eq "y" -or $doBuild -eq "Y") {
        Write-Info "Executando build..."

        npm run build

        if ($LASTEXITCODE -eq 0) {
            Write-Success "Build concluído com sucesso"
        } else {
            Write-Error-Custom "Falha no build"
            exit 1
        }
    } else {
        Write-Warning "Build pulado"
    }
} else {
    Write-Warning "Build pulado (-SkipBuild)"
}

# Resumo
Write-Header "📊 RESUMO DO DEPLOY"

Write-Host ""
Write-Success "Deploy concluído com sucesso!"
Write-Host ""
Write-Host "Próximos passos:"
Write-Host "1. ✅ Verificar logs: supabase functions logs ai-agent-processor"
Write-Host "2. ✅ Testar no frontend: npm run dev"
Write-Host "3. ✅ Verificar tabela agent_ai_logs no Supabase Dashboard"
Write-Host "4. ✅ Monitorar métricas no dashboard"
Write-Host ""
Write-Host "Documentação:"
Write-Host "  📄 README.md - Documentação técnica"
Write-Host "  📄 MIGRATION_GUIDE.md - Guia de migração"
Write-Host "  📄 REFACTORING_SUMMARY.md - Resumo da refatoração"
Write-Host "  📄 EXECUTIVE_SUMMARY.md - Sumário executivo"
Write-Host ""
Write-Host "🚀 Jurify MultiAgent System v2.0 está PRONTO!" -ForegroundColor Blue
Write-Host ""

# Voltar ao diretório original
Set-Location "..\..\"
