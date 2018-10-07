const rssParser = require("rss-parser");
const nodemailer = require("nodemailer");
const fs = require("fs");
const SendLog = require("./sendlog");

const sleep = ms => new Promise(done => setTimeout(done, ms));

function stamp() {
  return new Date()
    .toISOString()
    .split(".")[0]
    .replace("T", " ");
}

function log(msg) {
  process.stdout.write(stamp() + "\t" + msg + "\n");
}

// The main function just launches a separate tracker
// for each defined RSS feed.
function main() {
  const config = JSON.parse(fs.readFileSync("./config.json").toString());
  const sendlog = new SendLog(config.sendlog_path);
  for (const sub of config.feeds) {
    track(sub, config, sendlog);
  }
}

// Continuously tracks a single feed.
async function track(sub, config, sendlog) {
  for (;;) {
    try {
      await updateFeed(sub, config, sendlog);
    } catch (error) {
      log(`error: ${sub}: ${error.message}`);
    }

    // Spread feed updates in time to avoid load spikes.
    const delay = Math.round((12 + (Math.random() - 0.5)) * 100) / 100;
    await sleep(delay * 3600 * 1000);
  }
}

// Makes a single update from the given feed,
// sending the new items to the email.
async function updateFeed(sub, config, sendlog) {
  // Some servers insist that they serve application/xml
  // and return 406 error (content mismatch) for the parser's
  // default application/rss+xml.
  const parser = new rssParser({
    headers: {
      Accept: "application/rss+xml, application/xml"
    },
    customFields: {
      item: ["summary"]
    }
  });
  const rss = await parser.parseURL(sub);
  const newItems = rss.items.filter(function(item) {
    return !sendlog.has(itemID(item));
  });
  log(`${rss.title}: ${newItems.length} new`);
  for (const item of newItems) {
    await send(item, rss, config);
    sendlog.add(itemID(item));
  }
}

// Returns the feed item's stable identifier.
function itemID(item) {
  const id = item.guid || item.id;
  if (!id) throw new Error("can't find message id in the data");
  return id;
}

// title, link, pubDate, content, enclosure{url, length, type}
function send(message, feed, config) {
  return new Promise((ok, fail) => {
    const transporter = nodemailer.createTransport(config.mailer.transport);
    const subject = `${feed.title}: ${message.title}`;
    log(subject);
    const mail = Object.assign({}, config.mailer.mail, {
      subject,
      headers: {
        Date: message.pubDate
      },
      html: composeMail(message)
    });

    transporter.sendMail(mail, (error, info) => {
      if (error) return fail(error);
      ok(info);
    });
  });
}

// Returns HTML email body for the given RSS item.
function composeMail(item) {
  const parts = [];
  if (item.link) {
    parts.push(
      `<h2>Post link</h2><p><a href="${item.link}">${item.link}</a></p>`
    );
  }
  if (item.enclosure) {
    const f = item.enclosure;
    parts.push(`<h2>Enclosure</h2><p><a href="${f.url}">${f.url}</a></p>`);
  }
  parts.push(itemContent(item));
  return parts.join("");
}

function itemContent(item) {
  if (item.content) return item.content;
  if (item.summary) return item.summary._;
  return "";
}

module.exports = main;
