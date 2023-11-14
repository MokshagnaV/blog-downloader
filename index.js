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

function createRootFolder(title, firstTime) {
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
    if (firstTime) fs.mkdirSync(paths.refs);
    return paths;
  } catch (err) {
    if (err.code === "ENOENT") {
      throw new Error("File doesn't exist or specify correct path");
    }
    throw err;
  }
}

async function downloadPage(url, dest = "", firstTime = true) {
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
    const directories = createRootFolder(path.join(dest, title), firstTime);

    // >>>>>>>>>>>>>>>>Downloading all the css files
    gatherFiles(CSS);

    // >>>>>>>>>>>>>>>>Downloading all the js files
    gatherFiles(JS);

    // >>>>>>>>>>>>>>>>Downloading all the js files
    gatherFiles(IMG);
    let referenceLinks;
    if (firstTime) {
      referenceLinks = crawlReferenceLinks(document);
    }

    let res;
    if (referenceLinks) {
      res = await Promise.all(
        referenceLinks.map((ref) =>
          downloadPage(ref.address, directories.refs, false)
        )
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

// Downloader.downloadPage(
//   "https://www.theodinproject.com/lessons/nodejs-express-102-crud-and-mvc",
//   "/home/mokshagna/Downloads"
// );

function downloadAllPages(pages, location, dirName = "Collection") {
  try {
    const path = location + "/" + dirName;
    fs.mkdirSync(path);
    downloadPage(pages[0], path);
    const msg = "downloading " + pages[0] + " is started";
    console.log(msg);
    log(msg);

    for (let i = 1; i < pages.length; i++) {
      setTimeout(() => {
        downloadPage(pages[i], path);
        const msg = "downloading " + pages[i] + " is started";
        console.log(msg);
        log(msg);
      }, i * 10 * 1000);
    }
  } catch (error) {
    log(error.stack);
  }
}

const pages = [
  "https://www.theodinproject.com/lessons/nodejs-introduction-to-express",
  "https://www.theodinproject.com/lessons/nodejs-express-101",
  "https://www.theodinproject.com/lessons/nodejs-express-102-crud-and-mvc",
  "https://www.theodinproject.com/lessons/nodejs-mini-message-board",
  "https://www.theodinproject.com/lessons/nodejs-deployment",
  "https://www.theodinproject.com/lessons/nodejs-express-103-routes-and-controllers",
  "https://www.theodinproject.com/lessons/nodejs-express-104-view-templates",
  "https://www.theodinproject.com/lessons/nodejs-express-105-forms-and-deployment",
  "https://www.theodinproject.com/lessons/nodejs-inventory-application",
];

downloadAllPages(
  pages,
  "/home/mokshagna/Downloads",
  "Odin_Project_MongoDB_Mongoose"
);
