require("dotenv").config();
const Nightmare = require("nightmare");
const scrapeProducts = require("./get_products");

const buk = Nightmare({
  show: true,
  webPreferences: {
    partition: "persist: testing"
  }
});

module.exports = async () => {
  try {
    await buk.goto(process.env.URL);

    let ul = await buk.exists(process.env.NAV);

    while (!ul) {
      ul = await buk.exists(process.env.NAV);
    }

    let links = await buk.evaluate(href => {
      let lists = document.querySelectorAll(href);
      let links = [];
      for (let list of lists) {
        let link = list.getAttribute("href");
        if (!link.includes("publishing")) {
          links[links.length] = link;
        }
      }
      return links;
    }, process.env.HREF);

    for (let link of links) {
      let tag = link.split('/').slice(-1)[0]

      await buk.goto(link);

      let content = await buk.exists(process.env.HOME);

      while (!content) {
        content = await buk.exists(process.env.HOME);
      }

      console.log(link);

      let bukExists = await buk.exists(process.env.TEXT);

      if (bukExists) {
        let num = await buk.evaluate(
          text => document.querySelector(text).textContent,
          process.env.TEXT
        );
        let numArr = num.split(" ");
        let prodLength = 1 + Number(numArr[3]) - Number(numArr[1]);
        let part = numArr[3];
        let nowPart = numArr[3];
        let total = numArr[5];
        let hal = 1;

        console.log(`${part} dari ${total} hal ${hal}`);

        await scrapeProducts(buk, prodLength, tag);

        while (Number(part) < Number(total)) {
          hal++;
          await buk.goto(`${link}?page=${hal}`);
          bukExists = await buk.exists(process.env.TEXT);
          while (!bukExists) {
            bukExists = await buk.exists(process.env.TEXT);
          }
          num = await buk.evaluate(
            text => document.querySelector(text).textContent,
            process.env.TEXT
          );
          numArr = num.split(" ");
          prodLength = 1 + Number(numArr[3]) - Number(numArr[1]);
          nowPart = numArr[3];
          total = numArr[5];

          while (part === nowPart) {
            num = await buk.evaluate(
              text => document.querySelector(text).textContent,
              process.env.TEXT
            );
            numArr = num.split(" ");
            prodLength = 1 + Number(numArr[3]) - Number(numArr[1]);
            nowPart = numArr[3];
            total = numArr[5];
          }

          part = nowPart;

          console.log(`${part} dari ${total} hal ${hal}`);

          await scrapeProducts(buk, prodLength, tag);
        }
      }
    }

    await buk.end();
  } catch (err) {
    console.log(err);
  }
}
