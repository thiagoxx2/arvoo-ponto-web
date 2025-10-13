# Arvoo Ponto - Painel Administrativo

Sistema de controle de ponto eletrônico com painel web administrativo conectado ao Supabase.

## 🚀 Funcionalidades

- **Dashboard** com gráficos e estatísticas em tempo real
- **Gestão de Colaboradores** (CRUD completo)
- **Gestão de Empresas** (CRUD completo)
- **Visualização de Registros de Ponto** com fotos
- **Relatórios** com exportação CSV/XLSX
- **Configurações** do sistema e upload de logo
- **Tema escuro/claro** persistente
- **Design responsivo** para desktop, tablet e mobile

## 🛠️ Tecnologias

- **Frontend**: React + Vite + TypeScript
- **UI**: TailwindCSS + shadcn/ui
- **Backend**: Supabase (PostgreSQL + Storage + Auth)
- **Gráficos**: Recharts
- **Roteamento**: React Router DOM
- **Ícones**: Lucide React

## 📦 Instalação

1. Clone o repositório:
```bash
git clone <repository-url>
cd web-ponto
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
```bash
cp env.example .env
```

Edite o arquivo `.env` com suas credenciais do Supabase:
```
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase
```

4. Execute o projeto:
```bash
npm run dev
```

## 🗄️ Estrutura do Banco de Dados

O sistema espera as seguintes tabelas no Supabase:

### Tabela: empresas
```sql
CREATE TABLE empresas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  cnpj VARCHAR(18) UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Tabela: colaboradores
```sql
CREATE TABLE colaboradores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  pin VARCHAR(10) UNIQUE NOT NULL,
  ativo BOOLEAN DEFAULT TRUE,
  empresa_id UUID REFERENCES empresas(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Tabela: registros_ponto
```sql
CREATE TABLE registros_ponto (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  colaborador_id UUID REFERENCES colaboradores(id),
  empresa_id UUID REFERENCES empresas(id),
  data DATE NOT NULL,
  hora TIME NOT NULL,
  tipo VARCHAR(10) CHECK (tipo IN ('entrada', 'saida')),
  foto_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Storage Bucket: fotos-ponto
Configure um bucket no Supabase Storage chamado `fotos-ponto` para armazenar as fotos dos registros de ponto.

### Storage Bucket: configuracoes
Configure um bucket no Supabase Storage chamado `configuracoes` para armazenar o logo do sistema.

## 🔐 Autenticação

O sistema usa Supabase Auth para autenticação. Configure as políticas RLS (Row Level Security) conforme necessário.

## 📱 Responsividade

O painel é totalmente responsivo e funciona em:
- Desktop (1024px+)
- Tablet (768px - 1023px)
- Mobile (até 767px)

## 🎨 Temas

- **Tema Claro**: Interface limpa e moderna
- **Tema Escuro**: Interface escura para uso noturno
- **Persistência**: O tema escolhido é salvo no localStorage

## 📊 Relatórios

- **Relatório de Pontos**: Exporta registros filtrados por data, colaborador e empresa
- **Relatório de Colaboradores**: Lista todos os colaboradores com suas informações
- **Relatório de Empresas**: Lista todas as empresas cadastradas

## 🚀 Deploy

### Netlify (Recomendado)

1. Conecte seu repositório ao Netlify
2. Configure as variáveis de ambiente no Netlify
3. Deploy automático a cada push

### Vercel

1. Conecte seu repositório ao Vercel
2. Configure as variáveis de ambiente
3. Deploy automático

## 🔧 Scripts Disponíveis

- `npm run dev` - Executa o servidor de desenvolvimento
- `npm run build` - Gera a build de produção
- `npm run preview` - Visualiza a build de produção
- `npm run lint` - Executa o linter

## 📝 Licença

Este projeto está sob a licença MIT.
