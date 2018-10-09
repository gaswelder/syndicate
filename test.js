const assert = require("assert");
const Feed = require("./src/feed");

const feeds = [
  "https://murze.be/feed",
  "http://feeds.twit.tv/sn.xml",
  "https://changelog.com/gotime/feed",
  "https://research.swtch.com/feed.atom"
].map(url => new Feed(url));

describe("should get non-empty list for every feed", function() {
  for (const f of feeds) {
    it(f.url, async function() {
      this.timeout(10000);
      const items = await f.list();
      assert.ok(items.length > 0);
    });
  }
});

describe("item id", function() {
  it("should be unique", async function() {
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

describe("item", function() {
  it("should have canonical url", async function() {
    const feed = new Feed("http://blog.golang.org/feed.atom");
    const items = await feed.list();
    for (const item of items) {
      assert.ok(item.link().startsWith("https://"));
    }
  });
});
