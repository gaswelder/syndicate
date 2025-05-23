const params = {};
const info = {};

const isFlag = (arg) => arg in params && typeof params[arg] == "boolean";
const isParam = (arg) => arg in params && typeof params[arg] != "boolean";

/**
 * Defines a flag (a set/noset argument).
 * @returns {exports}
 */
export function flag(name, description) {
  params[name] = false;
  info[name] = description;
  return this;
}

/**
 * Defines an argument with a parameter.
 * @returns {exports}
 */
export function param(name, defaultValue, description) {
  params[name] = defaultValue;
  info[name] = { defaultValue, description };
  return this;
}

/**
 * Parses the command line arguments and calls `main` with
 * a result object and the rest of the arguments.
 *
 * @returns {[object, array]} params and arguments
 */
export function parse() {
  const args = process.argv.slice(2);
  try {
    const [flagsList, rest] = group(args);
    const result = Object.assign({}, params);
    for (const [k, v] of flagsList) {
      result[k] = v;
    }
    return [result, rest];
  } catch (e) {
    process.stderr.write(e + "\n" + this.reference() + "\n");
    process.exit(1);
  }
}

/**
 * Returns a reference of defined flags and parameters as a string.
 * @returns {string}
 */
export function reference() {
  const lines = [];
  for (const k in params) {
    const desc = isParam(k)
      ? `-${k} ...\t${info[k].description} (=${info[k].defaultValue})`
      : `-${k}\t${info[k]}`;
    lines.push("\t" + desc);
  }
  return lines.join("\n");
}

function group(args) {
  if (args.length == 0) return [[], []];

  if (args[0][0] != "-") return [[], args];
  const next = args[0].substr(1);

  if (isFlag(next)) {
    const rest = group(args.slice(1));
    return [[[next, true], ...rest[0]], rest[1]];
  }

  if (isParam(next)) {
    const val = args[1];
    if (val == undefined) throw new Error("missing value for param -" + next);
    const rest = group(args.slice(2));
    return [[[next, val], ...rest[0]], rest[1]];
  }

  throw new Error("unknown flag: " + next);
}
