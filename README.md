# jdanks.armyd
The `jdanks.army` daemon. Run `npm ci && npm start` to get it going.


Reads input from `./people.json` and starts scrapin'.

`people` JSON format:
```
[
  [platform, id, ...optional]
]
```

### Supported platforms:
 - `"youtube"` - id has to be the long `UC.....` format
 - `"dlive"`
 - `"bitwave"`
 - `"robotstreamer"` - third entry is used as username
 - `"trovo"` - expects `TROVO_CLIENT_ID` envar
 - `"twitch"` - expects `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET` envars

### Environment variables
All secrets are optional; in that case, scraping from these 
websites will not function.

- `JDANKS_PORT` · Listen port. Defaults to `80`.

 - `TROVO_CLIENT_ID` · for Trovo support.
 - `TWITCH_CLIENT_ID` `TWITCH_CLIENT_SECRET` · for Twitch support.


### Endpoints
Exposed endpoints are 
 - `/streams` · returns JSON objects of scraped data, formatted as:
      - ```
        {
          platform,
          id,
          name,
          avatar,
          live,
          title,
          viewers
        }
        ```
 - `/src` · returns license information and link to source code
