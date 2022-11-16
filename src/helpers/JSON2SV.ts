import { existsSync, writeFileSync } from "fs";
interface Options {
  delimiter?: string;
  encoding?: BufferEncoding;
  /** writeFileSync Flags */
  flag?:
    | "r"
    | "r+"
    | "rs+"
    | "w"
    | "wx"
    | "w+"
    | "wx+"
    | "a"
    | "ax"
    | "a+"
    | "ax+";
}
/**
 *
 * @param path The file path of the data
 * @param options
 * @param options.delimiter The delimiter of the data file (default: "\t")
 * @param options.encoding The encoding of the data file (default: "utf8")
 */
export const JSON2SV = <T>(
  JSONObject: string | Object,
  path: string,
  options?: Options
): void => {
  const delimiter = options?.delimiter || "\t";
  const encoding = options?.encoding || "utf8";
  const flag = options?.flag || "w";
  const data =
    typeof JSONObject === "string" ? JSON.parse(JSONObject) : JSONObject;

  // check if the file exists
  // if it does, do not add the headers to the file
  // if it doesnt, create the file and add the headers to the file
  const headers = Object.keys(data[0]);
  const lines = [];
  const exists = existsSync(path);
  if (!exists) lines.push(headers.join(delimiter));

  // convert JS object to Seperated Values using the delimiter and write the file as path
  for (let i = 0; i < data.length; i++) {
    const currentline = [];
    for (let j = 0; j < headers.length; j++) {
      currentline.push(data[i][headers[j]]);
    }
    lines.push(currentline.join(delimiter));
  }
  writeFileSync(path, lines.join("\n") + "\n", { encoding, flag });
  console.log("finished");
};
