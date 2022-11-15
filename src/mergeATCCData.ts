interface Data1 {
  [k: string]: string;
}

export const mergeATCCData = (
  data1: Data1[],
  data2: BACTERIA_ALL[] | BACTERIA_MIN[]
) => {
  return data1
    .filter(Boolean)
    .map((item) => {
      const { ATCC_URL } = item;
      // get the ATCC off the end of url
      const ATCC = ATCC_URL.split("/").pop();
      // case insensitive search for the ATCC in the data
      const index = data2.findIndex(
        (e) => e.ATCC.toLowerCase() === ATCC.toLowerCase()
      );

      if (index === -1) {
        console.log(`Error: ATCC not matched: ${ATCC}`);
        return;
      }

      return { ...data2[index], ...item };
    })
    .filter(Boolean);
};
