"""POST local files to the targets a stagedUploadsCreate call returned, then print each resourceUrl.

usage: python stage_upload.py <response.json> <file> [<file> ...]

response.json is the mutation's JSON reply ({"data": {"stagedUploadsCreate": {"stagedTargets": [...]}}}).
Files pair with targets in order. Google Cloud Storage wants the policy fields first and the file last.
"""
import json
import os
import subprocess
import sys


def targets(response_json):
    with open(response_json, encoding='utf-8') as fh:
        data = json.load(fh)
    return data['data']['stagedUploadsCreate']['stagedTargets']


def form_args(target, path):
    args = []
    for p in target['parameters']:
        args += ['-F', '%s=%s' % (p['name'], p['value'])]
    return args + ['-F', 'file=@%s' % path]


def curl_cmd(target, path):
    """No "Expect: 100-continue": on 2026-11-09 Google Storage reset the connection right after its 100 Continue
    (curl exit 55, every file, after 47 had gone through), while the same POST without the header answered 201."""
    return (['curl', '-s', '-o', os.devnull, '-w', '%{http_code}', '-H', 'Expect:', '-X', 'POST'] +
            form_args(target, path) + [target['url']])


def upload(target, path):
    return subprocess.run(curl_cmd(target, path), capture_output=True, text=True, check=True).stdout.strip()


if __name__ == '__main__':
    tgts, files = targets(sys.argv[1]), sys.argv[2:]
    if len(tgts) != len(files):
        sys.exit('%d targets but %d files' % (len(tgts), len(files)))
    for t, f in zip(tgts, files):
        print(upload(t, f), f, t['resourceUrl'])
