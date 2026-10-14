import os, sys

SKIP_DIRS = {'dev', '.claude', '.agents', '.impeccable', 'design-tokens', 'tmp', '.git'}
SKIP_PREFIX = ('dev/', '.claude/', '.agents/', '.impeccable/', 'design-tokens/', 'tmp/')


def rel(root):
    out = {}
    for dp, dns, fns in os.walk(root):
        dns[:] = [d for d in dns if d not in SKIP_DIRS]
        for fn in fns:
            p = os.path.join(dp, fn)
            r = os.path.relpath(p, root)
            r = r.replace(os.sep, '/')
            if r.startswith(SKIP_PREFIX):
                continue
            out[r] = os.path.getsize(p)
    return out


local = rel(sys.argv[1])
live = rel(sys.argv[2])
only_local = sorted(set(local) - set(live))
only_live = sorted(set(live) - set(local))
print('--- ONLY LOCAL (not on live) ---')
for f in only_local:
    print('  ', f, local[f])
print('--- ONLY LIVE (not local) ---')
for f in only_live:
    print('  ', f, live[f])
diff = sorted(f for f in set(local) & set(live) if local[f] != live[f])
print('--- IN BOTH, SIZE DIFFERS ---')
for f in diff:
    print('  ', f, local[f], '->', live[f])
