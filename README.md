# jdanks.armyd
The `jdanks.army` daemon. Run `npm ci && npm start` to get it going.

The environment variable `JDANKS_PORT` customizes port (default `80`).

After having started a listen on `JDANKS_PORT`, it will read 
`./people.json` and start scrapin'.

JSON format:
```
[
  [platform, id, ...optional]
]
```

Supported platforms:
 - `"youtube"` - id has to be the long `UC.....` format
 - `"dlive"`
 - `"bitwave"`
 - `"robotstreamer"`
 - `"trovo"` - expects TROVO_CLIENT_ID secret envar

Exposed endpoint is `/streams`, returns JSON objects of the format
```
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
