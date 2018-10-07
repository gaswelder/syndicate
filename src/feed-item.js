class FeedItem {
  constructor(data) {
    this.data = data;
  }

  // Returns the feed item's stable identifier.
  id() {
    const item = this.data;
    const id = item.guid || item.id;
    if (!id) throw new Error("can't find message id in the data");
    return id;
  }

  title() {
    return this.data.title;
  }

  // Returns HTML email body for the given RSS item.
  toHTML() {
    const item = this.data;
    const parts = [];
    if (item.link) {
      parts.push(
        `<h2>Post link</h2><p><a href="${item.link}">${item.link}</a></p>`
      );
    }
    if (item.enclosure) {
      const f = item.enclosure;
      parts.push(`<h2>Enclosure</h2><p><a href="${f.url}">${f.url}</a></p>`);
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
