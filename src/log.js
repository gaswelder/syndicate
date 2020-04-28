function stamp() {
  return new Date().toISOString().split(".")[0].replace("T", " ");
}

function log(msg) {
  process.stdout.write(stamp() + "\t" + msg + "\n");
}

module.exports = log;
