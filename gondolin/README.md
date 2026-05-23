# gondolin

Pi extension. Routes `read`/`write`/`edit`/`bash` tool calls through a
[Gondolin](https://github.com/earendil-works/gondolin) micro-VM with
OpenJDK 21 + Gradle/Maven preinstalled.

Adds these on top of the upstream `pi-gondolin.ts` example:

- Custom guest image (Alpine + JVM toolchain) via `gondolin build`
- Deny-by-default network allowlist via `createHttpHooks`
- `GITHUB_TOKEN` injected via gondolin secrets (guest sees a placeholder)
- Host git identity + `GITHUB_USERNAME` + proxy vars imported into guest env
- Allowlist verification probe at startup (curl one allowed + one denied host)

## Setup (one-time)

```bash
git clone git@github.com:anandyandawang/pi-extensions ~/code/pi-extensions
cd ~/code/pi-extensions/gondolin
pnpm install
npx gondolin build --config build-config.json --output ./assets
ln -s ~/code/pi-extensions/gondolin ~/.pi/agent/git/gondolin
```

Edit `build-config.json` to switch `arch` to `x86_64` if you're not on an
ARM host. Image build takes a few minutes.

## Use

```bash
cd ~/my-project     # this dir becomes /workspace inside the VM
pi                  # extension auto-loads via ~/.pi/agent/git/gondolin
```

Host env vars consumed (all optional):

| Var | What it does |
|---|---|
| `GITHUB_TOKEN` | Injected into guest only for allowlisted GitHub hosts; guest sees a placeholder |
| `GITHUB_USERNAME` | Set verbatim in guest env |
| `HTTPS_PROXY` / `HTTP_PROXY` | Forwarded into guest env |

Host gitconfig: `user.name` and `user.email` from the host's global
gitconfig are read at session start and applied inside the guest via
`git config --global`. Unset values silently skip.

## Files

| File | Purpose |
|---|---|
| `extensions/pi-gondolin.ts` | The extension pi loads |
| `build-config.json` | Input for `gondolin build` |
| `allowed-hosts.json` | Runtime network allowlist + GitHub-token destination list |
| `assets/` | Build output (gitignored) — VM kernel + rootfs |

## Rebuild guest image

```bash
npx gondolin build --config build-config.json --output ./assets
```

## Troubleshooting

- `VM.create` throws about missing `manifest.json` → run `gondolin build` first.
- Allowlist verify fails at startup → check `allowed-hosts.json` lists the
  host the probe uses (`api.github.com`); also confirm host has outbound DNS.
- `git push` inside guest fails with auth error → set `GITHUB_TOKEN` on host
  before launching pi.
