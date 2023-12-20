import { Hono } from "hono";
import { logger } from "hono/logger";
import { Page } from "./page.ts";
import {
  mergeBlocksIntoBuffer,
  splitBufferIntoBlocks,
} from "./split-buffer.ts";
import { prisma } from "./db.ts";
import { getHash } from "./hash.ts";

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

  const blocks = splitBufferIntoBlocks(content).map((block) => ({
    block,
    hash: getHash(block),
  }));

  const fileRecord = await prisma.$transaction(async (tx) => {
    const file = await tx.file.create({
      data: {
        name: fileName,
        fileSize,
      },
    });

    const tasks = blocks.map(async ({ block, hash }, i) => {
      return await tx.fileBlock.create({
        data: {
          block,
          hash,
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
      FileBlock: {
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
    file.FileBlock.map((block) => block.block),
  );

  return c.body(content.buffer as ArrayBuffer);
});

export default app;
