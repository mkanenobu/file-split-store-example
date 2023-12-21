import { splitBufferIntoBlocks } from "./split-buffer.ts";
import { getHash } from "./hash.ts";
import { prisma } from "./db.ts";
import type { Handler } from "hono";

export const uploadFileHandler: Handler = async (c) => {
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
    hash: getHash(block).toString("hex"),
  }));

  const fileRecord = await prisma.$transaction(async (tx) => {
    const file = await tx.file.upsert({
      where: {
        name: fileName,
      },
      create: {
        name: fileName,
        fileSize,
      },
      update: {},
      include: {
        FileVersion: {
          orderBy: {
            version: "desc",
          },
        },
      },
    });

    const latestVersion = file.FileVersion.at(0);
    const nextVersion = (latestVersion?.version ?? 0) + 1;

    const version = await tx.fileVersion.create({
      data: {
        version: nextVersion,
        fileId: file.id,
      },
    });

    const tasks = blocks.map(async ({ block, hash }, i) => {
      return await tx.fileVersionBlock.create({
        data: {
          fileBlockPos: i,
          FileVersion: {
            connect: {
              id: version.id,
            },
          },
          FileBlock: {
            // 同じハッシュがあれば使い回す
            connectOrCreate: {
              where: {
                hash,
              },
              create: {
                block,
                hash,
              },
            },
          },
        },
      });
    });
    await Promise.all(tasks);

    return file;
  });

  return c.json({ ok: true, fileId: fileRecord.id });
};
