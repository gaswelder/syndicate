const rssParser = require("rss-parser");
const nodemailer = require("nodemailer");
const fs = require("fs");

const sleep = ms => new Promise(done => setTimeout(done, ms));

class SendLog {
  constructor(filepath) {
    this.filepath = filepath;
    this.load();
  }

  load() {
    if (!fs.existsSync(this.filepath)) {
      this.set = new Set();
      return;
    }
    const items = fs
      .readFileSync(this.filepath)
      .toString()
      .split("\n");
    this.set = new Set(items);
  }

  flush() {
    const keys = [...this.set.keys()];
    fs.writeFileSync(this.filepath, keys.join("\n"));
  }

  has(key) {
    return this.set.has(key);
  }

  add(key) {
    this.set.add(key);
    this.flush();
  }
}

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
      html: itemContent(message)
    });

    if (message.enclosure) {
      const f = message.enclosure;
      mail.html =
        `<h2>The enclosure</h2>
      <p><a href="${f.url}">${f.url}</a></p>
      ` + mail.html;
    }

    transporter.sendMail(mail, (error, info) => {
      if (error) return fail(error);
      ok(info);
    });
  });
}

function itemContent(item) {
  if (item.content) return item.content;
  if (item.summary) return item.summary._;
  return "";
}

main();
