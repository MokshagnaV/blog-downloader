const fs = require("fs");
const axios = require("axios");
const { parse } = require("node-html-parser");
const { URL } = require("url");
const path = require("path");
const { rimrafSync } = require("rimraf");
const { log } = require("./logger");
const {
  crawlReferenceLinks,
  generateLinkForRelativePaths,
  getFileName,
  setRelativePath,
  generateDirectoryPath,
  downloadFile,
  getHTML,
} = require("./utilities");

const QUERIES = {
  css: { q: "link[rel='stylesheet'],link[as='style']", src: "href" },
  js: { q: "script", src: "src" },
  img: { q: "img", src: "src" },
};

const CSS = "css";
const JS = "js";
const IMG = "img";

let firstTime = false;

function createRootFolder(title) {
  /* This function is used to create folder structure for the page
     Root (title)
      - css
      - js
      - img
      - references
      index.html
    returns the path for each folder
  */
  const paths = {
    root: title,
    css: `${title}/css`,
    js: `${title}/js`,
    img: `${title}/img`,
    refs: `${title}/references`,
  };
  try {
    if (fs.existsSync(paths.root)) {
      rimrafSync(paths.root);
    }
    fs.mkdirSync(paths.root);
    fs.mkdirSync(paths.css);
    fs.mkdirSync(paths.js);
    fs.mkdirSync(paths.img);
    if (!firstTime) fs.mkdirSync(paths.refs);
    return paths;
  } catch (err) {
    if (err.code === "ENOENT") {
      throw new Error("File doesn't exist or specify correct path");
    }
    throw err;
  }
}

async function downloadPage(url, dest = "") {
  try {
    const { data, responseUrl } = await getHTML(url);
    url = new URL(responseUrl);
    const origin = url.origin;
    // const data = fs.readFileSync("test.html", { encoding: "utf-8" });
    const document = parse(data);

    function saveHTML(data) {
      fs.writeFile(path.join(directories.root, "index.html"), data, (err) => {
        if (err) throw err;
        log("HTML file creation DONE!");
      });
    }

    function gatherFiles(type) {
      const query = QUERIES[type].q;
      const src = QUERIES[type].src;

      let tags = document.querySelectorAll(query);

      tags = tags.filter((tag) => {
        const source = tag.getAttribute(src);
        if (!source) return false;
        if (source.charAt(0) === "/") return true;
        else {
          const link = new URL(source);
          return link.host.includes("cdn");
        }
      });

      tags.forEach((tag) => {
        const source = tag.getAttribute(src);
        if (source.charAt(0) === "/") {
          const link = generateLinkForRelativePaths(origin, source);
          const fileName = getFileName(link);
          setRelativePath(tag, src, type, fileName);
          const directoryPath = generateDirectoryPath(
            directories[type],
            fileName
          );
          downloadFile(type, link, directoryPath);
        } else {
          const fileName = getFileName(source);
          setRelativePath(tag, src, type, fileName);
          const directoryPath = generateDirectoryPath(
            directories[type],
            fileName
          );
          downloadFile(type, source, directoryPath);
        }
      });
    }

    // >>>>>>>>>>>>>>Creating a root folder
    const title = document.querySelector("title").innerText.trim();
    const directories = createRootFolder(path.join(dest, title));

    // >>>>>>>>>>>>>>>>Downloading all the css files
    gatherFiles(CSS);

    // >>>>>>>>>>>>>>>>Downloading all the js files
    gatherFiles(JS);

    // >>>>>>>>>>>>>>>>Downloading all the js files
    gatherFiles(IMG);
    let referenceLinks;
    if (!firstTime) {
      referenceLinks = crawlReferenceLinks(document);
      firstTime = true;
    }

    let res;
    if (referenceLinks) {
      res = await Promise.all(
        referenceLinks.map((ref) => downloadPage(ref.address, directories.refs))
      );
    }
    if (res) {
      for (let i = 0; i < referenceLinks.length; i++) {
        const ref = referenceLinks[i];
        ref.DOM.setAttribute(
          "href",
          `./references/${encodeURIComponent(res[i])}/index.html`
        );
      }
    }
    saveHTML(document.toString());
    log("saved html", title);
    return title;
  } catch (error) {
    log(error.stack);
  }
}

downloadPage(
  "https://www.theodinproject.com/lessons/nodejs-express-102-crud-and-mvc",
  "/home/mokshagna/Downloads"
);

// fs.readFile(
//   "/home/mokshagna/Downloads/Express 102: CRUD and MVC | The Odin Project/references/What is MVC, and how is it like a sandwich shop?/index.html",
//   (err, data) => {
//     if (err) log(err.stack);
//     const doc = parse(data);
//     const css = doc.querySelectorAll(QUERIES.css.q);
//     css.forEach((c) => console.log(c.getAttribute("href")));
//   }
// );

// console.log(
//   encodeURIComponent(
//     "Express 102: CRUD and MVC | The Odin Project/references/What is MVC, and how is it like a sandwich shop?/index.html"
//   )
// );
