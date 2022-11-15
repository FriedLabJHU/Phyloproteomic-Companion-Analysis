import { existsSync } from "fs";
import { resolve } from "path";

export const validateInputFile = (inputFile: string): void => {
  if (!inputFile) {
    throw new Error(
      "\nERROR: undefined input file\nPlease provide a file path to the input file\ne.g. $ inputFile=./bacteria.tsv yarn start\n\n"
    );
  } else if (!existsSync(inputFile)) {
    throw new Error(
      `\nERROR: the input file you provided does not exist\nPlease provide a file path relative to the root directory of this project ('${resolve(
        __dirname,
        ".."
      )}')\ne.g. $ inputFile=./bacteria.tsv yarn start\n\n`
    );
  }
};
