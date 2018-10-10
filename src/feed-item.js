class FeedItem {
  constructor(data) {
    this.data = data;
  }

  // Returns the feed item's stable identifier.
  id() {
    const item = this.data;
    const onlyString = x => (typeof x == "string" ? x : null);
    const id = [item.guid, item.id, item.link]
      .map(onlyString)
      .filter(x => x)[0];

    if (!id) throw new Error("can't find message id in the data");
    return id;
  }

  title() {
    return this.data.title;
  }

  attachment() {
    if (!this.data.enclosure) return null;
    return this.data.enclosure;
  }

  link() {
    const link = this.data.link;
    // Some feeds omit schema from the URL.
    // In that case assume https.
    if (link.startsWith("//")) {
      return "https:" + link;
    }
    return link;
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

module.exports = FeedItem;
