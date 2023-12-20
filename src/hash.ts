import * as crypto from "node:crypto";

export const getHash = (data: string | Buffer): Buffer => {
  const hash = crypto.createHash("sha256");
  hash.update(data);
  return hash.digest();
};
