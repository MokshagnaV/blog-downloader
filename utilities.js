const fs = require("fs");
const axios = require("axios");
const { URL } = require("url");
const { axiosLog, log } = require("./logger");

async function getHTML(url) {
  try {
    const res = await axios.get(url);
    return res;
  } catch (error) {
    axiosLog(error);
  }
}

function crawlReferenceLinks(document) {
  const lessonContent = document.querySelector(".lesson-content");
  if (!lessonContent) return;
  const links = lessonContent.querySelectorAll("a");
  let references = [];
  links.forEach((link) => {
    const src = link.getAttribute("href");
    // Checking for external links skipping internal section reference links (eg:#section1)
    if (src && src.includes("https"))
      references.push({ address: link.getAttribute("href"), DOM: link });
  });
  // removing yt links
  references = references.filter((r) => {
    const url = new URL(r.address);
    return url.hostname !== "www.youtube.com";
  });
  return references;
}

async function downloadAndSaveFile(link, fileName) {
  try {
    const { data } = await axios.get(link);

    fs.writeFile(fileName, data, (err) => {
      if (err) log(err.stack);
      log("Downloaded file", fileName);
    });
  } catch (error) {
    axiosLog(error);
  }
}

async function downloadAndSaveImage(link, fileName) {
  try {
    const { data } = await axios.get(link, { responseType: "stream" });
    data.pipe(fs.createWriteStream(fileName));
    log("Downloaded file", fileName);
  } catch (error) {
    axiosLog(error);
  }
}

function downloadFile(type, link, path) {
  if (type === "img") {
    downloadAndSaveImage(link, path);
  } else {
    downloadAndSaveFile(link, path);
  }
}

function generateLinkForRelativePaths(origin, path) {
  return new URL(`${origin}${path}`).href;
}

function getFileName(link) {
  link = new URL(link);
  const paths = link.pathname.split("/");
  const fileName = paths[paths.length - 1];
  return fileName;
}

function setRelativePath(file, src, type, fileName) {
  file.setAttribute(src, `./${type}/${fileName}`);
}

function generateDirectoryPath(type, fileName) {
  return `${type}/${fileName}`;
}

module.exports = {
  getHTML,
  crawlReferenceLinks,
  downloadFile,
  generateLinkForRelativePaths,
  generateDirectoryPath,
  getFileName,
  setRelativePath,
};
