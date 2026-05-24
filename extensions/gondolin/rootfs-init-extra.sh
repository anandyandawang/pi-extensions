#!/bin/sh
# Appended to gondolin's rootfs init before sandboxd starts.
#
# gondolin's stock init mounts /root as tmpfs (RAM-backed, default size
# ~half of VM RAM, ~484 MB here). Build tools (gradle, maven, npm) cache
# gigabytes into $HOME, so the tmpfs runs out of space mid-build.
#
# Drop the tmpfs mount and let /root sit on the rootfs ext4 instead
# (sized via build-config.json `rootfs.sizeMb`, currently 4 GB). The
# mkdir+chmod re-establishes the dir + restrictive perms the stock init
# expected.

umount /root 2>/dev/null || true
mkdir -p /root
chmod 700 /root
