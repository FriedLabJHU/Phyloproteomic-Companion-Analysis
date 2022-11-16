import { JSON2SV } from "../helpers/JSON2SV";

export const unknownError = (ATCC: string) => {
  JSON2SV(
    [
      {
        ATCC,
        timestamp: new Date().toISOString(),
      },
    ],
    "./errors/errors_other.tsv",
    {
      delimiter: "\t",
      encoding: "utf8",
      flag: "a",
    }
  );
};
