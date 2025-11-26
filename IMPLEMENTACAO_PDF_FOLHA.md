# 📄 Implementação do PDF da Folha de Ponto

## 📋 Resumo

Implementação completa do componente PDF para geração da Folha de Ponto Mensal na rota `/folha`, utilizando `@react-pdf/renderer` para renderizar um documento PDF profissional com todos os dados do colaborador.

---

## 📦 Dependências Instaladas

### Nova Dependência
- **`@react-pdf/renderer`** (v4.3.1)
  - Biblioteca para renderização de PDFs em React
  - Instalada via: `npm install @react-pdf/renderer`

---

## 📁 Arquivos Criados

### 1. `src/components/folha/FolhaPontoPdfDocument.tsx`
**Componente principal do PDF**

**Conteúdo:**
- ✅ Tipo TypeScript `FolhaPontoPdfData` exportado (contrato de dados da RPC)
- ✅ Componente `FolhaPontoPdfDocument` que renderiza o PDF completo
- ✅ Helpers de formatação:
  - `fmtDateBR()`: Converte data ISO (YYYY-MM-DD) para formato brasileiro (dd/mm/yyyy)
  - `fmtBatidas()`: Formata array de batidas para string separada por " / "
  - `getDataAtual()`: Retorna data atual formatada para o rodapé

**Estrutura do PDF:**
1. **Cabeçalho**
   - Nome da empresa
   - CNPJ da empresa
   - Título: "FOLHA DE PONTO MENSAL"
   - Descrição do período

2. **Dados do Colaborador**
   - Nome (sempre exibido)
   - Cargo (se disponível)
   - Regime de Contratação (se disponível)
   - Jornada Contratual (se disponível)

3. **Tabela Diária**
   - Colunas: Dia | Data | Entradas/Saídas | Total | Extras | Atrasos | Faltas | Banco
   - Formatação zebra (linhas alternadas)
   - Quebra de página automática
   - Exibe "-" quando não há batidas
   - Mostra observações entre parênteses quando existirem

4. **Resumo Mensal**
   - Total Trabalhado
   - Extras
   - Atrasos
   - Faltas
   - Banco de Horas Final

5. **Declaração de Ciência**
   - Texto padrão conforme especificação

6. **Assinaturas**
   - Linha para assinatura do colaborador
   - Linha para assinatura do responsável/gestor

7. **Rodapé**
   - "Documento gerado pelo Arvoo Ponto em dd/mm/yyyy"

**Tamanho da página:** A4
**Estilos:** StyleSheet do @react-pdf/renderer

---

### 2. `src/components/folha/PreviewFolhaPdf.tsx`
**Componente de preview opcional**

**Conteúdo:**
- ✅ Componente wrapper que usa `PDFViewer` do @react-pdf/renderer
- ✅ Permite visualizar o PDF diretamente no navegador
- ✅ Altura fixa de 80vh para melhor visualização

**Uso:**
```tsx
<PreviewFolhaPdf folhaData={dadosFolha} />
```

---

## 🔧 Arquivos Alterados

### `package.json`
- ✅ Adicionada dependência `@react-pdf/renderer: ^4.3.1`

---

## 📊 Estrutura de Dados

### Tipo `FolhaPontoPdfData`

```typescript
export type FolhaPontoPdfData = {
  empresa: {
    nome: string;
    cnpj: string;
  };
  colaborador: {
    nome: string;
    cargo: string | null;
    regime_contratacao: string | null;
    jornada_contratual: string | null;
  };
  periodo: {
    mes: string;        // "2025-11"
    descricao: string;  // pode vir em inglês pelo locale do DB
  };
  diario: Array<{
    data: string;               // "2025-11-01"
    dia: number;                // 1..31
    batidas: string[];          // ["08:00","12:00",...]
    total_trabalhado: string;   // "07:53"
    horas_extras: string;       // "00:00"
    atrasos: string;            // "00:00"
    faltas: string;             // "00:00"
    banco_horas_dia: string;    // "00:00"
    observacao?: string | null; // "SEM_REGISTRO", "PAR_INCOMPLETO"
  }>;
  mensal: {
    total_horas_trabalhadas: string;
    total_horas_extras: string;
    total_atrasos: string;
    total_faltas: string;
    banco_horas_final: string;
  };
};
```

**Nota:** Este tipo corresponde exatamente ao retorno da RPC `get_folha_ponto_pdf` do Supabase.

---

## 🎯 Como Funciona

### 1. **Componente Principal**
O `FolhaPontoPdfDocument` recebe os dados no formato `FolhaPontoPdfData` e renderiza um documento PDF completo usando os componentes do `@react-pdf/renderer`:
- `Document`: Container principal
- `Page`: Página A4
- `View`: Containers de layout
- `Text`: Textos formatados
- `StyleSheet`: Estilos CSS-like

### 2. **Formatação Automática**
- Datas convertidas de ISO para formato brasileiro
- Batidas formatadas com separador " / "
- Valores vazios exibidos como "-"
- Observações exibidas entre parênteses

### 3. **Layout Responsivo**
- Quebra de página automática quando o conteúdo excede o tamanho da página
- Tabela com formatação zebra para melhor legibilidade
- Espaçamento adequado entre seções

### 4. **Preview Opcional**
O componente `PreviewFolhaPdf` permite visualizar o PDF diretamente no navegador antes de fazer download.

---

## 🚀 Como Usar

### Opção 1: Preview no Navegador
```tsx
import { PreviewFolhaPdf } from '../components/folha/PreviewFolhaPdf';
import type { FolhaPontoPdfData } from '../components/folha/FolhaPontoPdfDocument';

// Em um componente React
const [dadosFolha, setDadosFolha] = useState<FolhaPontoPdfData | null>(null);

// Renderizar preview
{dadosFolha && (
  <PreviewFolhaPdf folhaData={dadosFolha} />
)}
```

### Opção 2: Download Direto (futuro)
```tsx
import { pdf } from '@react-pdf/renderer';
import FolhaPontoPdfDocument from '../components/folha/FolhaPontoPdfDocument';

const handleDownload = async () => {
  const blob = await pdf(<FolhaPontoPdfDocument folha={dadosFolha} />).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'folha-ponto.pdf';
  link.click();
};
```

### Opção 3: Integração com RPC do Supabase
```tsx
// Chamar a RPC get_folha_ponto_pdf
const { data, error } = await supabase.rpc('get_folha_ponto_pdf', {
  p_colaborador_id: colaboradorId,
  p_ano: ano,
  p_mes: mes
});

if (data) {
  setDadosFolha(data);
  setShowPdfPreview(true);
}
```

---

## ✅ Funcionalidades Implementadas

- [x] Cabeçalho com dados da empresa
- [x] Informações do colaborador
- [x] Tabela diária completa com todas as colunas
- [x] Formatação zebra na tabela
- [x] Quebra de página automática
- [x] Tratamento de batidas vazias
- [x] Exibição de observações
- [x] Resumo mensal
- [x] Declaração de ciência
- [x] Linhas de assinatura
- [x] Rodapé com data de geração
- [x] Componente de preview opcional
- [x] Tipo TypeScript exportado
- [x] Helpers de formatação

---

## 🔄 Próximos Passos (Não Implementados)

- [ ] Botão "Gerar PDF" na página `/folha`
- [ ] Integração com RPC `get_folha_ponto_pdf` do Supabase
- [ ] Função de download do PDF
- [ ] Tratamento de erros na geração
- [ ] Loading state durante geração

---

## 📝 Notas Técnicas

1. **Compilação:** ✅ Projeto compila sem erros
2. **Linter:** ✅ Sem erros de lint
3. **TypeScript:** ✅ Tipagem completa
4. **Dependências:** ✅ Todas instaladas corretamente

---

## 🎨 Estilo do PDF

- **Fonte:** Helvetica (padrão do @react-pdf/renderer)
- **Tamanho da página:** A4 (210mm x 297mm)
- **Padding:** 40px em todas as páginas
- **Cores:**
  - Preto (#000) para textos principais
  - Cinza (#333) para textos secundários
  - Cinza claro (#f5f5f5, #f9f9f9) para backgrounds
  - Cinza médio (#e8e8e8) para resumo mensal

---

## 📚 Referências

- [Documentação @react-pdf/renderer](https://react-pdf.org/)
- RPC Supabase: `get_folha_ponto_pdf`
- Tipo de dados: `FolhaPontoPdfData`

---

**Data da Implementação:** 2025-01-XX
**Status:** ✅ Completo e Funcional
