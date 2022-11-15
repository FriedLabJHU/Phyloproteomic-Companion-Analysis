/**
 *
 * @param rows
 * @returns
 */
export const findATCC = (rows: BACTERIA_MIN[] | BACTERIA_ALL[]) => {
  const result2 = rows
    .map((item, index) => {
      (item as BACTERIA_ALL).index = index;
      return item as BACTERIA_ALL;
    })
    .filter((item) => {
      // look for "ATCC" in infraspecific_name
      return (item.infraspecific_name as string)?.includes("ATCC");
    })
    .map(({ ftp_path, infraspecific_name, index, ...rest }) => {
      let ATCC = infraspecific_name.split("ATCC")[1].trim();
      // if it has a semicolon get rid of the semicolon and everything after it
      if (ATCC.includes(";")) {
        ATCC = ATCC.split(";")[0];
      }
      return {
        ...rest,
        ATCC,
        ATCC_URL: `https://www.atcc.org/products/${ATCC}`,
        ftp_path,
        http_path: ftp_path.replace("ftp://", "https://"),
        originalRow: index + 1,
        infraspecific_name,
      };
    });
  return result2;
};
