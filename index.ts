import { cleanUpPrev } from "./src/cleanUpPrev";
import { getSearchResults } from "./src/getSearchResults";
import { JSON2SV } from "./src/helpers/JSON2SV";
import { SV2JSON } from "./src/helpers/SV2JSON";
import { validateInputFile } from "./src/validateInputFile";
import * as puppeteer from "puppeteer";

const init = async () => {
  const inputFile = process.env.inputFile;
  const outputFile = process.env.outputFile || "./output/results.tsv";

  validateInputFile(inputFile);

  const data = SV2JSON<BACTERIA_MIN>(inputFile);

  const browser = await puppeteer.launch({
    headless: process.env.headless === "false" ? false : true,
  });

  // x pages at a time to iterate through
  const totalPages = Number(process.env.browsers) || 10;

  const pages = await Promise.all(
    new Array(totalPages).fill(0).map(() => browser.newPage())
  );
  //   a list of the index of the available page
  const availablePages = new Array(totalPages).fill(0).map((_, i) => i);
  // get an available page from the list or if none is available, wait for one to become available
  let pagesGiven = 0;
  const getAvailablePage = async () => {
    while (availablePages.length === 0)
      await new Promise((r) => setTimeout(r, 1000));
    const nextPage = availablePages.shift();
    // go back to home new tab page
    try {
      while (pages[nextPage].url() !== "about:blank")
        await pages[nextPage].goBack({ waitUntil: "networkidle2" });
    } catch (_) {
      const page = pages[nextPage];
      page.close();
      // remove the page and create a new one in the same index
      pages.splice(nextPage, 1, await browser.newPage());
    }

    // wait for 1000ms
    await new Promise((r) => setTimeout(r, 1000));

    pagesGiven++;
    console.log(`pages given: ${pagesGiven}`);
    return nextPage;
  };
  const dataLength = data.length;
  const maxQueries = Number(process.env.maxQueries) || dataLength;
  let skipWarning = true;
  const allSearchTerms: string[] = [];
  const errors = [];
  const searchResults = (
    await Promise.all(
      data.map(async (item, index) => {
        if (index < maxQueries) {
          const pageIndex = await getAvailablePage();
          const page = pages[pageIndex];
          try {
            const result = await getSearchResults(item, page, allSearchTerms);
            availablePages.push(pageIndex);
            if (!result) {
              errors.push(item);
              return false;
            }
            return { ...result, index };
          } catch (err) {
            availablePages.push(pageIndex);
            console.error(err);
            errors.push(item);
            return false;
          }
        } else if (skipWarning) {
          skipWarning = false;
          console.warn(
            `maxQueries reached, skipping ${dataLength - maxQueries} queries`
          );
        }
      })
    )
  ).filter(Boolean);

  let allObjectKeys = {};
  const resultsWithAllObjectKeys = searchResults.map((item, index, array) => {
    if (index === 0) {
      array.forEach((item) => {
        const keys = Object.keys(item);
        keys.forEach((key) => {
          allObjectKeys[key] = undefined;
        });
      });
    }
    return { ...allObjectKeys, ...item };
  });

  cleanUpPrev(outputFile);

  // take the results and get all the indexes
  // create an error file with all the indexes that are missing
  const missingIndexes = [];
  for (let i = 0; i < maxQueries; i++) {
    if (!resultsWithAllObjectKeys.find((item) => item.index === i)) {
      missingIndexes.push(i);
    }
  }
  const missingIndexesErrors = missingIndexes.map((index) => {
    // if its the species is not in allSearchTerms then add it to missing else return false
    const datum = data[index];
    const searchTerm = allSearchTerms.findIndex(
      (item) => item.toLowerCase() === datum.species.toLowerCase()
    );
    if (searchTerm === -1) return { ...datum, index };
    console.log(`duplicate missing index: skipping ${index} ${datum.species}`);
    return false;
  });

  JSON2SV(missingIndexesErrors, "./output/missing_from_results.tsv", {
    delimiter: "\t",
    encoding: "utf8",
    flag: "a",
  });

  JSON2SV(errors, "./output/errors.tsv", {
    delimiter: "\t",
    encoding: "utf8",
    flag: "a",
  });

  JSON2SV(resultsWithAllObjectKeys, outputFile, {
    delimiter: "\t",
    encoding: "utf8",
    flag: "a",
  });
  // prevent function from exiting
  await new Promise((r) => setTimeout(r, 100000000));
  //   let numberTries = 0;
  //   while (true) {
  //     numberTries++;
  //     // get 404 errors
  //     const known404Errors = SV2JSON<{ ATCC: string; timeStamp: string }>(
  //       "errors/errors_404.tsv"
  //     );

  //     // get other errors
  //     const knownOtherErrors = SV2JSON<{ ATCC: string; timeStamp: string }>(
  //       "errors/errors_other.tsv"
  //     );
  //     deleteFile("./errors/errors_other.tsv");

  //     // remove known404Errors from ATCCBacteria
  //     const ATCCBacteria_no404 = ATCCBacteria.filter(
  //       (item) => !known404Errors.find((error) => error.ATCC === item.ATCC)
  //     );

  //     let ATCCBacteriaToTry: BACTERIA_MIN[] = ATCCBacteria_no404;
  //     if (numberTries > 1) {
  //       // get the intersection of knownOtherErrors and ATCCBacteria_no404
  //       ATCCBacteriaToTry = ATCCBacteria_no404.filter((item) =>
  //         knownOtherErrors.find((error) => error.ATCC === item.ATCC)
  //       );
  //     }
  //     if (ATCCBacteriaToTry.length === 0) {
  //       console.log("No more ATCC to scrape");
  //       break;
  //     }

  //     // get the data from the website
  //     const websiteData = await getATCCData(ATCCBacteriaToTry);

  //     // merge the data from the website with the data from the file using the ATCC_URL
  //     const result = mergeATCCData(websiteData, ATCCBacteriaToTry);
  //     const new404Errors = SV2JSON<{ ATCC: string; timeStamp: string }>(
  //       "errors/errors_404.tsv"
  //     );

  //     console.log(`${result.length}/${ATCCBacteria.length} with ACCT scraped`);
  //     console.log(`${new404Errors.length} 404 errors`);

  //   }
};

init();
