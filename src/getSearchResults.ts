import { Page } from "puppeteer";

export const getSearchResults = async (
  bacteria: BACTERIA_MIN,
  page: Page,
  searchTerms: string[]
) => {
  const searchTerm = `${bacteria.species}`.toLowerCase();

  if (searchTerms.includes(searchTerm)) {
    console.log(`searchTerm already searched: ${searchTerm}`);
    return;
  }
  searchTerms.push(searchTerm);
  const url =
    `https://www.atcc.org/search#q=${searchTerm}&sort=relevancy&numberOfResults=24&f:Contenttype=[Products]&f:Productcategory=[Bacteria]`.replace(
      / /g,
      "%20"
    );
  // make sure there are only letters in the search term
  if (!/^[a-zA-Z ]+$/.test(searchTerm)) {
    console.log("searchTerm contains symbols");
    return;
  }

  // remove any symbols from the search term and then split it into an array on spaces
  // also remove duplicates from the array and remove any empty strings
  const searchArray = Array.from(
    new Set(searchTerm.replace(/[^a-zA-Z ]/g, "").split(" "))
  ).filter(Boolean);

  if (searchArray.map((str) => str.toLowerCase()).includes("candidatus")) {
    console.log("searchArray includes candidatus");
    return;
  }
  // .filter((item) => item !== "ATCC");

  if (searchArray.length !== 2) {
    console.log("searchArray length is not 2");
    return;
  }

  try {
    let count = 0;
    while (count < 5) {
      try {
        await page.goto(url, { waitUntil: "networkidle2" });
        break;
      } catch (err) {
        if (err.message.includes("Navigation timeout of 30000 ms exceeded")) {
          if (count === 4) {
            console.log(`Page navigation timeout on: ${url}`);
          }
          count++;
        } else {
          throw err;
        }
      }
    }
    await page.waitForSelector(
      ".coveo-result-list-container.coveo-list-layout-container > .coveo-list-layout.CoveoResult"
    );
    // sleep 1000 seconds
    await page.waitForSelector(".bioz-w-s-badge-container tbody");
    await page.waitForSelector("#bioz-w-product-page-link");
    // sleep 2500 ms
    await new Promise((resolve) => setTimeout(resolve, 2500));

    const results = await page.evaluate(() => {
      const titles = Array.from(
        document.querySelector(
          ".coveo-result-list-container.coveo-list-layout-container"
        ).childNodes
      ).map((item) => ({
        title: (item as Element).querySelector("h3")?.innerText,
        url: (item as Element).querySelector("h3 a").getAttribute("href"),
        innerText: (item as HTMLElement)?.innerText,
        citations: (
          (item as HTMLElement).querySelector("#bioz-w-product-page-link") as
            | undefined
            | HTMLElement
        )?.innerText,
        rating: (
          (item as HTMLElement).querySelector("#bioz-w-product-page-link")
            ?.parentElement?.previousElementSibling
            ?.previousElementSibling as HTMLElement
        )?.innerText,
      }));
      return titles;
    });
    // console.log(results);

    // words that if the title contains, the result is removed
    const blackListedWords = ["dna", "rna", "genomic"];
    const filterText = "This is a Mission Collection Item".toLowerCase();

    // remove any match with the following words
    const filteredResults = results.filter((item) => {
      // if innerText contains "This is a Mission Collection Item", remove it from results array
      if (item.innerText.toLowerCase().includes(filterText)) return false;

      const title = item.title.toLowerCase();
      const matchedAWord = blackListedWords.map((word) => {
        if (title.includes(word)) {
          return false;
        }
        return true;
      });
      return matchedAWord.every((item) => item === true);
    });

    // find the best match in results to the search array words
    const bestMatch = filteredResults
      .sort(({ rating }) => {
        return parseInt(rating) || 0;
      })
      .map((item, index) => {
        const score = index === 0 ? 1 : 0;
        return { ...item, score };
      })
      .sort(({ citations }) => {
        return parseInt(citations) || 0;
      })
      .map((item, index) => {
        const score = item.score + index === 0 ? 2 : 0;
        return { ...item, score };
      })
      .reduce(
        (acc: { score: number; title: string; url: string }, curr, index) => {
          const currTitle = curr.title.toLowerCase();
          let score = curr.score;
          if (currTitle.includes(searchArray[0])) score += 2;

          if (currTitle.includes(searchArray[1])) score += 1;

          // has the highest biostars rating
          if (index === 0 && curr.rating !== undefined) score += 1;

          // rate the score on a scale of 0-100, where 100 is the best match
          // and 0 is the worst match
          // score = Math.ceil((currScore / searchArray.length) * 100);
          // using greater than so early matches are ranked higher
          if (score > acc.score) {
            return { score: score, title: curr.title, url: curr.url };
          }
          return acc;
        },
        { score: 0, title: "", url: "" }
      );

    if (bestMatch.url === "") return null;

    let currentInfo = {
      ...bestMatch,
      url: `https://www.atcc.org${bestMatch.url}`,
      searchUrl: url,
      name: bacteria.unique_name,
      success: true,
    };

    try {
      // go to "url" and get more info

      let count = 0;
      while (count < 10) {
        try {
          await page.goto(`https://www.atcc.org${bestMatch.url}`, {
            waitUntil: "networkidle2",
          });
          break;
        } catch (err) {
          if (err.message.includes("Navigation timeout of 30000 ms exceeded")) {
            if (count === 9) console.log(`Page navigation timeout on: ${url}`);
            count++;
          } else {
            throw err;
          }
        }
      }

      await page.waitForSelector(
        "div.product-information dl.product-information__list"
      );
    } catch (error) {
      console.log(`error on ${bestMatch.url}`);
      return null;
    }

    const info = await page.evaluate(() => {
      const collection1 = Array.from(
        document.querySelector(
          "div.product-information dl.product-information__list"
        ).children
      )?.map((el: HTMLElement) => ({
        node: el.nodeName,
        text: el.innerText,
      }));

      const info1: { title: string; value: string }[] =
        collection1?.reduce((acc, curr) => {
          if (curr.node === "DT") {
            acc.push({ title: curr.text, value: "" });
          } else {
            acc[acc.length - 1].value = curr.text;
          }
          return acc;
        }, []) || [];

      // div.generic-accordion__item-title.generic-accordion__item-title--active h3.generic-accordion__item-title-text
      // find the h3 with innerText "handling information"
      const collection2 = Array.from(
        Array.from(
          document.querySelectorAll("div.generic-accordion__item-title")
        )?.find((el) => {
          // get the h3 element child
          const h3: HTMLElement = (el as HTMLElement).querySelector("h3");
          if (h3?.innerText.toLowerCase() === "handling information") {
            return true;
          }
          return false;
        })?.nextElementSibling?.firstElementChild?.firstElementChild
          ?.firstElementChild?.children
      )?.map((el: HTMLElement) => ({
        node: el.nodeName,
        text: el.innerText?.trim(),
      }));

      const info2: { title: string; value: string }[] =
        collection2?.reduce((acc, curr) => {
          if (curr.node === "DT") {
            acc.push({ title: curr.text, value: "" });
          } else {
            acc[acc.length - 1].value = curr.text;
          }
          return acc;
        }, []) || [];
      // convert to object with key value pairs
      const infoObj = [...info1, ...info2].reduce((acc, curr) => {
        acc[curr.title] = curr.value;
        if (curr.title.toLowerCase() === "type strain") {
          // it will be yes or no convert to boolean
          acc[curr.title] = curr.value.toLowerCase() === "yes" ? true : false;
        }
        if (curr.title.toLowerCase() === "genome sequenced strain") {
          // it will be yes or no convert to boolean
          acc[curr.title] = curr.value.toLowerCase() === "yes" ? true : false;
        }
        return acc;
      }, {});

      return infoObj;
    });
    // merge the info object with the currentInfo object
    const objectToTrim = { ...currentInfo, ...info };
    console.log(objectToTrim);
    // remove all tabs and new lines
    const objectTrimmed = Object.keys(objectToTrim).reduce((acc, curr) => {
      if (typeof objectToTrim[curr] === "string")
        acc[curr] = objectToTrim[curr]?.replace(/\t/g, "")?.replace(/\n/g, "");
      return acc;
    }, {});
    return objectTrimmed;
  } catch (error) {
    // if contains "Navigation timeout of 30000 ms exceeded"
    // log the url and return null
    if (error.message.includes("Navigation timeout of 30000 ms exceeded")) {
      console.log(`Navigation timeout on: ${url}`);
      return null;
    }
    // Waiting for selector
    if (error.message.includes("Waiting for selector")) {
      console.log(`Waiting for selector on: ${url}`);
      return null;
    }
    console.log(error);
    return { url, name: bacteria.unique_name, success: false };
  }
};
