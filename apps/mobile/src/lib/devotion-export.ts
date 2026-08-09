import { Platform, Share } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import {
  cacheDirectory,
  EncodingType,
  writeAsStringAsync,
} from 'expo-file-system/legacy';
import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from 'docx';
import Constants from 'expo-constants';

export type DevotionExportInput = {
  noteDate: string;
  categoryLabel: string;
  scriptureRef?: string | null;
  content: string;
};

function brandName() {
  return Constants.expoConfig?.name?.trim() || '靈修隨記';
}

function datePart(noteDate: string) {
  return String(noteDate).slice(0, 10);
}

function fileStem(input: DevotionExportInput) {
  const safeCat = input.categoryLabel.replace(/[^\w\u4e00-\u9fff-]+/g, '');
  return `靈修隨記_${datePart(input.noteDate)}_${safeCat || '筆記'}`;
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildDevotionPlainText(input: DevotionExportInput) {
  const lines = [
    `【${brandName()}・靈修隨記】`,
    `日期：${datePart(input.noteDate)}`,
    `分類：${input.categoryLabel}`,
  ];
  if (input.scriptureRef?.trim()) {
    lines.push(`經文：${input.scriptureRef.trim()}`);
  }
  lines.push('', input.content.trim());
  return lines.join('\n');
}

function buildDevotionHtml(input: DevotionExportInput) {
  const ref = input.scriptureRef?.trim()
    ? `<p style="color:#666;margin:8px 0 16px;">經文：${escapeHtml(input.scriptureRef.trim())}</p>`
    : '';
  const body = escapeHtml(input.content.trim()).replace(/\n/g, '<br/>');
  return `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8" />
<title>靈修隨記</title>
<style>
  body { font-family: -apple-system, "PingFang TC", "Noto Sans TC", "Microsoft JhengHei", sans-serif;
    padding: 32px; color: #222; line-height: 1.7; }
  h1 { font-size: 22px; margin: 0 0 8px; }
  .meta { color: #666; font-size: 14px; margin-bottom: 4px; }
  .content { font-size: 16px; margin-top: 20px; white-space: pre-wrap; }
</style>
</head>
<body>
  <h1>${escapeHtml(brandName())}・靈修隨記</h1>
  <p class="meta">日期：${escapeHtml(datePart(input.noteDate))}</p>
  <p class="meta">分類：${escapeHtml(input.categoryLabel)}</p>
  ${ref}
  <div class="content">${body}</div>
</body>
</html>`;
}

function downloadBase64Web(
  base64: string,
  mime: string,
  filename: string,
) {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  const blob = new Blob([bytes], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function shareOrDownloadFile(
  uri: string,
  mimeType: string,
  dialogTitle: string,
  filename: string,
  base64ForWeb?: string,
) {
  if (Platform.OS === 'web') {
    if (base64ForWeb) {
      downloadBase64Web(base64ForWeb, mimeType, filename);
      return;
    }
    if (typeof window !== 'undefined') window.open(uri, '_blank');
    return;
  }
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType,
      dialogTitle,
      UTI:
        mimeType === 'application/pdf'
          ? 'com.adobe.pdf'
          : 'org.openxmlformats.wordprocessingml.document',
    });
    return;
  }
  throw new Error('此裝置不支援檔案分享');
}

export async function shareDevotionText(input: DevotionExportInput) {
  const message = buildDevotionPlainText(input);
  if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.share) {
    await navigator.share({ title: '靈修隨記', text: message });
    return;
  }
  await Share.share({ message, title: '靈修隨記' });
}

export async function exportDevotionPdf(input: DevotionExportInput) {
  const html = buildDevotionHtml(input);
  const filename = `${fileStem(input)}.pdf`;

  if (Platform.OS === 'web') {
    // Safari／Chrome：開啟列印，可選「儲存為 PDF」
    await Print.printAsync({ html });
    return;
  }

  const { uri } = await Print.printToFileAsync({ html });
  await shareOrDownloadFile(
    uri,
    'application/pdf',
    '分享 PDF',
    filename,
  );
}

export async function exportDevotionDocx(input: DevotionExportInput) {
  const children: Paragraph[] = [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [
        new TextRun({ text: `${brandName()}・靈修隨記`, bold: true }),
      ],
    }),
    new Paragraph({
      children: [new TextRun(`日期：${datePart(input.noteDate)}`)],
    }),
    new Paragraph({
      children: [new TextRun(`分類：${input.categoryLabel}`)],
    }),
  ];

  if (input.scriptureRef?.trim()) {
    children.push(
      new Paragraph({
        children: [new TextRun(`經文：${input.scriptureRef.trim()}`)],
      }),
    );
  }

  children.push(new Paragraph({ children: [] }));

  for (const line of input.content.trim().split('\n')) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.LEFT,
        children: [new TextRun(line || ' ')],
      }),
    );
  }

  const doc = new Document({
    sections: [{ properties: {}, children }],
  });

  const base64 = await Packer.toBase64String(doc);
  const filename = `${fileStem(input)}.docx`;
  const mime =
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

  if (Platform.OS === 'web') {
    downloadBase64Web(base64, mime, filename);
    return;
  }

  const dir = cacheDirectory;
  if (!dir) throw new Error('無法存取暫存目錄');
  const uri = `${dir}${filename}`;
  await writeAsStringAsync(uri, base64, { encoding: EncodingType.Base64 });
  await shareOrDownloadFile(uri, mime, '分享 Word', filename, base64);
}
