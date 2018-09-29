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

function itemID(item) {
  const id = item.guid || item.id;
  if (!id) throw new Error("can't find message id in the data");
  return id;
}

// A tracker function for a single feed.
async function track(sub, config, sendlog) {
  for (;;) {
    const parser = new rssParser({
      headers: {
        Accept: "application/rss+xml, application/xml"
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
    await sleep(100000);
  }
}

// title, link, pubDate, content, enclosure{url, length, type}
function send(message, feed, config) {
  return new Promise((ok, fail) => {
    const transporter = nodemailer.createTransport(config.mailer.transport);
    const subject = `${feed.title}: ${message.title}`;
    log(subject);
    const mail = Object.assign({}, config.mailer.mail, {
      subject,
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
