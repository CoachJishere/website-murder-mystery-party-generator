from lib import *
import pickle,csv,re,difflib,collections,sys
hist=pickle.load(open('hist.pkl','rb'))
BP={'P':"MM Live - Parent84 (Materials Language Anchor).blueprint.json",'C':"MM Live - Child (Unified)62-DanishSwedishPack.blueprint.json"}
# registered modules: R0 unique + variants that differ
P_VARIANTS={'5004','5008','5012','5006'}  # detective-script variants + older image prompt copy
P_SKIP={'15118','15119','5005','15122','15123','5009','5010','15126','15127','5013','5014','4020x'}
def slot(name):
    n=re.sub(r' \(R\d\)','',name)
    return n.replace('Investigator Script','Script').replace('Detective Script','Script')
mods=[]
for fam in 'PC':
    ps=prompts(T+BP[fam])
    for mid,(name,txt) in ps.items():
        mid=str(mid)
        if fam=='P' and mid in P_SKIP: continue
        mods.append(dict(fam=fam,mid=mid,name=name,slot=slot(name),txt=txt))
print(len(mods),'modules')
def shingles(t,n=4):
    w=re.findall(r'\w+',t.lower())
    return set(tuple(w[i:i+n]) for i in range(max(1,len(w)-n+1)))
def jac(a,b):
    if not a or not b: return 0.0
    i=len(a&b)
    return i/(len(a)+len(b)-i)
# index history shingles
H={}
for fam in 'PC':
    H[fam]=[]
    for n,f,d,rows in hist[fam]:
        H[fam].append((n,d,[(str(mid),nm,txt,shingles(txt)) for mid,nm,txt,raw in rows]))
rows_out=[]
allrules=[]  # for dup calc
for m in mods:
    rs=rules_of(m['txt'])
    # char offsets
    cur=0
    for r in rs:
        idx=m['txt'].find(r['text'][:60],cur)
        if idx<0: idx=m['txt'].find(r['text'][:60])
        r['off']=idx; cur=max(cur,idx) if idx>=0 else cur
    m['rules']=rs
    for r in rs:
        r['mod']=m
        r['norm']=norm(r['text']); r['sh']=shingles(r['norm'])
        allrules.append(r)
# duplicates across slots (rule-bearing kinds only)
dupcache={}
cand=[r for r in allrules if r['kind'] in('rule','schema-embedded','language_instruction','role') and len(r['norm'])>=60]
byk=collections.defaultdict(list)
for r in cand: byk[r['norm'][:30]].append(r)
for r in allrules:
    if r['kind'] not in('rule','schema-embedded','language_instruction','role') or len(r['norm'])<60:
        r['dup']=1;r['dup_slots']={r['mod']['slot']};continue
    slots={(r['mod']['fam'],r['mod']['mid'])}  # distinct modules
    for o in cand:
        if o is r: continue
        if o['mod'] is r['mod']: continue
        if o['norm']==r['norm'] or (jac(o['sh'],r['sh'])>=0.8):
            slots.add((o['mod']['fam'],o['mod']['mid']))
    r['dup']=len(slots)
# lineage
for r in allrules:
    if r['kind'] not in('rule','schema-embedded','language_instruction'): r['lineage']=None;continue
    fam=r['mod']['fam']
    first=None;texts=[];last=None;versions=[]
    for n,d,vr in H[fam]:
        best=(0,None)
        same=[x for x in vr if x[0]==r['mod']['mid']]
        for pool in (same or vr,):
            for mid,nm,txt,sh in pool:
                s=jac(sh,r['sh'])
                if s>best[0]: best=(s,txt)
        if best[0]>=0.5:
            if first is None: first=(n,d)
            versions.append(n)
            if best[1]!=last:
                texts.append((n,best[0])); last=best[1]
    r['lineage']=dict(first=first,edits=len(texts)-1 if texts else None,editvers=[x[0] for x in texts],nver=len(versions))
pickle.dump([ (m['fam'],m['mid'],m['name'],m['slot'],len(m['txt']),[{k:v for k,v in r.items() if k not in('mod','sh')} for r in m['rules']]) for m in mods],open('reg.pkl','wb'))
print(sum(len(m['rules']) for m in mods),'rows')
