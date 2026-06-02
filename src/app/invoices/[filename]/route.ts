import { NextResponse } from "next/server";

export const runtime = "nodejs";

function pdfText(filename: string) {
  const orderNo = filename.replace(/^opc-acceptance-202605-/, "").replace(/\.pdf$/i, "");
  const text = `Aiyes OPC acceptance invoice ${orderNo}`;
  const stream = `BT /F1 16 Tf 72 740 Td (${text}) Tj 0 -28 Td (This file is generated for interface acceptance testing.) Tj ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(stream, "ascii")} >>\nstream\n${stream}\nendstream`,
  ];
  let body = "%PDF-1.4\n";
  const offsets = [0];
  for (let index = 0; index < objects.length; index += 1) {
    offsets.push(Buffer.byteLength(body, "ascii"));
    body += `${index + 1} 0 obj\n${objects[index]}\nendobj\n`;
  }
  const xrefOffset = Buffer.byteLength(body, "ascii");
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) {
    body += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  body += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(body, "ascii");
}

export async function GET(_request: Request, context: { params: Promise<unknown> }) {
  const params = (await context.params) as { filename?: string };
  const filename = params.filename || "";
  if (!/^opc-acceptance-202605-\d{3}\.pdf$/i.test(filename)) {
    return new NextResponse("Not found", { status: 404 });
  }

  return new NextResponse(pdfText(filename), {
    headers: {
      "Cache-Control": "public, max-age=86400",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Type": "application/pdf",
    },
  });
}
