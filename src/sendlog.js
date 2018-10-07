const fs = require("fs");

class SendLog {
  constructor(filepath) {
    this.filepath = filepath;
    this.load();
  }

  load() {
    if (!fs.existsSync(this.filepath)) {
      this.set = new Set();
      return;
    }
    const items = fs
      .readFileSync(this.filepath)
      .toString()
      .split("\n");
    this.set = new Set(items);
  }

  flush() {
    const keys = [...this.set.keys()];
    fs.writeFileSync(this.filepath, keys.join("\n"));
  }

  has(key) {
    return this.set.has(key);
  }

  add(key) {
    this.set.add(key);
    this.flush();
  }
}

module.exports = SendLog;
