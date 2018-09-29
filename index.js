const rssParser = require("rss-parser");
const nodemailer = require("nodemailer");
const config = require("./config.json");
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

const log = new SendLog(config.sendlog_path);

// The main function just launches a separate tracker
// for each defined RSS feed.
function main() {
  config.feeds.forEach(track);
}

// A tracker function for a single feed.
async function track(sub) {
  for (;;) {
    const parser = new rssParser({
      headers: {
        Accept: "application/rss+xml, application/xml"
      }
    });
    const rss = await parser.parseURL(sub);
    for (const item of rss.items) {
      if (log.has(item.guid)) {
        continue;
      }
      await send(item);
      log.add(item.guid);
    }
    await sleep(100000);
  }
}

// title, link, pubDate, content, enclosure{url, length, type}
function send(message) {
  return new Promise((ok, fail) => {
    console.log("send", message.title);
    const transporter = nodemailer.createTransport(config.mailer.transport);

    const mail = Object.assign({}, config.mailer.mail, {
      subject: message.title,
      html: message.content
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

main();
