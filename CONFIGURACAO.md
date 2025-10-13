# 🔧 Configuração do Supabase Auth

## 📋 Passos para Configurar

### 1. **Criar Projeto no Supabase**
1. Acesse [supabase.com](https://supabase.com)
2. Faça login e clique em "New Project"
3. Escolha sua organização
4. Digite o nome: `arvoo-ponto`
5. Escolha uma senha forte para o banco
6. Escolha a região mais próxima
7. Clique em "Create new project"

### 2. **Configurar Variáveis de Ambiente**
1. Copie o arquivo de exemplo:
```bash
cp env.example .env
```

2. Edite o arquivo `.env` com suas credenciais:
```bash
# Encontre essas informações em Settings > API no Supabase
VITE_SUPABASE_URL=https://seu-projeto-id.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anonima-aqui
```

### 3. **Configurar Banco de Dados**
1. No painel do Supabase, vá em **SQL Editor**
2. Copie e execute o conteúdo do arquivo `supabase-setup.sql`
3. Isso criará todas as tabelas, índices e políticas necessárias

### 4. **Configurar Storage**
1. Vá em **Storage** no painel do Supabase
2. Os buckets `fotos-ponto` e `configuracoes` serão criados automaticamente
3. Se não aparecerem, crie manualmente:
   - Bucket: `fotos-ponto` (público)
   - Bucket: `configuracoes` (público)

### 5. **Configurar Autenticação**
1. Vá em **Authentication > Settings**
2. Configure as opções de autenticação:
   - **Enable email confirmations**: Desabilitado (para desenvolvimento)
   - **Enable phone confirmations**: Desabilitado
   - **Enable email change**: Habilitado
   - **Enable phone change**: Habilitado

### 6. **Criar Usuário Admin**
1. Vá em **Authentication > Users**
2. Clique em "Add user"
3. Digite um email e senha
4. Clique em "Create user"

### 7. **Testar a Aplicação**
1. Execute o projeto:
```bash
npm run dev
```

2. Acesse `http://localhost:5173`
3. Faça login com o usuário criado
4. Teste todas as funcionalidades

## 🔐 Configurações de Segurança

### RLS (Row Level Security)
- Todas as tabelas têm RLS habilitado
- Apenas usuários autenticados podem acessar os dados
- Políticas permitem CRUD completo para usuários autenticados

### Storage
- Buckets configurados para upload de fotos
- Políticas de segurança para usuários autenticados
- URLs públicas para visualização de imagens

## 🚨 Troubleshooting

### Erro: "Invalid supabaseUrl"
- Verifique se as variáveis de ambiente estão corretas
- Certifique-se de que o arquivo `.env` está na raiz do projeto

### Erro: "Failed to fetch"
- Verifique se o projeto Supabase está ativo
- Confirme se as credenciais estão corretas

### Erro: "Missing Supabase environment variables"
- Certifique-se de que o arquivo `.env` existe
- Verifique se as variáveis estão com os nomes corretos

## 📞 Suporte

Se encontrar problemas:
1. Verifique o console do navegador para erros
2. Confirme se todas as tabelas foram criadas
3. Teste a conexão no painel do Supabase
4. Verifique se o usuário foi criado corretamente
