const assert = require("assert");
const Feed = require("./src/feed");

const feeds = [
  "https://murze.be/feed",
  "http://feeds.twit.tv/sn.xml",
  "https://changelog.com/gotime/feed",
  "https://research.swtch.com/feed.atom",
].map((url) => new Feed(url));

describe("should get non-empty list for every feed", function () {
  for (const f of feeds) {
    it(f.url, async function () {
      this.timeout(10000);
      const items = await f.list();
      assert.ok(items.length > 0);
    });
  }
});

describe("item id", function () {
  it("should be unique", async function () {
    const ids = [];
    for (const f of feeds) {
      const items = await f.list();
      for (const i of items) {
        ids.push(i.id());
      }
    }
    assert.strictEqual(ids.length, new Set(ids).size);
  });
});

describe("item", function () {
  it("should have canonical url", async function () {
    const feed = new Feed("http://blog.golang.org/feed.atom");
    const items = await feed.list();
    for (const item of items) {
      assert.ok(item.link().startsWith("https://"));
    }
  });

  it("should return a publication date", async function () {
    const feed = feeds[0];
    const [item] = await feed.list();
    const pubDate = item.pubDate();
    assert.ok(pubDate instanceof Date);
    assert.ok(!isNaN(pubDate.getTime()));
  });

  it("should return attachment url", async function () {
    const feed = new Feed("http://feeds.feedburner.com/se-radio");
    const items = await feed.list();
    assert.ok(items.some((i) => i.attachment() !== null));
  });

  it("should return tags", async function () {
    const feed = feeds[1];
    const items = await feed.list();
    const tags = items[0].tags();
    assert.ok(Array.isArray(tags));
    assert.ok(tags.length > 0);
  });

  it("should return an html rendering", async function () {
    const feed = feeds[0];
    const items = await feed.list();
    const post = items[0];
    const html = post.toHTML();
    assert.ok(html.indexOf("<p>Tags:") > 0);
  });
});
