-- Dados de teste para validação da Folha de Ponto
-- Execute este script no Supabase SQL Editor após rodar a migration

-- Assumindo que existe pelo menos um colaborador com ID específico
-- Substitua 'COLABORADOR_ID_AQUI' pelo ID real de um colaborador

-- Dia A: entrada 08:00, saida 12:00, entrada 13:00, saida 17:00 → bruto 8h (480) − 60 = 420 min (7h)
INSERT INTO public.pontos (colaborador_id, tipo, created_at) VALUES 
('COLABORADOR_ID_AQUI', 'entrada', '2024-01-15 08:00:00-03:00'),
('COLABORADOR_ID_AQUI', 'saida', '2024-01-15 12:00:00-03:00'),
('COLABORADOR_ID_AQUI', 'entrada', '2024-01-15 13:00:00-03:00'),
('COLABORADOR_ID_AQUI', 'saida', '2024-01-15 17:00:00-03:00');

-- Dia B: entrada 09:00, (sem saída) → PAR_INCOMPLETO, 0 min
INSERT INTO public.pontos (colaborador_id, tipo, created_at) VALUES 
('COLABORADOR_ID_AQUI', 'entrada', '2024-01-16 09:00:00-03:00');

-- Dia C: dois pares válidos curtos que somem < 60 min → 0 min após desconto (não negativar)
INSERT INTO public.pontos (colaborador_id, tipo, created_at) VALUES 
('COLABORADOR_ID_AQUI', 'entrada', '2024-01-17 10:00:00-03:00'),
('COLABORADOR_ID_AQUI', 'saida', '2024-01-17 10:15:00-03:00'),
('COLABORADOR_ID_AQUI', 'entrada', '2024-01-17 10:30:00-03:00'),
('COLABORADOR_ID_AQUI', 'saida', '2024-01-17 10:45:00-03:00');

-- Dia D: nenhum registro → SEM_REGISTRO
-- (não inserir nada para o dia 18)

-- Teste adicional: Dia com múltiplos pares válidos
INSERT INTO public.pontos (colaborador_id, tipo, created_at) VALUES 
('COLABORADOR_ID_AQUI', 'entrada', '2024-01-19 08:30:00-03:00'),
('COLABORADOR_ID_AQUI', 'saida', '2024-01-19 12:00:00-03:00'),
('COLABORADOR_ID_AQUI', 'entrada', '2024-01-19 13:00:00-03:00'),
('COLABORADOR_ID_AQUI', 'saida', '2024-01-19 17:30:00-03:00');

-- Teste com registros fora de ordem (deve funcionar corretamente)
INSERT INTO public.pontos (colaborador_id, tipo, created_at) VALUES 
('COLABORADOR_ID_AQUI', 'saida', '2024-01-20 17:00:00-03:00'),
('COLABORADOR_ID_AQUI', 'entrada', '2024-01-20 13:00:00-03:00'),
('COLABORADOR_ID_AQUI', 'saida', '2024-01-20 12:00:00-03:00'),
('COLABORADOR_ID_AQUI', 'entrada', '2024-01-20 08:00:00-03:00');

-- Verificar se as funções estão funcionando
-- Teste calc_ponto_diario
SELECT * FROM public.calc_ponto_diario('COLABORADOR_ID_AQUI', '2024-01-15', 60);

-- Teste calc_ponto_mensal
SELECT * FROM public.calc_ponto_mensal('COLABORADOR_ID_AQUI', 2024, 1, 60);

-- Verificar se timestamp_local está sendo gerado corretamente
SELECT 
  id,
  colaborador_id,
  tipo,
  created_at,
  timestamp_local,
  date(timestamp_local) as dia_local
FROM public.pontos 
WHERE colaborador_id = 'COLABORADOR_ID_AQUI'
ORDER BY created_at;
