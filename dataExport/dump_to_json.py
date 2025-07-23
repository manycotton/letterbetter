import redis, json, ssl
r = redis.Redis(
    host="resolved-hermit-56261.upstash.io",
    port=6379,
    password="AdvFAAIjcDEwZjBmNWVmODMxYzk0NzJhYWIyNDM0MDYwZGNiMzc3MXAxMA",
    ssl=True,
)
out = {}
for raw_key in r.scan_iter():
    key = raw_key.decode()
    rtype = r.type(key).decode()
    ttl   = r.ttl(key)
    if rtype == "string":
        val = r.get(key).decode()
    elif rtype == "hash":
        val = {k.decode(): v.decode() for k, v in r.hgetall(key).items()}
    elif rtype == "list":
        val = [x.decode() for x in r.lrange(key, 0, -1)]
    elif rtype == "set":
        val = [x.decode() for x in r.smembers(key)]
    elif rtype == "zset":
        val = [[s, m.decode()] for m, s in r.zrange(key, 0, -1, withscores=True)]
    else:
        val = "<unsupported>"
    out[key] = {"type": rtype, "ttl": ttl, "value": val}
json.dump(out, open("redis.json", "w", encoding="utf-8"), ensure_ascii=False, indent=2)
