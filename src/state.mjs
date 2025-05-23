import * as fs from "fs";

const ts = () => new Date().toISOString();

export class State {
  constructor(filepath) {
    this.filepath = filepath;
    this.data = [];
    if (fs.existsSync(filepath)) {
      this.data = JSON.parse(fs.readFileSync(filepath).toString());
    }
  }
  getItems(url) {
    const feed = this.data.find((x) => x.url == url);
    if (!feed) {
      return [];
    }
    return feed.items;
  }
  setItems(url, items) {
    this.data = [
      ...this.data.filter((x) => x.url != url),
      { url, updatedAt: ts(), items },
    ];
    fs.writeFileSync(this.filepath, JSON.stringify(this.data, null, "\t"));
  }
}
