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
