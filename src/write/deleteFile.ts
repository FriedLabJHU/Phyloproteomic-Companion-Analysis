import { existsSync, unlinkSync } from "fs";
// delete the file if it exists
export const deleteFile = (path: string): void => {
  if (existsSync(path)) unlinkSync(path);
};
