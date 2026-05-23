# pi-extensions

Personal collection of pi extensions. Each subdirectory is an independent
pi-package; install separately.

## Extensions

| Folder | What it does |
|---|---|
| [gondolin/](./gondolin) | Sandbox pi tool calls inside a Gondolin micro-VM (JVM toolchain) |

## Install

Each subdir has its own README with install steps. General pattern:

```bash
cd <subdir>
pnpm install
# follow subdir-specific build/setup steps
ln -s "$PWD" ~/.pi/agent/git/<subdir-name>
```
