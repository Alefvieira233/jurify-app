## 2026-04-25 - Redação de PII em Logs de IA
**Vulnerability:** Dados sensíveis (CPF, CNPJ, Email, Telefone, OAB, Processo CNJ) estavam sendo armazenados em texto puro na tabela `agent_ai_logs` e `assistant_audit`, criando um risco de vazamento de dados via logs internos.
**Learning:** Mesmo quando a aplicação sanitiza inputs para evitar injection, os dados legítimos processados pela IA podem conter PII que não deve ser persistido em logs de depuração ou auditoria se não houver uma necessidade de negócio estrita e controles de acesso rigorosos.
**Prevention:** Aplicar uma camada de redação (`redactPII`) a todos os campos de log que armazenam conteúdo de prompts ou resultados de IA, utilizando padrões de regex abrangentes e sincronizados entre frontend e backend.
