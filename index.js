const rssParser = require("rss-parser");
const nodemailer = require("nodemailer");
const config = require("./config.json");

const sleep = ms => new Promise(done => setTimeout(done, ms));

// The main function just launches a separate tracker
// for each defined RSS feed.
function main() {
  config.feeds.forEach(track);
}

const sent = [];

function unsent(item) {
  return sent.indexOf(item.guid) == -1;
}

// A tracker function for a single feed.
async function track(sub) {
  for (;;) {
    const rss = await new rssParser().parseURL(sub);
    rss.items
      .filter(unsent)
      .slice(0, 1)
      .forEach(send);
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
      sent.push(message.guid);
      ok(info);
    });
  });
}

main();
