const nodemailer = require("nodemailer");
const fs = require("fs");
const Feed = require("./feed");
const State = require("./state");
const args = require("./args");
const time = require("time-consts");

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

/**
 * Reads feeds list from disk.
 */
function readFeeds() {
  const urls = fs
    .readFileSync("./feeds.txt")
    .toString()
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return [...new Set(urls).values()];
}

function readConfig() {
  return JSON.parse(fs.readFileSync("./config.json").toString());
}

async function main() {
  let config = readConfig();

  if (process.argv[2] == "testmail") {
    await sendmail(config, "test mail", {}, "Hello, this is a test mail");
    console.log("Sent a test mail to " + config.mailer.mail.to);
    return;
  }

  const [params] = args.flag("a", "update all feeds on startup").parse();

  let feedURLs = readFeeds();
  const sendlog = new State(config.sendlog_path, feedURLs);

  // Update all feeds at once if the flag is given.
  if (params.a) {
    for (const feed of feedURLs) {
      await updateFeed(feed, config, sendlog);
    }
  }

  // Reread the feeds list from time to time so that we don't
  // have to stop the process to add or remove a feed.
  setInterval(function () {
    feedURLs = readFeeds();
  }, 10 * time.MINUTE);

  // Distribute all feeds in time so that each is updated on its
  // own time, but with the same interval.
  let currentIndex = -1;
  for (;;) {
    if (feedURLs.length == 0) {
      process.stderr.write("No feeds to process.\n");
      process.exit(1);
    }
    currentIndex = (currentIndex + 1) % feedURLs.length;
    const sub = feedURLs[currentIndex];
    try {
      await updateFeed(sub, config, sendlog);
    } catch (error) {
      log.error(`${sub}: ${error.message}`);
    }
    await sleep((12 * time.HOUR) / feedURLs.length);
  }
}

/**
 * Updages given feed, sends new items to email.
 *
 * @param {string} url
 * @param {*} config
 * @param {Sendlog} state
 */
async function updateFeed(url, config, state) {
  const feed = new Feed(url);
  const items = await feed.list();
  const ids = items.map((x) => x.id());

  // see what items are new
  const newIds = state.addedItems(url, ids);
  const newItems = items.filter((item) => newIds.includes(item.id()));
  log.info(`${await feed.title()}: ${newItems.length} new`);
  if (newItems.length == 0) {
    return;
  }

  // send all items
  newItems.sort((a, b) => a.pubDate().getTime() - b.pubDate().getTime());
  for (const item of newItems) {
    const subject = `${await feed.title()}: ${item.title()}`;
    log.info(subject);
    await sendmail(config, subject, { Date: item.pubDate() }, item.toHTML());
  }

  // update the feed's state
  state.updateItems(url, ids);
}

const sendmail = async (config, subject, headers, html) => {
  const transporter = nodemailer.createTransport(config.mailer.transport);
  return transporter.sendMail({
    ...config.mailer.mail,
    subject,
    headers,
    html,
  });
};

const log = {
  error(msg) {
    process.stdout.write(
      JSON.stringify({ level: "error", msg, t: new Date().toISOString() }) +
        "\n"
    );
  },
  info(msg) {
    process.stdout.write(
      JSON.stringify({ level: "info", msg, t: new Date().toISOString() }) + "\n"
    );
  },
};

module.exports = main;
