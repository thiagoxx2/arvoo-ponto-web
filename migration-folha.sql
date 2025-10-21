-- Migration para Folha de Ponto - Arvoo Ponto
-- ÚNICA alteração permitida no schema:

-- Adicionar coluna timestamp_local gerada automaticamente
alter table public.pontos
  add column if not exists timestamp_local timestamp
  generated always as (created_at at time zone 'America/Sao_Paulo') stored;

-- Índice útil para consultas por dia local
create index if not exists idx_pontos_colab_dia_local
  on public.pontos (colaborador_id, date(timestamp_local));

-- Função para calcular ponto diário
create or replace function public.calc_ponto_diario(
  p_colaborador_id uuid,
  p_dia date,
  p_intervalo_almoco_min int default 60
)
returns table (
  dia date,
  minutos_brutos int,
  minutos_desconto_almoco int,
  minutos_liquidos int,
  almoco_aplicado boolean,
  status_dia text,
  pares jsonb
)
language sql
stable
as $$
with day_pts as (
  select *
  from public.pontos
  where colaborador_id = p_colaborador_id
    and date(timestamp_local) = p_dia
),
entradas as (
  select row_number() over (order by created_at) rn, created_at as in_at
  from day_pts
  where tipo = 'entrada'
),
saidas as (
  select row_number() over (order by created_at) rn, created_at as out_at
  from day_pts
  where tipo = 'saida'
),
pairs as (
  select e.rn, e.in_at, s.out_at
  from entradas e
  join saidas s on s.rn = e.rn
  where s.out_at > e.in_at
),
sum_brutos as (
  select coalesce(sum(extract(epoch from (out_at - in_at)) / 60)::int, 0) as minutos_brutos
  from pairs
),
flags as (
  select
    (select count(*) from day_pts) as qtd_registros,
    (select count(*) from pairs)   as qtd_pares
)
select
  p_dia                                      as dia,
  sb.minutos_brutos                          as minutos_brutos,
  case when sb.minutos_brutos > 0 then p_intervalo_almoco_min else 0 end
                                             as minutos_desconto_almoco,
  greatest(0, sb.minutos_brutos - case when sb.minutos_brutos > 0 then p_intervalo_almoco_min else 0 end)
                                             as minutos_liquidos,
  (sb.minutos_brutos > 0)                    as almoco_aplicado,
  case
    when flags.qtd_registros = 0 then 'SEM_REGISTRO'
    when flags.qtd_pares = 0     then 'PAR_INCOMPLETO'
    when sb.minutos_brutos > 0   then 'OK'
    else 'PAR_INCOMPLETO'
  end                                        as status_dia,
  coalesce(
    (select jsonb_agg(jsonb_build_object(
      'entrada', in_at,
      'saida',   out_at,
      'minutos', (extract(epoch from (out_at - in_at)) / 60)::int
    ) order by rn) from pairs),
    '[]'::jsonb
  )                                          as pares
from sum_brutos sb, flags;
$$;

-- Função para calcular ponto mensal
create or replace function public.calc_ponto_mensal(
  p_colaborador_id uuid,
  p_ano int,
  p_mes int,
  p_intervalo_almoco_min int default 60
)
returns table (
  dia date,
  minutos_liquidos int,
  status_dia text
)
language sql
stable
as $$
with bounds as (
  select make_date(p_ano, p_mes, 1) as d1,
         (make_date(p_ano, p_mes, 1) + interval '1 month - 1 day')::date as d2
),
dias as (
  select gs::date as dia
  from bounds b,
       generate_series(b.d1, b.d2, interval '1 day') gs
),
calc as (
  select d.dia, c.minutos_liquidos, c.status_dia
  from dias d
  left join lateral public.calc_ponto_diario(p_colaborador_id, d.dia, p_intervalo_almoco_min) c
    on true
)
select * from calc order by dia;
$$;
