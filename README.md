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

### Tabela: pontos (tabela principal)
```sql
CREATE TABLE pontos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL,
  colaborador_id UUID NOT NULL,
  tipo VARCHAR(10) CHECK (tipo IN ('entrada', 'saida')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  foto_id UUID,
  audit_hash TEXT
);
```

### Tabela: fotos
```sql
CREATE TABLE fotos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL,
  colaborador_id UUID NOT NULL,
  storage_path TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Uso da Tabela pontos
O sistema utiliza diretamente a tabela `pontos` com embeds para relacionamentos:

```sql
-- Consulta principal com embeds
SELECT 
    p.*,
    colaborador:colaboradores(*),
    empresa:empresas(*),
    foto:fotos(storage_path)
FROM public.pontos p
ORDER BY created_at DESC;
```

Os campos `data` e `hora` são derivados do `created_at` no lado do cliente.

### Índices para Performance
```sql
-- Índices para otimização de consultas
CREATE INDEX IF NOT EXISTS idx_pontos_empresa_created_at ON public.pontos(empresa_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_colaboradores_empresa ON public.colaboradores(empresa_id);
```

### Storage Bucket: fotos-ponto
Configure um bucket no Supabase Storage chamado `fotos-ponto` para armazenar as fotos dos registros de ponto.

### Storage Bucket: configuracoes
Configure um bucket no Supabase Storage chamado `configuracoes` para armazenar o logo do sistema.

## 🔐 Autenticação e Políticas RLS

O sistema usa Supabase Auth para autenticação. Configure as seguintes políticas RLS (Row Level Security):

### Políticas RLS Necessárias

```sql
-- Habilitar RLS nas tabelas
ALTER TABLE public.pontos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fotos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.colaboradores ENABLE ROW LEVEL SECURITY;

-- Políticas para pontos
CREATE POLICY "Permitir SELECT em pontos para usuários autenticados" ON public.pontos
    FOR SELECT USING (auth.role() = 'authenticated');

-- Políticas para fotos
CREATE POLICY "Permitir SELECT em fotos para usuários autenticados" ON public.fotos
    FOR SELECT USING (auth.role() = 'authenticated');

-- Políticas para empresas
CREATE POLICY "Permitir SELECT em empresas para usuários autenticados" ON public.empresas
    FOR SELECT USING (auth.role() = 'authenticated');

-- Políticas para colaboradores
CREATE POLICY "Permitir SELECT em colaboradores para usuários autenticados" ON public.colaboradores
    FOR SELECT USING (auth.role() = 'authenticated');
```

### Storage Buckets e Políticas

```sql
-- Criar buckets
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('fotos', 'fotos', false), -- Bucket privado para fotos
  ('configuracoes', 'configuracoes', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas para Storage
CREATE POLICY "Permitir visualização de fotos para usuários autenticados" ON storage.objects
  FOR SELECT USING (bucket_id = 'fotos' AND auth.role() = 'authenticated');

CREATE POLICY "Permitir upload de fotos para usuários autenticados" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'fotos' AND auth.role() = 'authenticated');
```

## 📋 Dependências do Sistema

### Variáveis de Ambiente Obrigatórias
```
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase
```

### Funcionalidades da Página Pontos

- **Realtime**: Assinatura automática a mudanças na tabela `pontos`
- **Filtros**: Por data (obrigatório) e empresa (opcional)
- **Fotos**: Suporte a URLs assinadas para buckets privados
- **Performance**: Índices otimizados para consultas rápidas
- **Tipos TypeScript**: Interface `RegistroPonto` com todos os campos necessários

### Arquivos Criados/Modificados

- `src/types/pontos.ts` - Tipos TypeScript para o sistema de pontos
- `src/lib/supabaseSignedUrl.ts` - Helpers para URLs de fotos
- `src/pages/Pontos.tsx` - Página refatorada com realtime e filtros
- `supabase-migrations.sql` - Script de migração do banco

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
