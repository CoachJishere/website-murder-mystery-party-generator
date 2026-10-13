import json,os,re
S=os.path.dirname(os.path.abspath(__file__))
def walk(flow,out):
    for m in flow:
        out.append(m)
        for r in m.get('routes',[]) or []:
            walk(r.get('flow',[]),out)
        if 'onerror' in m: walk(m['onerror'],out)
    return out
T='/Users/jonathanmiller/CascadeProjects/website-murder-mystery-party-generator-main/temp-files/'
res={}
for tag,f in [('P',"MM Live - Parent84 (Materials Language Anchor).blueprint.json"),('C',"MM Live - Child (Unified)62-DanishSwedishPack.blueprint.json")]:
    bp=json.load(open(T+f))
    for m in walk(bp['flow'],[]):
        if m['module']=='anthropic-claude:createAMessage':
            txt=''.join(c.get('text','') for msg in m['mapper']['messages'] for c in msg['content'])
            name=m['metadata']['designer']['name']
            open(f"{S}/{tag}_{m['id']}.txt",'w').write(txt)
