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

Run `node index.js testmail` to verify the config by sending a test mail.

Create `feeds.txt` with the list of feed URLs (one line per URL):

```
http://blog.golang.org/feed.atom
https://reactjs.org/feed.xml
```

Run `node index.js` as a daemon to monitor the feeds.
