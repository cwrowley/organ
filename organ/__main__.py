import uvicorn

uvicorn.run("organ.main:app", host="0.0.0.0", port=1685, reload=True)
