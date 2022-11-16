import { existsSync, readFileSync } from "fs";
interface Options {
  delimiter?: string;
  encoding?: BufferEncoding;
}
/**
 *
 * @param path The file path of the data
 * @param options
 * @param options.delimiter The delimiter of the data file (default: "\t")
 * @param options.encoding The encoding of the data file (default: "utf8")
 *
 * @returns An array of objects or an empty array if the file doesnt exist
 */
export const SV2JSON = <T>(path: string, options?: Options): T[] => {
  const delimiter = options?.delimiter || "\t";
  const encoding = options?.encoding || "utf8";

  // read the file as a string
  const exists = existsSync(path);
  if (!exists) return [];
  const data = readFileSync(path, encoding);

  // convert SV to JSON
  const lines = data.split("\n");
  const result = [];

  const headers = lines[0].split(delimiter);

  for (let i = 1; i < lines.length; i++) {
    const obj = {};
    const currentline = lines[i].split("\t");

    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = currentline[j];
    }

    result.push(obj);
  }
  return result;
};
