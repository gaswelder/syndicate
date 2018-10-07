const rssParser = require("rss-parser");
const FeedItem = require("./feed-item");

class Feed {
  constructor(url) {
    this.url = url;
  }

  async data() {
    if (!this.cache) {
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
      this.cache = await parser.parseURL(this.url);
    }
    return this.cache;
  }

  async list() {
    return (await this.data()).items.map(i => new FeedItem(i));
  }

  async title() {
    return (await this.data()).title;
  }
}

module.exports = Feed;
