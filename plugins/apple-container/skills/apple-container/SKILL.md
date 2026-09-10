---
name: apple-container
description: Use when running, building, or managing Linux containers with Apple's `container` CLI on macOS (Apple silicon), or when migrating a Docker / Docker Desktop workflow to Apple Container. Triggers include "apple container", "the container CLI", "container run/build", "replace Docker Desktop on mac", "docker to apple container", or running containers on Apple silicon without Docker. Covers setup, the Docker→container command mapping, and the behavioral differences (launchd-managed services, no built-in Compose, per-container VMs, Rosetta, anonymous-volume cleanup) that bite during a transition.
---

# Apple container

`container` ([apple/container](https://github.com/apple/container)) is Apple's CLI for running
**Linux containers as lightweight VMs: one VM per container: on Apple silicon**. It consumes and
produces standard **OCI images**, so it interoperates with Docker registries and Dockerfiles. The
CLI surface is deliberately close to Docker's, so most muscle memory transfers; the traps are in the
*behavioral* differences, not the verbs.

Use this skill to run/build/manage containers with `container`, and to port a Docker workflow over.
For exhaustive command flags and the full Docker→container mapping, see
[references/docker-migration.md](references/docker-migration.md).

## Mental model (how it differs from Docker)

- **One lightweight VM per container** (via the [Containerization](https://github.com/apple/containerization)
  package + Virtualization.framework), not one shared Linux VM hosting all containers like Docker
  Desktop. Better isolation/privacy; only the data you mount enters each VM.
- **A long-running launchd-managed API service and helpers.** `container system start` launches
  `container-apiserver`; `container system stop` terminates it. The CLI communicates with that API
  and XPC helpers for images, networking and container runtimes. This is not a daemon-free runtime.
  See the [1.4.1 technical overview](https://github.com/apple/container/blob/1.4.1/docs/technical-overview.md).
- **Supported on macOS 26 and Apple silicon.** Older macOS versions are unsupported.
  Historical macOS 15 behavior has networking limitations; it is not a supported deployment target.
  See the [1.4.1 requirements](https://github.com/apple/container/blob/1.4.1/README.md#requirements).

## Setup (do this first)

```bash
# 1. Install: download the signed .pkg from https://github.com/apple/container/releases
#    and double-click (installs under /usr/local, asks for admin password).
# 2. Start the system services (the "daemon" equivalent):
container system start          # prompts to install a default Linux kernel the first time
# 3. Verify:
container system status
container --version
```

Upgrade with `/usr/local/bin/update-container.sh`; uninstall with
`/usr/local/bin/uninstall-container.sh -k` (keep data) or `-d` (delete data). Always
`container system stop` before upgrading/downgrading.

## The 90% you'll use (Docker → container)

Most verbs are 1:1: swap `docker` for `container`:

```bash
container run -it ubuntu /bin/bash              # docker run -it ubuntu bash
container run -d --name web -p 8080:80 nginx     # detached + port publish
container build -t my-app:latest .               # builds Dockerfile OR Containerfile via BuildKit
container exec -it web sh                         # exec into a running container
container ls            # running containers   (container ls --all for stopped too)
container logs -f web                             # follow logs
container cp ./f web:/tmp/                        # copy host↔container
container image ls                               # local images
container image pull nginx:latest                # default registry is docker.io
container image push registry.example.com/me/app:1.0
container stop web ; container rm web             # stop then remove
```

> Cleanup is version-dependent: 1.4.1 adds `container clean`. Inspect `container clean --help`
> and resource-specific prune help before use. Review exact targets and durable data first;
> the existence of a cleanup command is not authorization for blanket deletion.

`container run`/`create` accept the Docker-style flags you expect: `-e/--env`, `--env-file`,
`-v/--volume`, `--mount`, `-w/--workdir`, `-u/--user`, `-p/--publish`, `--rm`, `--cap-add/--cap-drop`,
`-c/--cpus`, `-m/--memory`, `--entrypoint`, `--read-only`, `--network`. Output formats: most `ls`/
`inspect` commands take `--format json|table|yaml|toml`.

## Transition traps (read before you migrate)

These are the things that *don't* behave like Docker: the actual reason a port goes wrong:

1. **No `docker compose`.** There is no compose command. Multi-container apps must be wired by hand
   (a bring-up script + `container network create` on macOS 26) or with an external orchestrator. This
   is the single biggest gap when moving a Compose-based project: follow the
   [Compose migration playbook](references/compose-migration.md) (field mapping, service-discovery DNS,
   a worked `up.sh`/`down.sh`, and the `depends_on`/`restart` gaps).
2. **Anonymous volumes are NOT auto-removed by `--rm`** (Docker removes them). You must
   `container volume rm <id>` manually, or they accumulate. Find them: `container volume ls -q | grep anon`.
3. **x86/amd64 images run under Rosetta.** `container run --arch amd64 …` (or `--rosetta`) executes
   x86_64 images on Apple silicon. Build multi-arch with `container build --arch arm64 --arch amd64 …`.
4. **Memory isn't fully returned to the host.** The VM grabs what the app needs but doesn't relinquish
   freed pages (partial ballooning). Long-lived memory-heavy containers may need an occasional restart;
   `--memory 16g` is a ceiling, not a reservation (Activity Monitor shows true use).
5. **Networking is macOS-version-gated.** `container network create` and `--network` only work on
   macOS 26. On macOS 15 every container is on one isolated default network and can't reach the others.
6. **Default registry is Docker Hub.** `container run alpine` resolves to `docker.io/library/alpine`,
   same as Docker. Change the default via system config (`domain` property). Registry creds live in
   the macOS Keychain; `container registry login <server>`.
7. **`container machine` ≠ a container.** It's an explicit guest-VM you can shell into (`container m`
   is the alias). You generally don't need it for normal container workflows: don't confuse it with
   `container run`.

## Common how-tos (commands, grounded in the docs)

```bash
# Share host files
container run -v $HOME/Desktop/assets:/content/assets python:alpine ls /content/assets

# Publish a port (localhost forwarding)
container run -d -p 8080:80 nginx

# Persistent named volume
container volume create data && container run -v data:/var/lib/app my-app

# Resource limits
container run --cpus 2 --memory 1G alpine:3.23 true

# Multi-platform build + run the amd64 variant under Rosetta
container build --arch arm64 --arch amd64 -t me/app:latest .
container run --arch amd64 --rm me/app:latest uname -a   # → x86_64

# Disk usage / cleanup
container system df
container clean --help                         # inspect scope before any deletion
```

Shell completions for zsh/bash/fish are documented in the upstream `how-to.md`
(see the deep-reference pointer below).

## When you need more

- **Full command reference, every flag, every gotcha:**
  [references/docker-migration.md](references/docker-migration.md) (in this skill).
- **Migrating a `docker compose` project:**
  [references/compose-migration.md](references/compose-migration.md): Compose-key→container mapping,
  name-based service discovery, a worked multi-service `up.sh`/`down.sh`, and the lifecycle gaps.
- **Upstream docs:** <https://github.com/apple/container/tree/main/docs>: `command-reference.md`,
  `how-to.md`, `technical-overview.md`, tutorials. API reference (Swift, for embedding):
  <https://apple.github.io/container/documentation/>
> Reviewed against [Apple Container 1.4.1](https://github.com/apple/container/releases/tag/1.4.1)
> on 2026-09-10. It is a 1.x release, not pre-1.0. Some upstream README prose still contains
> old pre-1.0 wording; use the installed version, release notes and tag-matched documentation
> for compatibility decisions. 1.4.1 includes security fixes and changes the `system status`
> output contract. Pin releases and verify parsers/workloads after upgrades.

> Inspection output can include environment variables. Select only required identity, image,
> mount, state and resource fields; never print a full environment or credential-bearing inspect result.
