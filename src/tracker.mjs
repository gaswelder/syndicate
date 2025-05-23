import { readFileSync } from "fs";
import { createTransport } from "nodemailer";
import { HOUR, MINUTE } from "time-consts";
import * as timers from "timers/promises";
import * as args from "./args.mjs";
import { Feed } from "./feed.mjs";
import { State } from "./state.mjs";
import { log } from "./log.mjs";

/**
 * Reads feeds list from disk.
 */
function readFeeds() {
  const urls = readFileSync("./feeds.txt")
    .toString()
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("#"));
  return [...new Set(urls).values()];
}

function readConfig() {
  return JSON.parse(readFileSync("./config.json").toString());
}

export async function main() {
  let config = readConfig();

  if (process.argv[2] == "testmail") {
    await sendmail(config, "test mail", {}, "Hello, this is a test mail");
    console.log("Sent a test mail to " + config.mailer.mail.to);
    return;
  }

  args.flag("a", "update all feeds on startup");
  const [params] = args.parse();

  let feedURLs = readFeeds();
  const sendlog = new State(config.sendlog_path);

  // Update all feeds at once if the flag is given.
  if (params.a) {
    for (const feed of feedURLs) {
      await updateFeed(feed, config, sendlog);
    }
  }

  // Reread the feeds list from time to time.
  setInterval(function () {
    feedURLs = readFeeds();
  }, 10 * MINUTE);

  // Loop through all feeds one by one, a full circle is 12 hours.
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
    await timers.setTimeout((12 * HOUR) / feedURLs.length);
  }
}

/**
 * Updates the given feed, sends new items to email.
 */
async function updateFeed(url, config, state) {
  // Download the feed.
  const feed = new Feed(url);
  const items = await feed.list();
  const title = await feed.title();

  // Find the new items.
  const seenIds = state.getItems(url);
  const newItems = items.filter((item) => !seenIds.includes(item.id()));
  log.info(`${title}: ${newItems.length} new`);

  // Send out the new items.
  newItems.sort((a, b) => a.pubDate().getTime() - b.pubDate().getTime());
  for (const item of newItems) {
    const subject = `${title}: ${item.title()}`;
    log.info(subject);
    await sendmail(config, subject, { Date: item.pubDate() }, item.toHTML());
  }

  // Save the new seen list.
  state.setItems(
    url,
    items.map((x) => x.id())
  );
}

const sendmail = async (config, subject, headers, html) => {
  const transporter = createTransport(config.mailer.transport);
  return transporter.sendMail({
    ...config.mailer.mail,
    subject,
    headers,
    html,
  });
};
