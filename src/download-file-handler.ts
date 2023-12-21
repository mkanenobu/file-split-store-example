import { prisma } from "./db.ts";
import { mergeBlocksIntoBuffer } from "./split-buffer.ts";
import type { Handler } from "hono";

export const downloadFileHandler: Handler = async (c) => {
  const fileName = c.req.param().name;

  const fileWithVersions = await prisma.file.findFirst({
    where: {
      name: fileName,
    },
    include: {
      FileVersion: {
        select: {
          id: true,
          version: true,
        },
        orderBy: {
          version: "desc",
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const latestFileVersion = fileWithVersions?.FileVersion.at(0);

  if (!fileWithVersions || !latestFileVersion) {
    return c.json({ ok: false, error: "file not found" }, 404);
  }

  const versionBlocks = await prisma.fileVersionBlock.findMany({
    where: {
      fileVersionId: latestFileVersion.id,
    },
    include: {
      FileBlock: true,
    },
    orderBy: {
      fileBlockPos: "asc",
    },
  });

  const blocks: Buffer[] = versionBlocks.map((versionBlock) => {
    return versionBlock.FileBlock.block;
  });

  const content = mergeBlocksIntoBuffer(blocks);

  return c.body(content.buffer as ArrayBuffer);
};
