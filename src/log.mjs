export const log = {
  error(msg) {
    process.stdout.write(
      JSON.stringify({ level: "error", msg, t: new Date().toISOString() }) +
        "\n"
    );
  },
  info(msg) {
    process.stdout.write(
      JSON.stringify({ level: "info", msg, t: new Date().toISOString() }) + "\n"
    );
  },
};
