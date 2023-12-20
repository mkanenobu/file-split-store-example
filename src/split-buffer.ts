// 1MB
const blockSize = 1024 * 1024;

export const splitBufferIntoBlocks = (buffer: ArrayBuffer): ArrayBuffer[] => {
  const blocks: ArrayBuffer[] = [];
  let offset = 0;
  while (offset < buffer.byteLength) {
    const block = buffer.slice(
      offset,
      Math.min(offset + blockSize, buffer.byteLength),
    );
    blocks.push(block);
    offset += blockSize;
  }
  return blocks;
};

export const mergeBlocksIntoBuffer = (blocks: Buffer[]): Buffer => {
  return Buffer.concat(blocks);
};
