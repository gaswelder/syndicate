const nodemailer = require("nodemailer");
const fs = require("fs");
const Feed = require("./feed");
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
