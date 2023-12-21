import { Hono } from "hono";
import { logger } from "hono/logger";
import { Page } from "./page.ts";
import { prisma } from "./db.ts";
import { uploadFileHandler } from "./upload-file-handler.ts";
import { downloadFileHandler } from "./download-file-handler.ts";

const app = new Hono();

app.use("*", logger());

app.get("/", (c) => {
  return c.json({ ok: true });
});

app.get("/files", async (c) => {
  const files = await prisma.file.findMany({
    include: {
      FileVersion: {
        orderBy: {
          version: "desc",
        },
      },
    },
  });
  return c.html(
    Page({
      files: files.map((file) => ({
        name: file.name,
        id: file.id,
        fileSize: file.fileSize,
        fileVersion: file.FileVersion.at(0)?.version ?? 0,
      })),
    }),
  );
});

app.post("/files", uploadFileHandler);

app.get("/files/:name", downloadFileHandler);

const server = Bun.serve({
  fetch: app.fetch,
  port: 3303,
});

console.log(`Server started at ${server.url}`);
