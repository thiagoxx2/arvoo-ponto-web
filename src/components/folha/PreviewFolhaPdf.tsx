import { PDFViewer } from "@react-pdf/renderer";
import FolhaPontoPdfDocument, {
  FolhaPontoPdfData,
} from "./FolhaPontoPdfDocument";

interface PreviewFolhaPdfProps {
  folhaData: FolhaPontoPdfData;
}

export function PreviewFolhaPdf({ folhaData }: PreviewFolhaPdfProps) {
  return (
    <PDFViewer style={{ width: "100%", height: "80vh" }}>
      <FolhaPontoPdfDocument folha={folhaData} />
    </PDFViewer>
  );
}


