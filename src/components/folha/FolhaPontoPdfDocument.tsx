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
    marginBottom: 20,
    borderBottom: "2 solid #000",
    paddingBottom: 10,
  },
  empresaNome: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  empresaCnpj: {
    fontSize: 10,
    marginBottom: 8,
  },
  titulo: {
    fontSize: 14,
    fontWeight: "bold",
    marginTop: 8,
    marginBottom: 4,
  },
  periodo: {
    fontSize: 10,
    marginBottom: 4,
  },
  colaboradorCard: {
    marginTop: 15,
    marginBottom: 15,
    padding: 10,
    backgroundColor: "#f5f5f5",
    borderRadius: 4,
  },
  colaboradorNome: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 4,
  },
  colaboradorInfo: {
    fontSize: 9,
    marginTop: 2,
    color: "#333",
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
    width: "8%",
  },
  colData: {
    width: "12%",
  },
  colBatidas: {
    width: "20%",
  },
  colTotal: {
    width: "12%",
  },
  colExtras: {
    width: "10%",
  },
  colAtrasos: {
    width: "10%",
  },
  colFaltas: {
    width: "10%",
  },
  colBanco: {
    width: "18%",
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
        {/* Cabeçalho */}
        <View style={styles.header}>
          <Text style={styles.empresaNome}>{folha.empresa.nome}</Text>
          <Text style={styles.empresaCnpj}>CNPJ: {folha.empresa.cnpj}</Text>
          <Text style={styles.titulo}>FOLHA DE PONTO MENSAL</Text>
          <Text style={styles.periodo}>{folha.periodo.descricao}</Text>
        </View>

        {/* Dados do Colaborador */}
        <View style={styles.colaboradorCard}>
          <Text style={styles.colaboradorNome}>
            Colaborador: {folha.colaborador.nome}
          </Text>
          {folha.colaborador.cargo && (
            <Text style={styles.colaboradorInfo}>
              Cargo: {folha.colaborador.cargo}
            </Text>
          )}
          {folha.colaborador.regime_contratacao && (
            <Text style={styles.colaboradorInfo}>
              Regime de Contratação: {folha.colaborador.regime_contratacao}
            </Text>
          )}
          {folha.colaborador.jornada_contratual && (
            <Text style={styles.colaboradorInfo}>
              Jornada Contratual: {folha.colaborador.jornada_contratual}
            </Text>
          )}
        </View>

        {/* Tabela Diária */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colDia}>Dia</Text>
            <Text style={styles.colData}>Data</Text>
            <Text style={styles.colBatidas}>Entradas / Saídas</Text>
            <Text style={styles.colTotal}>Total</Text>
            <Text style={styles.colExtras}>Extras</Text>
            <Text style={styles.colAtrasos}>Atrasos</Text>
            <Text style={styles.colFaltas}>Faltas</Text>
            <Text style={styles.colBanco}>Banco</Text>
          </View>
          {folha.diario.map((dia, idx) => {
            const batidasTexto = fmtBatidas(dia.batidas);
            const batidasComObs = dia.observacao
              ? `${batidasTexto} (${dia.observacao})`
              : batidasTexto;
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
            <Text>_________________________</Text>
            <Text>Responsável/Gestor</Text>
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

