import * as fs from "fs";

const ts = () => new Date().toISOString();

const addedItems = (state, url, newItems) => {
  const feed = state.find((x) => x.url == url);
  if (!feed) {
    return newItems;
  }
  const currentItems = feed.items;
  return newItems.filter((x) => !currentItems.includes(x));
};

const updateItems = (state, url, newItems) => [
  ...state.filter((x) => x.url != url),
  { url, updatedAt: ts(), items: newItems },
];

const migrate = (sendlog, urls) => urls.map((url) => ({ url, items: sendlog }));

const load = (filepath, urls) => {
  if (!fs.existsSync(filepath)) {
    return [];
  }
  const src = fs.readFileSync(filepath).toString();
  if (!src.startsWith("[")) {
    console.log("migrating state");
    return migrate(src.split("\n"), urls);
  }
  return JSON.parse(src);
};

const save = (state, filepath) =>
  fs.writeFileSync(filepath, JSON.stringify(state, null, "\t"));

export class State {
  constructor(filepath, urls) {
    this.filepath = filepath;
    this.data = load(filepath, urls);
  }
  addedItems(url, newItems) {
    return addedItems(this.data, url, newItems);
  }
  updateItems(url, newItems) {
    this.data = updateItems(this.data, url, newItems);
    save(this.data, this.filepath);
  }
}
