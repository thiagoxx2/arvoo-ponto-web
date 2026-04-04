import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

// Tipo de dados retornado pela RPC get_folha_ponto_pdf
export type FolhaPontoPdfData = {
  empresa: {
    nome: string;
    cnpj: string;
    inscricao_especifica?: string | null;
  };
  colaborador: {
    nome: string;
    cargo: string | null;
    regime_contratacao: string | null;
    jornada_contratual: string | null;
    cpf: string | null;
    data_nascimento: string | null;
    data_admissao: string | null;
    matricula: string | null;
    unidade: string | null;
    setor: string | null;
    horarios_pactuados: string | null;
  };
  periodo: {
    mes: string;        // "2025-11"
    descricao: string;  // pode vir em inglês pelo locale do DB
  };
  diario: Array<{
    data: string;               // "2025-11-01"
    dia: number;                // 1..31
    dia_semana: string;         // "Seg", "Ter", etc.
    batidas: string[];          // ["08:00","12:00",...]
    total_trabalhado: string;   // "07:53"
    horas_extras: string;       // "00:00"
    atrasos: string;            // "00:00"
    faltas: string;             // "00:00"
    banco_horas_dia: string;    // "00:00"
    observacao?: string | null; // "FOLGA", "FALTA"
  }>;
  mensal: {
    total_horas_trabalhadas: string;
    total_horas_extras: string;
    total_atrasos: string;
    total_faltas: string;
    banco_horas_final: string;
  };
};

// Helpers
const fmtDateBR = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

const fmtBatidas = (b: string[]) => (b?.length ? b.join(" / ") : "-");

const getDataAtual = () => {
  const hoje = new Date();
  const d = String(hoje.getDate()).padStart(2, "0");
  const m = String(hoje.getMonth() + 1).padStart(2, "0");
  const y = hoje.getFullYear();
  return `${d}/${m}/${y}`;
};

// Estilos
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
  },
  header: {
    marginBottom: 10,
    borderBottom: "1 solid #000",
    paddingBottom: 5,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  empresaNome: {
    fontSize: 12,
    fontWeight: "bold",
  },
  empresaInfo: {
    fontSize: 8,
    color: "#444",
  },
  titulo: {
    fontSize: 12,
    fontWeight: "bold",
    textAlign: "center",
    marginVertical: 5,
    textDecoration: "underline",
  },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 5,
    border: "1 solid #eee",
    padding: 5,
  },
  infoItem: {
    width: "33%",
    marginBottom: 3,
  },
  infoLabel: {
    fontSize: 7,
    fontWeight: "bold",
    color: "#666",
  },
  infoValue: {
    fontSize: 8,
  },
  table: {
    marginTop: 15,
    marginBottom: 15,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#333",
    color: "#fff",
    padding: 6,
    fontSize: 8,
    fontWeight: "bold",
  },
  tableRow: {
    flexDirection: "row",
    padding: 6,
    fontSize: 8,
    borderBottom: "1 solid #ddd",
  },
  tableRowZebra: {
    backgroundColor: "#f9f9f9",
  },
  colDia: {
    width: "6%",
  },
  colSemana: {
    width: "10%",
  },
  colData: {
    width: "12%",
  },
  colBatidas: {
    width: "22%",
  },
  colTotal: {
    width: "10%",
  },
  colExtras: {
    width: "10%",
  },
  colAtrasos: {
    width: "10%",
  },
  colFaltas: {
    width: "8%",
  },
  colBanco: {
    width: "12%",
  },
  resumoMensal: {
    marginTop: 20,
    marginBottom: 20,
    padding: 12,
    backgroundColor: "#e8e8e8",
    borderRadius: 4,
  },
  resumoTitle: {
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 8,
  },
  resumoItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
    fontSize: 9,
  },
  resumoLabel: {
    fontWeight: "bold",
  },
  declaracao: {
    marginTop: 25,
    marginBottom: 15,
    fontSize: 9,
    lineHeight: 1.5,
    textAlign: "justify",
  },
  assinaturas: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 40,
    marginBottom: 20,
  },
  assinaturaBox: {
    width: "45%",
    borderTop: "1 solid #000",
    paddingTop: 4,
    fontSize: 8,
    textAlign: "center",
  },
  rodape: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    color: "#666",
    textAlign: "center",
  },
});

interface FolhaPontoPdfDocumentProps {
  folha: FolhaPontoPdfData;
}

export default function FolhaPontoPdfDocument({
  folha,
}: FolhaPontoPdfDocumentProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Cabeçalho do Empregador e Identificação (Fixo) */}
        <View style={styles.header} fixed>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.empresaNome}>{folha.empresa.nome}</Text>
              <Text style={styles.empresaInfo}>CNPJ/CPF: {folha.empresa.cnpj}</Text>
              {folha.empresa.inscricao_especifica && (
                <Text style={styles.empresaInfo}>CEI/CAEPF/CNO: {folha.empresa.inscricao_especifica}</Text>
              )}
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.empresaInfo}>Emissão: {getDataAtual()}</Text>
              <Text 
                style={styles.empresaInfo} 
                render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} 
              />
            </View>
          </View>
          
          <Text style={styles.titulo}>FOLHA DE PONTO</Text>
          
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Colaborador</Text>
              <Text style={styles.infoValue}>{folha.colaborador.nome}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>CPF</Text>
              <Text style={styles.infoValue}>{folha.colaborador.cpf}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Matrícula</Text>
              <Text style={styles.infoValue}>{folha.colaborador.matricula || '-'}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Data de Admissão</Text>
              <Text style={styles.infoValue}>{folha.colaborador.data_admissao ? fmtDateBR(folha.colaborador.data_admissao) : '-'}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Cargo/Função</Text>
              <Text style={styles.infoValue}>{folha.colaborador.cargo || '-'}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Período</Text>
              <Text style={styles.infoValue}>{folha.periodo.descricao}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Unidade/Setor</Text>
              <Text style={styles.infoValue}>{folha.colaborador.unidade || '-'}{folha.colaborador.setor ? ` / ${folha.colaborador.setor}` : ''}</Text>
            </View>
            <View style={{ width: '66%' }}>
              <Text style={styles.infoLabel}>Horário/Jornada Contratual</Text>
              <Text style={styles.infoValue}>{folha.colaborador.horarios_pactuados || folha.colaborador.jornada_contratual || '-'}</Text>
            </View>
          </View>
        </View>

        {/* Tabela Diária */}
        <View style={styles.table}>
          <View style={styles.tableHeader} fixed>
            <Text style={styles.colDia}>Dia</Text>
            <Text style={styles.colSemana}>Semana</Text>
            <Text style={styles.colData}>Data</Text>
            <Text style={styles.colBatidas}>Marcações</Text>
            <Text style={styles.colTotal}>Jornada</Text>
            <Text style={styles.colExtras}>Extras</Text>
            <Text style={styles.colAtrasos}>Atrasos</Text>
            <Text style={styles.colFaltas}>Faltas</Text>
            <Text style={styles.colBanco}>Saldo</Text>
          </View>
          {folha.diario.map((dia, idx) => {
            const batidasTexto = fmtBatidas(dia.batidas);
            
            let batidasComObs = batidasTexto;
            
            // Verificação robusta para exibição limpa
            if (dia.observacao === "FOLGA" || dia.observacao === "FALTA") {
              batidasComObs = dia.batidas.length > 0 
                ? `${batidasTexto} ${dia.observacao}` 
                : dia.observacao;
            } else if (dia.observacao) {
              batidasComObs = dia.batidas.length > 0 
                ? `${batidasTexto} ${dia.observacao}` 
                : dia.observacao;
            } else if (batidasTexto === "-") {
              batidasComObs = "";
            }
            return (
              <View
                key={dia.data}
                style={
                  idx % 2 === 1
                    ? [styles.tableRow, styles.tableRowZebra]
                    : styles.tableRow
                }
                wrap={false}
              >
                <Text style={styles.colDia}>{String(dia.dia).padStart(2, "0")}</Text>
                <Text style={styles.colSemana}>{dia.dia_semana.substring(0, 3)}</Text>
                <Text style={styles.colData}>{fmtDateBR(dia.data)}</Text>
                <Text style={styles.colBatidas}>{batidasComObs}</Text>
                <Text style={styles.colTotal}>{dia.total_trabalhado}</Text>
                <Text style={styles.colExtras}>{dia.horas_extras}</Text>
                <Text style={styles.colAtrasos}>{dia.atrasos}</Text>
                <Text style={styles.colFaltas}>{dia.faltas}</Text>
                <Text style={styles.colBanco}>{dia.banco_horas_dia}</Text>
              </View>
            );
          })}
        </View>

        {/* Resumo Mensal */}
        <View style={styles.resumoMensal}>
          <Text style={styles.resumoTitle}>RESUMO MENSAL</Text>
          <View style={styles.resumoItem}>
            <Text style={styles.resumoLabel}>Total Trabalhado:</Text>
            <Text>{folha.mensal.total_horas_trabalhadas}</Text>
          </View>
          <View style={styles.resumoItem}>
            <Text style={styles.resumoLabel}>Extras:</Text>
            <Text>{folha.mensal.total_horas_extras}</Text>
          </View>
          <View style={styles.resumoItem}>
            <Text style={styles.resumoLabel}>Atrasos:</Text>
            <Text>{folha.mensal.total_atrasos}</Text>
          </View>
          <View style={styles.resumoItem}>
            <Text style={styles.resumoLabel}>Faltas:</Text>
            <Text>{folha.mensal.total_faltas}</Text>
          </View>
          <View style={styles.resumoItem}>
            <Text style={styles.resumoLabel}>Banco de Horas Final:</Text>
            <Text>{folha.mensal.banco_horas_final}</Text>
          </View>
        </View>

        {/* Declaração de Ciência */}
        <View style={styles.declaracao}>
          <Text>
            Declaro que tive acesso a esta folha de ponto, conferi os registros
            de jornada aqui apresentados e estou ciente das informações nela
            contidas.
          </Text>
        </View>

        {/* Assinaturas */}
        <View style={styles.assinaturas}>
          <View style={styles.assinaturaBox}>
            <Text>{folha.colaborador.nome}</Text>
            <Text>Colaborador</Text>
          </View>
          <View style={styles.assinaturaBox}>
            <Text>Responsável / Gestor</Text>
          </View>
        </View>

        {/* Rodapé */}
        <Text style={styles.rodape}>
          Documento gerado pelo Arvoo Ponto em {getDataAtual()}
        </Text>
      </Page>
    </Document>
  );
}

