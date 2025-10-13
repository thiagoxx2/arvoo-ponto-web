-- Script para configurar o banco de dados no Supabase
-- Execute este script no SQL Editor do Supabase

-- 1. Criar tabela de empresas
CREATE TABLE IF NOT EXISTS empresas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  cnpj VARCHAR(18) UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Criar tabela de colaboradores
CREATE TABLE IF NOT EXISTS colaboradores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  pin VARCHAR(10) UNIQUE NOT NULL,
  ativo BOOLEAN DEFAULT TRUE,
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Criar tabela de registros de ponto
CREATE TABLE IF NOT EXISTS registros_ponto (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  colaborador_id UUID REFERENCES colaboradores(id) ON DELETE CASCADE,
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  hora TIME NOT NULL,
  tipo VARCHAR(10) CHECK (tipo IN ('entrada', 'saida')),
  foto_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_colaboradores_empresa_id ON colaboradores(empresa_id);
CREATE INDEX IF NOT EXISTS idx_registros_colaborador_id ON registros_ponto(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_registros_empresa_id ON registros_ponto(empresa_id);
CREATE INDEX IF NOT EXISTS idx_registros_data ON registros_ponto(data);

-- 5. Configurar RLS (Row Level Security)
ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE colaboradores ENABLE ROW LEVEL SECURITY;
ALTER TABLE registros_ponto ENABLE ROW LEVEL SECURITY;

-- 6. Políticas RLS (permitir tudo para usuários autenticados)
CREATE POLICY "Permitir tudo para usuários autenticados" ON empresas
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Permitir tudo para usuários autenticados" ON colaboradores
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Permitir tudo para usuários autenticados" ON registros_ponto
  FOR ALL USING (auth.role() = 'authenticated');

-- 7. Criar buckets no Storage
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('fotos-ponto', 'fotos-ponto', true),
  ('configuracoes', 'configuracoes', true)
ON CONFLICT (id) DO NOTHING;

-- 8. Políticas para Storage
CREATE POLICY "Permitir upload de fotos para usuários autenticados" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'fotos-ponto' AND auth.role() = 'authenticated');

CREATE POLICY "Permitir visualização de fotos para usuários autenticados" ON storage.objects
  FOR SELECT USING (bucket_id = 'fotos-ponto' AND auth.role() = 'authenticated');

CREATE POLICY "Permitir upload de configurações para usuários autenticados" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'configuracoes' AND auth.role() = 'authenticated');

CREATE POLICY "Permitir visualização de configurações para usuários autenticados" ON storage.objects
  FOR SELECT USING (bucket_id = 'configuracoes' AND auth.role() = 'authenticated');

-- 9. Inserir dados de exemplo (opcional)
INSERT INTO empresas (nome, cnpj) VALUES 
  ('Empresa Demo', '12345678000100'),
  ('Tech Solutions', '98765432000100')
ON CONFLICT (cnpj) DO NOTHING;

INSERT INTO colaboradores (nome, pin, empresa_id) VALUES 
  ('João Silva', '1234', (SELECT id FROM empresas WHERE cnpj = '12345678000100')),
  ('Maria Santos', '5678', (SELECT id FROM empresas WHERE cnpj = '12345678000100')),
  ('Pedro Costa', '9012', (SELECT id FROM empresas WHERE cnpj = '98765432000100'))
ON CONFLICT (pin) DO NOTHING;
