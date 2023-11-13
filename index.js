const fs = require("fs");
const axios = require("axios");
const { parse } = require("node-html-parser");
const { URL } = require("url");
const path = require("path");
const { rimrafSync } = require("rimraf");

const QUERIES = {
  css: { q: "link[rel='stylesheet']", src: "href" },
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

async function downloadAndSaveFile(link, fileName) {
  try {
    const { data } = await axios.get(link);

    fs.writeFile(fileName, data, (err) => {
      if (err) throw err;
      console.log("Downloaded file", fileName);
    });
  } catch (error) {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      fs.createWriteStream("Log.log", error.response);
    } else if (error.request) {
      // The request was made but no response was received
      // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
      // http.ClientRequest in node.js
      fs.createWriteStream("Log.log", error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      fs.createWriteStream("Log.log", error.message);
    }
    console.log(error.config);
  }
}

function crawlReferenceLinks(document) {
  const lessonContent = document.querySelector(".lesson-content");
  if (!lessonContent) return;
  const links = lessonContent.querySelectorAll("a");
  let references = [];
  links.forEach((link) => {
    const src = link.getAttribute("href");
    if (src && src.includes("https"))
      references.push({ address: link.getAttribute("href"), DOM: link });
  });
  references = references.filter((r) => {
    const url = new URL(r.address);
    return url.hostname !== "www.youtube.com";
  });
  return references;
}

async function downloadPage(url, dest = "") {
  try {
    url = new URL(url);
    const origin = url.origin;
    const { data } = await axios.get(url.href);
    // const data = fs.readFileSync("test.html", { encoding: "utf-8" });
    const document = parse(data);

    function saveHTML(data) {
      fs.writeFile(path.join(directories.root, "index.html"), data, (err) => {
        if (err) throw err;
        console.log("HTML file creation DONE!");
      });
    }

    function gatherFiles(type) {
      const query = QUERIES[type].q;
      const src = QUERIES[type].src;

      const Files = document.querySelectorAll(query);

      Files.forEach((file) => {
        const source = file.getAttribute(src);
        if (source && source.charAt(0) === "/") {
          const link = new URL(`${origin}${source}`);
          const paths = link.pathname.split("/");
          const fileName = paths[paths.length - 1];
          file.setAttribute(src, `./${type}/${fileName}`);
          downloadAndSaveFile(link.href, `${directories[type]}/${fileName}`);
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
        ref.DOM.setAttribute("href", `./references/${res[i]}/index.html`);
      }
    }
    saveHTML(document.toString());
    console.log("saved html", title);
    return title;
  } catch (error) {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      fs.createWriteStream("Log.log", error.response);
    } else if (error.request) {
      // The request was made but no response was received
      // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
      // http.ClientRequest in node.js
      fs.createWriteStream("Log.log", error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      fs.createWriteStream("Log.log", error.message);
    }
    console.log(error.config);
  }
}

downloadPage(
  "https://www.theodinproject.com/lessons/nodejs-express-102-crud-and-mvc"
);
