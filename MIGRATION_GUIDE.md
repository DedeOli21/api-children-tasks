# 🚀 Guia de Migração: SQLite → PostgreSQL no Render

Este guia te ajudará a configurar o PostgreSQL no Render e migrar seus dados do SQLite local para o PostgreSQL.

## 📋 Pré-requisitos

- Backend já hospedado no Render
- Acesso ao dashboard do Render
- Arquivo `database.sqlite` local com seus dados

## 🔧 Passo 1: Criar Banco de Dados PostgreSQL no Render

1. Acesse o [Dashboard do Render](https://dashboard.render.com/)
2. Clique em **"New +"** → **"PostgreSQL"**
3. Configure o banco:
   - **Name**: `children-task-db` (ou o nome que preferir)
   - **Database**: `children_task` (ou o nome que preferir)
   - **User**: Será gerado automaticamente
   - **Region**: Escolha a mesma região do seu backend
   - **PostgreSQL Version**: Use a versão mais recente
   - **Plan**: Escolha o plano gratuito (Free) ou pago conforme necessário
4. Clique em **"Create Database"**
5. Aguarde alguns minutos até o banco ser criado

## 🔑 Passo 2: Obter a URL de Conexão

1. No dashboard do Render, clique no banco de dados criado
2. Na seção **"Connections"**, você verá a **"Internal Database URL"** e **"External Database URL"**
3. **Para migração local**: Use a **"External Database URL"**
4. **Para o backend no Render**: Use a **"Internal Database URL"**

## ⚙️ Passo 3: Configurar Variáveis de Ambiente no Render

1. No dashboard do Render, vá para o serviço do seu **backend**
2. Clique em **"Environment"**
3. Adicione/atualize as seguintes variáveis:

```env
DATABASE_TYPE=postgres
DATABASE_URL=<Internal Database URL do passo anterior>
NODE_ENV=production
JWT_SECRET=<seu-jwt-secret-gerado>
ALLOWED_ORIGINS=https://seu-frontend.vercel.app
```

**Importante**: 
- Use a **Internal Database URL** para o `DATABASE_URL` no Render
- O `JWT_SECRET` deve ser o mesmo que você usou antes (ou gere um novo)
- O `ALLOWED_ORIGINS` deve ser a URL do seu frontend

## 📦 Passo 4: Preparar o Ambiente Local para Migração

1. No terminal, navegue até a pasta `api/`:
```bash
cd api
```

2. Crie um arquivo `.env` (se ainda não existir) na pasta `api/`:
```bash
touch .env
```

3. Adicione as seguintes variáveis ao `.env`:
```env
# SQLite local (origem)
DATABASE_PATH=database.sqlite

# PostgreSQL do Render (destino)
DATABASE_URL=<External Database URL do passo 2>
DATABASE_TYPE=postgres
NODE_ENV=production
```

**Importante**: Use a **External Database URL** para a migração local.

## 🚀 Passo 5: Executar a Migração

1. Certifique-se de que todas as dependências estão instaladas:
```bash
npm install
```

2. Execute o script de migração:
```bash
npm run migrate:postgres
```

3. O script irá:
   - ✅ Conectar ao SQLite local
   - ✅ Conectar ao PostgreSQL do Render
   - ✅ Criar todas as tabelas no PostgreSQL
   - ✅ Migrar todos os dados preservando relacionamentos
   - ✅ Mostrar um resumo da migração

4. Aguarde a conclusão. Você verá uma mensagem como:
```
✨ MIGRAÇÃO CONCLUÍDA COM SUCESSO! ✨
```

## ✅ Passo 6: Verificar a Migração

1. No dashboard do Render, vá para o banco de dados PostgreSQL
2. Clique em **"Connect"** → **"psql"** (ou use uma ferramenta como pgAdmin)
3. Execute algumas queries para verificar:
```sql
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM tasks;
SELECT COUNT(*) FROM daily_logs;
-- etc.
```

## 🔄 Passo 7: Reiniciar o Backend no Render

1. No dashboard do Render, vá para o serviço do backend
2. Clique em **"Manual Deploy"** → **"Deploy latest commit"**
3. Ou simplesmente faça um novo commit e push (se tiver auto-deploy configurado)

## 🧪 Passo 8: Testar a Aplicação

1. Teste os endpoints da API para garantir que tudo está funcionando
2. Verifique se os dados estão sendo salvos e recuperados corretamente
3. Teste login, criação de tarefas, etc.

## ⚠️ Troubleshooting

### Erro: "DATABASE_URL não está configurado"
- Verifique se o arquivo `.env` existe e tem a variável `DATABASE_URL`
- Certifique-se de usar a **External Database URL** para migração local

### Erro: "Connection refused" ou "timeout"
- Verifique se a **External Database URL** está correta
- No Render, certifique-se de que o banco permite conexões externas
- Verifique se há firewall bloqueando a conexão

### Erro: "relation already exists"
- O script verifica se os dados já existem antes de inserir
- Se quiser fazer uma migração limpa, você pode dropar as tabelas no PostgreSQL primeiro

### Dados não aparecem após migração
- Verifique se a migração foi concluída com sucesso
- Confira os logs do script de migração
- Verifique se o backend está usando a **Internal Database URL** correta

## 📝 Notas Importantes

- ⚠️ **Backup**: Sempre faça backup do seu `database.sqlite` antes de migrar
- 🔒 **Segurança**: Nunca commite o arquivo `.env` com as credenciais
- 🔄 **Sincronização**: O script usa `synchronize: true` apenas durante a migração para criar as tabelas
- 📊 **Dados**: O script preserva todos os IDs, relacionamentos e timestamps originais

## 🎉 Pronto!

Agora seu banco de dados está no PostgreSQL do Render e seu backend está configurado para usá-lo!

