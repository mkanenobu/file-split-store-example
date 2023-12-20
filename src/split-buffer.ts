// 1MB
const blockSize = 1024 * 1024;

export const splitBufferIntoBlocks = (buffer: ArrayBuffer): Buffer[] => {
  const _buffer = Buffer.from(buffer);
  const blocks: Buffer[] = [];
  let offset = 0;
  while (offset < _buffer.byteLength) {
    const block = _buffer.slice(
      offset,
      Math.min(offset + blockSize, _buffer.byteLength),
    );
    blocks.push(block);
    offset += blockSize;
  }
  return blocks;
};

export const mergeBlocksIntoBuffer = (blocks: Buffer[]): Buffer => {
  return Buffer.concat(blocks);
};
