import * as puppeteer from "puppeteer";
import { JSON2SV } from "./helpers/JSON2SV";
import { unknownError } from "./write/other_error";

// getATCCData
// get the data from the ATCC website
// on 404 write to errors_404.tsv
// on other error write to errors_other.tsv
export async function getATCCData(data: BACTERIA_MIN[] | BACTERIA_ALL[]) {
  const browser = await puppeteer.launch({
    headless: process.env.headless === "false" ? false : true,
  });

  // x pages at a time to iterate through
  const totalPages = 10;
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
    pagesGiven++;
    console.log(`pages given: ${pagesGiven}`);
    return nextPage;
  };
  const result = await Promise.all(
    data.map(async (item: BACTERIA_MIN, tab: number) => {
      const { ATCC_URL, ATCC } = item;
      let pageIndex = await getAvailablePage();
      let page = pages[pageIndex];

      // goto page
      for (let i = 0; i < 6; i++) {
        try {
          if (!i)
            await page.goto(ATCC_URL, {
              waitUntil: "networkidle2",
              timeout: 120000,
            });
          else {
            page.reload({ waitUntil: "networkidle2", timeout: 120000 });
            await page.waitForSelector(".generic-accordion__item-title");
          }
          break;
        } catch (error) {
          // try a new tab
          if (i % 2) {
            console.log(`trying new tab ${ATCC}`);
            let tempPageIndex = await getAvailablePage();
            availablePages.push(pageIndex);
            pageIndex = tempPageIndex;
            page = pages[pageIndex];
          }
          if (i === 5) {
            console.log("Error goto page", ATCC_URL);
            unknownError(ATCC);
            availablePages.push(pageIndex);
            return;
          }
        }
      }

      // 404 error
      try {
        if (
          (await page.evaluate(() =>
            document
              .querySelector(".generic-page-content__headline")
              ?.innerHTML.trim()
          )) === "Page Not Found (404 Error)"
        ) {
          availablePages.push(pageIndex);
          console.log(`404 Not Found: ${ATCC_URL}`);
          JSON2SV(
            [
              {
                ATCC,
                timestamp: new Date().toISOString(),
              },
            ],
            "./errors/errors_404.tsv",
            {
              delimiter: "\t",
              encoding: "utf8",
              flag: "a",
            }
          );
          return;
        }
      } catch (error) {
        console.log("unknown error on", ATCC_URL);
        availablePages.push(pageIndex);
        unknownError(ATCC);
        return;
      }
      // refresh page try again 4 times, if it fails all, return
      for (let i = 0; i < 6; i++) {
        try {
          if (!i) await page.reload();
          await page.waitForSelector(".generic-accordion__item-title-text", {
            timeout: 60000,
          });
          break;
        } catch (error) {
          if (i % 2) {
            console.log(`trying new tab ${ATCC}`);
            let tempPageIndex = await getAvailablePage();
            availablePages.push(pageIndex);
            pageIndex = tempPageIndex;
            page = pages[pageIndex];
          }
          if (i === 5) {
            console.log("Error attempting to scrape page", ATCC_URL);
            console.log("hoping for the best...");
            break;
          }
        }
      }
      try {
        const result = await page.evaluate(() => {
          const handlingInformation = Array.from(
            document.querySelectorAll(".generic-accordion__item-title-text")
          ).find(
            (node) =>
              node.innerHTML.toString().trim() === "Handling information"
          );
          const titles = Array.from(
            handlingInformation.parentElement.nextElementSibling
              .firstElementChild.firstElementChild.firstElementChild.childNodes
          ).filter((el) => el.nodeName === "DT");

          // get the price from .product-pricing__current-price
          const price = document
            .querySelector(".product-pricing__current-price")
            //@ts-ignore
            ?.innerText.trim();

          // create an array of objects with titles and values
          // the values come from the next element sibling of titles
          const data: {
            title: string;
            value: string;
          }[] = titles.map((el: Element) => {
            switch (el.innerHTML) {
              case "Medium":
                return {
                  title: "growth_medium",
                  value:
                    el.nextElementSibling.firstElementChild.firstElementChild
                      .innerHTML,
                };
              case "Temperature":
                return {
                  title: "temperature",
                  value: el.nextElementSibling.firstElementChild.innerHTML,
                };
              case "Atmosphere":
                return {
                  title: "atmosphere",
                  value: el.nextElementSibling.firstElementChild.innerHTML,
                };
              default:
                return;
            }
          });

          data.push({ title: "price", value: price });
          data.push({ title: "ATCC_URL", value: window.location.href });
          //   convert into an object where title is index and value is the value
          return Object.fromEntries(
            data.filter(Boolean).map(({ title, value }) => [title, value])
          );
        });
        // console.log(`freeing up page: ${pageIndex}`);
        // sleep for 3 seconds
        await new Promise((r) => setTimeout(r, 3000));
        availablePages.push(pageIndex);
        return result;
      } catch (e) {
        console.log(`Error: ${ATCC_URL} page: ${pageIndex}`);
        unknownError(ATCC);
        availablePages.push(pageIndex);
        return;
      }
    })
  );
  // Make sure availablePages is full
  while (availablePages.length < totalPages) {
    await new Promise((r) => setTimeout(r, 1000));
  }
  await browser.close();
  console.log("Com[leted scraping");
  return result;
}
