const nodemailer = require("nodemailer");
const fs = require("fs");
const Feed = require("./feed");
const SendLog = require("./sendlog");
const args = require("./args");
const log = require("./log");

const sleep = ms => new Promise(done => setTimeout(done, ms));

function readFeeds() {
  const urls = fs
    .readFileSync("./feeds.txt")
    .toString()
    .split("\n")
    .map(s => s.trim())
    .filter(s => s.length > 0);
  return urls;
}

function readConfig() {
  return JSON.parse(fs.readFileSync("./config.json").toString());
}

const time = {
  Minute: 60 * 1000,
  Hour: 3600 * 1000
};

function main() {
  args.flag("a", "update all feeds on startup").parse(async function(params) {
    let config = readConfig();
    let feeds = readFeeds();
    const sendlog = new SendLog(config.sendlog_path);

    // Update all feeds at once if the flag is given.
    if (params.a) {
      for (const feed of feeds) {
        await updateFeed(feed, config, sendlog);
      }
    }

    // Reread the feeds list from time to time so that we don't
    // have to stop the process to add or remove a feed.
    setInterval(function() {
      feeds = readFeeds();
    }, 10 * time.Minute);

    // Distribute all feeds in time so that each is updated on its
    // own time, but with the same interval.
    let currentIndex = -1;
    for (;;) {
      if (feeds.length == 0) {
        process.stderr.write("No feeds to process.\n");
        process.exit(1);
      }
      await sleep((12 * time.Minute) / feeds.length);
      currentIndex = (currentIndex + 1) % feeds.length;
      const sub = feeds[currentIndex];
      log(`updading ${sub}`);
      try {
        await updateFeed(sub, config, sendlog);
      } catch (error) {
        log(`error: ${sub}: ${error.message}`);
      }
    }
  });
}

// Makes a single update from the given feed,
// sending the new items to the email.
async function updateFeed(sub, config, sendlog) {
  const feed = new Feed(sub);
  const items = await feed.list();

  const newItems = items.filter(function(item) {
    return !sendlog.has(item.id());
  });
  log(`${await feed.title()}: ${newItems.length} new`);
  for (const item of newItems) {
    await send(item, feed, config);
    sendlog.add(item.id());
  }
}

// title, link, pubDate, content, enclosure{url, length, type}
function send(message, feed, config) {
  return new Promise(async (ok, fail) => {
    const transporter = nodemailer.createTransport(config.mailer.transport);
    const subject = `${await feed.title()}: ${message.title()}`;
    log(subject);
    const mail = Object.assign({}, config.mailer.mail, {
      subject,
      headers: {
        Date: message.pubDate
      },
      html: message.toHTML()
    });

    transporter.sendMail(mail, (error, info) => {
      if (error) return fail(error);
      ok(info);
    });
  });
}

module.exports = main;
