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
at boot, even without a GUI login session (useful for headless/SSH-managed servers).
It installs as a LaunchDaemon (system-wide), which unlike a LaunchAgent does not
require an active desktop session.

To install:

```bash
mkdir -p ~/logs
sudo cp com.clancy.organ.plist /Library/LaunchDaemons/
sudo chown root:wheel /Library/LaunchDaemons/com.clancy.organ.plist
sudo chmod 644 /Library/LaunchDaemons/com.clancy.organ.plist
sudo launchctl load /Library/LaunchDaemons/com.clancy.organ.plist
```

Logs are written to `~/logs/organ.log` and `~/logs/organ.err`.

To stop or unload the service:

```bash
sudo launchctl unload /Library/LaunchDaemons/com.clancy.organ.plist
```
