import { deleteFile } from "./write/deleteFile";

export const cleanUpPrev = (outputFile: string) => {
  deleteFile(outputFile);
  deleteFile("./output/errors_404.tsv");
  deleteFile("./output/errors.tsv");
};
