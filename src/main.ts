import { Hono } from "hono";
import { logger } from "hono/logger";
import { Page } from "./page.ts";
import {
  mergeBlocksIntoBuffer,
  splitBufferIntoBlocks,
} from "./split-buffer.ts";
import { prisma } from "./db.ts";

const app = new Hono();

app.use("*", logger());

app.get("/", (c) => {
  return c.json({ ok: true });
});

app.get("/files", async (c) => {
  const files = await prisma.file.findMany();
  return c.html(Page({ files }));
});

app.post("/files", async (c) => {
  const body = await c.req.parseBody();
  const file = body.file;
  if (!(file instanceof File)) {
    return c.json({ ok: false, error: "file is not instance of File" }, 400);
  }

  const fileName = file.name;
  const fileSize = file.size;
  const content = await file.arrayBuffer();
  const blocks = splitBufferIntoBlocks(content);

  const fileRecord = await prisma.$transaction(async (tx) => {
    const file = await tx.file.create({
      data: {
        name: fileName,
        fileSize,
      },
    });

    const tasks = blocks.map(async (block, i) => {
      return await tx.fileFragment.create({
        data: {
          fragment: Buffer.from(block),
          index: i,
          fileId: file.id,
        },
      });
    });
    await Promise.all(tasks);

    return file;
  });

  return c.json({ ok: true, fileId: fileRecord.id });
});
app.get("/files/:name", async (c) => {
  const fileName = c.req.param().name;

  const file = await prisma.file.findFirst({
    where: {
      name: fileName,
    },
    include: {
      FileFragments: {
        orderBy: {
          index: "asc",
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!file) {
    return c.json({ ok: false, error: "file not found" }, 404);
  }

  const content = mergeBlocksIntoBuffer(
    file.FileFragments.map((fragment) => fragment.fragment),
  );

  return c.body(content);
  // return c.json({ filename: file.name, content: content.toString("base64") });
});

export default app;
