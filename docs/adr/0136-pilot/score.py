import json, sys, re
from collections import Counter, defaultdict
from ground_truth import GT
def norm(s): return re.sub(r'\s+',' ',s or '').strip()
def span(text, q):
    i=text.find(q)
    if i<0: i=norm(text).find(norm(q)); text=norm(text)
    return (i, i+len(q), text) if i>=0 else None
def score(res_path, pkg_path):
    R=json.load(open(res_path)); P=json.load(open(pkg_path)); M={c['character_name']:c for c in P['chars']}
    findings=[]
    for r in R['results']:
        for f in r.get('findings',[]): findings.append(dict(f, character=r['character']))
    matched=defaultdict(list); unmatched=[]
    for f in findings:
        txt=(M[f['character']].get(f['field']) or '')
        sp=span(txt,f['exact_quote']); hit=False
        for k,(cls,ch,fld,loc) in enumerate(GT):
            if ch!=f['character'] or fld!=f['field']: continue
            i=txt.find(loc)
            if sp and i>=0 and sp[0] < i+len(loc) and i < sp[1]:   # overlap
                matched[k].append(f); hit=True
        if not hit: unmatched.append(dict(f, quote_found=bool(sp)))
    per=defaultdict(lambda:[0,0]); rows=[]
    for k,(cls,ch,fld,loc) in enumerate(GT):
        per[cls][1]+=1
        if k in matched: per[cls][0]+=1
        rows.append((cls,ch,fld,loc,k in matched,[m['category'] for m in matched.get(k,[])]))
    return R, findings, per, rows, unmatched
if __name__=='__main__':
    R,findings,per,rows,unm=score(sys.argv[1],sys.argv[2])
    print('findings:',len(findings),'| unmatched:',len(unm),'| cost $',R['total_cost_usd'])
    for cls,(a,b) in per.items(): print(f'  recall {cls:12s} {a}/{b}')
    print('MISSED:'); [print('  -',r[0],r[1],r[2],'|',r[3]) for r in rows if not r[4]]
    print('CATEGORY of matched findings vs truth class:'); [print('  ',r[0],'->',r[5]) for r in rows if r[4]]
