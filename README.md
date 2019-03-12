# Syndicate

Forwards RSS items to an email.

## Usage

Create `config.json` with the contents in the following format:

```json
{
  "mailer": {
    "transport": {
      "host": "localhost",
      "port": 2525,
      "secure": false
    },
    "mail": {
      "from": "Sindycate <no@localhost>",
      "to": "joe@localhost"
    }
  },
  "sendlog_path": "sendlog"
}
```

Then create `feeds.txt` with the list of feed URLs (one line per URL).

Then run `node index.js`.
