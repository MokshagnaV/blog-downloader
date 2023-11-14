const { parse } = require("node-html-parser");
const { log } = require("./logger");
const { URL } = require("url");
const axios = require("axios");
let times = 1;
let urls = [];
function saveLink(url) {
  if (times === 10) return;
  axios.get(url).then((res) => {
    times++;
    urls.push(url);
    log(url);
    console.log(url);
    const link = new URL(url);
    const origin = link.origin;
    const { data } = res;
    const doc = parse(data);
    const nextPage =
      origin +
      doc
        .querySelector("a[data-test-id='next-lesson-btn']")
        .getAttribute("href");
    saveLink(nextPage);
  });
}

// This will log next n number of links in odin project sections
saveLink(
  "https://www.theodinproject.com/lessons/nodejs-introduction-to-express"
);

console.log(urls);
urls.forEach((url) => log(url));
