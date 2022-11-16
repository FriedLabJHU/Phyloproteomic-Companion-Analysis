import { cleanUpPrev } from "./src/cleanUpPrev";
import { findATCC } from "./src/findATCC";
import { getATCCData } from "./src/getATCCData";
import { JSON2SV } from "./src/helpers/JSON2SV";
import { SV2JSON } from "./src/helpers/SV2JSON";
import { mergeATCCData } from "./src/mergeATCCData";
import { validateInputFile } from "./src/validateInputFile";
import { deleteFile } from "./src/write/deleteFile";
const init = async () => {
  const inputFile = process.env.inputFile;
  const outputFile = process.env.outputFile || "results.tsv";

  validateInputFile(inputFile);
  cleanUpPrev(outputFile);

  const data = SV2JSON<BACTERIA_MIN>(inputFile);
  const ATCCBacteria = findATCC(data);

  let numberTries = 0;
  while (true) {
    numberTries++;
    // get 404 errors
    const known404Errors = SV2JSON<{ ATCC: string; timeStamp: string }>(
      "errors/errors_404.tsv"
    );

    // get other errors
    const knownOtherErrors = SV2JSON<{ ATCC: string; timeStamp: string }>(
      "errors/errors_other.tsv"
    );
    deleteFile("./errors/errors_other.tsv");

    // remove known404Errors from ATCCBacteria
    const ATCCBacteria_no404 = ATCCBacteria.filter(
      (item) => !known404Errors.find((error) => error.ATCC === item.ATCC)
    );

    let ATCCBacteriaToTry: BACTERIA_MIN[] = ATCCBacteria_no404;
    if (numberTries > 1) {
      // get the intersection of knownOtherErrors and ATCCBacteria_no404
      ATCCBacteriaToTry = ATCCBacteria_no404.filter((item) =>
        knownOtherErrors.find((error) => error.ATCC === item.ATCC)
      );
    }
    if (ATCCBacteriaToTry.length === 0) {
      console.log("No more ATCC to scrape");
      break;
    }

    // get the data from the website
    const websiteData = await getATCCData(ATCCBacteriaToTry);

    // merge the data from the website with the data from the file using the ATCC_URL
    const result = mergeATCCData(websiteData, ATCCBacteriaToTry);
    const new404Errors = SV2JSON<{ ATCC: string; timeStamp: string }>(
      "errors/errors_404.tsv"
    );

    console.log(`${result.length}/${ATCCBacteria.length} with ACCT scraped`);
    console.log(`${new404Errors.length} 404 errors`);

    JSON2SV(result, outputFile, {
      delimiter: "\t",
      encoding: "utf8",
      flag: "a",
    });
  }
};

init();
