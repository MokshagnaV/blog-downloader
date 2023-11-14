const fs = require("fs");

function log(...msg) {
  const date = new Date();
  msg = msg.join(" ");
  msg = date.toLocaleString() + " - " + msg + "\n";
  fs.appendFile("Log.log", msg, (err) => {
    if (err) console.log(err);
  });
}

function axiosLog(error) {
  if (error.response) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    log(error.response.statusText, "- URL -", error.response.config.url);
  } else if (error.request) {
    // The request was made but no response was received
    // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
    // http.ClientRequest in node.js
    log("request - ", error.request);
  } else {
    // Something happened in setting up the request that triggered an Error
    log("message - ", error.message);
  }
  log("config - ", JSON.stringify(error.config));
}

module.exports.log = log;
module.exports.axiosLog = axiosLog;
