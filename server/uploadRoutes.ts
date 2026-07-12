import { Express, Request, Response } from "express";
import { storagePut } from "./storage";
import { sdk } from "./_core/sdk";
import { COOKIE_NAME } from "../shared/const";
import { parse as parseCookieHeader } from "cookie";

// Simple in-memory multipart parser for single file upload (no multer dependency needed)
export function registerUploadRoutes(app: Express) {
  app.post("/api/upload-avatar", async (req: Request, res: Response) => {
    try {
      // Parse cookies manually
      const cookieHeader = req.headers.cookie;
      const cookies = cookieHeader ? parseCookieHeader(cookieHeader) : {};
      const sessionCookie = cookies[COOKIE_NAME];

      if (!sessionCookie) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Verify session using the SDK's verifySession method
      const session = await sdk.verifySession(sessionCookie);
      if (!session) {
        return res.status(401).json({ error: "Invalid session" });
      }

      // Read the raw body as buffer
      const chunks: Buffer[] = [];
      for await (const chunk of req as any) {
        chunks.push(Buffer.from(chunk));
      }
      const body = Buffer.concat(chunks);

      // Parse multipart form data manually
      const contentType = req.headers["content-type"] || "";
      if (!contentType.includes("multipart/form-data")) {
        return res.status(400).json({ error: "Expected multipart/form-data" });
      }

      const boundaryMatch = contentType.match(/boundary=(.+)/);
      if (!boundaryMatch) {
        return res.status(400).json({ error: "No boundary found" });
      }

      const boundary = boundaryMatch[1];
      const parts = parseMultipart(body, boundary);
      const filePart = parts.find(p => p.name === "file");

      if (!filePart || !filePart.data || filePart.data.length === 0) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      if (filePart.data.length > 5 * 1024 * 1024) {
        return res.status(400).json({ error: "File too large (max 5MB)" });
      }

      const ext = filePart.filename?.split(".").pop() || "jpg";
      const mimeType = filePart.contentType || "image/jpeg";

      if (!mimeType.startsWith("image/")) {
        return res.status(400).json({ error: "Only image files allowed" });
      }

      const key = `avatars/${session.openId}_avatar.${ext}`;
      const { url } = await storagePut(key, filePart.data, mimeType);

      return res.json({ url });
    } catch (error: any) {
      console.error("[Upload] Avatar upload failed:", error);
      return res.status(500).json({ error: "Upload failed" });
    }
  });
}

interface MultipartPart {
  name?: string;
  filename?: string;
  contentType?: string;
  data: Buffer;
}

function parseMultipart(body: Buffer, boundary: string): MultipartPart[] {
  const parts: MultipartPart[] = [];
  const boundaryBuffer = Buffer.from(`--${boundary}`);
  const endBoundaryBuffer = Buffer.from(`--${boundary}--`);

  let start = body.indexOf(boundaryBuffer) + boundaryBuffer.length;

  while (start < body.length) {
    const nextBoundary = body.indexOf(boundaryBuffer, start);
    if (nextBoundary === -1) break;

    const partData = body.slice(start, nextBoundary);

    // Find the header/body separator (double CRLF)
    const headerEnd = partData.indexOf(Buffer.from("\r\n\r\n"));
    if (headerEnd === -1) {
      start = nextBoundary + boundaryBuffer.length;
      continue;
    }

    const headerStr = partData.slice(0, headerEnd).toString("utf-8");
    const fileData = partData.slice(headerEnd + 4, partData.length - 2); // -2 for trailing \r\n

    const part: MultipartPart = { data: fileData };

    // Parse Content-Disposition
    const dispositionMatch = headerStr.match(/Content-Disposition:\s*form-data;\s*name="([^"]+)"(?:;\s*filename="([^"]+)")?/i);
    if (dispositionMatch) {
      part.name = dispositionMatch[1];
      part.filename = dispositionMatch[2];
    }

    // Parse Content-Type
    const typeMatch = headerStr.match(/Content-Type:\s*(.+)/i);
    if (typeMatch) {
      part.contentType = typeMatch[1].trim();
    }

    parts.push(part);
    start = nextBoundary + boundaryBuffer.length;
  }

  return parts;
}
