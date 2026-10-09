"""Run a real Workers AI request through AI Gateway and record its TraceScope trace."""

import json
import os
import sys
import urllib.error
import urllib.request

worker_url = os.environ["TRACESCOPE_WORKER_URL"].rstrip("/")
api_key = os.environ["TRACESCOPE_API_KEY"]
question = " ".join(sys.argv[1:]).strip() or "What is a trace in an AI application?"
body = json.dumps({"question": question}).encode("utf-8")
request = urllib.request.Request(
    f"{worker_url}/v1/examples/ai",
    data=body,
    headers={
        "content-type": "application/json",
        "x-tracescope-key": api_key,
        "user-agent": "TraceScope-example/1.0",
    },
    method="POST",
)

try:
    with urllib.request.urlopen(request, timeout=30) as result:
        print(json.dumps(json.load(result), indent=2))
except urllib.error.HTTPError as error:
    print(error.read().decode("utf-8"), file=sys.stderr)
    raise SystemExit(1) from error
