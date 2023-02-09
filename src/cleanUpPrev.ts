import { deleteFile } from "./write/deleteFile";

export const cleanUpPrev = (outputFile: string) => {
  deleteFile(outputFile);
  deleteFile("./output/missing_from_results.tsv");
  deleteFile("./output/errors.tsv");
};
