import { saveAs } from "file-saver";

export function downloadFile(
  content: string,
  filename: string,
  fileType: string
) {
  // Prepending a BOM sequence at the beginning of the text file to encoded as UTF-8.
  const BOM = new Uint8Array([0xef, 0xbb, 0xbf]);
  const file = new File([BOM, content], filename, { type: fileType });
  saveAs(file);
}
