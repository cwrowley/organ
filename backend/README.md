# Organ

FastAPI app for tracking organ gigs, including pieces played at various churches

## Starting the server

```
uvicorn organ.main:app --host 0.0.0.0 --port 1685
```

or

```
python -m organ
```

## Configuration

The server reads `ORGAN_API_KEY` from the environment. You can set it in a `.env`
file in this directory and it will be loaded automatically at startup:

```
ORGAN_API_KEY=your-key-here
```

## Auto-start with launchd (macOS)

`com.clancy.organ.plist` configures launchd to start the backend automatically
when you log in. To install it:

```bash
mkdir -p ~/logs
cp com.clancy.organ.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.clancy.organ.plist
```

Logs are written to `~/logs/organ.log` and `~/logs/organ.err`.

To stop or unload the service:

```bash
launchctl unload ~/Library/LaunchAgents/com.clancy.organ.plist
```

## TLS via Tailscale certificates

The plist passes TLS cert and key files to uvicorn so the server runs on HTTPS.
These come from Tailscale and need to be provisioned once, then renewed manually
every ~90 days.

### Prerequisites

In the [Tailscale admin console](https://login.tailscale.com) → DNS tab:
- Enable MagicDNS
- Enable HTTPS Certificates

### Initial setup

Find your full Tailscale hostname (look for lumiere's entry):
```bash
tailscale status
```

Generate the certs (requires sudo):
```bash
sudo mkdir -p /etc/tailscale/certs
sudo tailscale cert \
    --cert-file /etc/tailscale/certs/organ.crt \
    --key-file  /etc/tailscale/certs/organ.key \
    lumiere.your-tailnet.ts.net
```

Make the files readable by your user account (since uvicorn runs as you):
```bash
sudo chown clancy /etc/tailscale/certs/organ.crt
sudo chown clancy /etc/tailscale/certs/organ.key
```

The server will then be accessible at `https://lumiere.your-tailnet.ts.net:1685`
from any device on your Tailscale network.

### Renewing certificates (every ~90 days)

Re-run the same `tailscale cert` command, then restart the server to pick up
the new cert:

```bash
sudo tailscale cert \
    --cert-file /etc/tailscale/certs/organ.crt \
    --key-file  /etc/tailscale/certs/organ.key \
    lumiere.your-tailnet.ts.net
sudo chown clancy /etc/tailscale/certs/organ.crt
sudo chown clancy /etc/tailscale/certs/organ.key
launchctl kickstart -k gui/$(id -u)/com.clancy.organ
```
