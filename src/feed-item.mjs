export class FeedItem {
  constructor(data) {
    this.data = data;
  }

  // Returns the post's stable identifier.
  // Stable means it shouldn't change over time.
  id() {
    const item = this.data;
    const onlyString = (x) => (typeof x == "string" ? x : null);
    const id = [item.guid, item.id, item.link]
      .map(onlyString)
      .filter((x) => x)[0];

    if (!id) throw new Error("can't find message id in the data");
    return id;
  }

  pubDate() {
    return new Date(this.data.pubDate);
  }

  // Returns the post's title.
  title() {
    return this.data.title;
  }

  // Returns the post's attachment URL, if it exists.
  attachment() {
    if (!this.data.enclosure) return null;
    return this.data.enclosure;
  }

  // Returns the post's web link ("read online").
  link() {
    const link = this.data.link;
    // Some feeds omit schema from the URL.
    // In that case assume https.
    if (link.startsWith("//")) {
      return "https:" + link;
    }
    return link;
  }

  // Returns the post's tags, if any, as array of strings.
  tags() {
    if (!this.data.categories) return [];
    return this.data.categories.map((e) => (e.$ ? e.$.term : e));
  }

  // Returns HTML email body for the given RSS item.
  toHTML() {
    const item = this.data;
    const parts = [];
    if (item.link) {
      parts.push(
        `<p>Post link: <a href="${this.link()}">${this.link()}</a></p>`
      );
    }
    if (this.tags()) {
      parts.push(`<p>Tags: ${this.tags().join(", ")}</p>`);
    }
    if (item.enclosure) {
      const f = item.enclosure;
      parts.push(`<p>Enclosure: <a href="${f.url}">${f.url}</a></p>`);
    }
    parts.push(itemContent(item));
    return parts.join("");
  }
}

function itemContent(item) {
  if (item.content) return item.content;
  if (item.summary) return item.summary._;
  return "";
}
