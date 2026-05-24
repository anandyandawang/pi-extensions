# pi-stuff

Collection of stuff for pi.

## Setup

```bash
git clone git@github.com:anandyandawang/pi-stuff
cd pi-stuff
pnpm install        # installs deps for every extension in one shot
pi install "$PWD"   # or `pi install pi-stuff` from the parent dir
```

Build the **gondolin** VM image (run from the repo root):
```bash
npx gondolin build \
  --config extensions/gondolin/build-config.json \
  --output extensions/gondolin/assets
```

## Stuff

### Extensions
- **gondolin**: Sandbox tool calls in a micro-VM (JVM toolchain).
- **curious**: Makes pi ask more questions instead of guessing.
- **grug**: Grug brain for pi.

### Skills
- **web-search**: Let pi search the web via DuckDuckGo.
