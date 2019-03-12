const rssParser = require("rss-parser");
const FeedItem = require("./feed-item");

class Feed {
  constructor(url) {
    this.url = url;
  }

  // Private.
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
          item: ["summary", ["category", "categories", { keepArray: true }]]
        }
      });
      this.cache = await parser.parseURL(this.url);
    }
    return this.cache;
  }

  // Returns the current list of feed's posts.
  async list() {
    return (await this.data()).items.map(i => new FeedItem(i));
  }

  // Returns the feed's title.
  async title() {
    return (await this.data()).title;
  }
}

module.exports = Feed;
