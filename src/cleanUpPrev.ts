import { deleteFile } from "./write/deleteFile";

export const cleanUpPrev = (outputFile: string) => {
  deleteFile(outputFile);
  deleteFile("./errors/errors_404.tsv");
  deleteFile("./errors/errors_other.tsv");
};
