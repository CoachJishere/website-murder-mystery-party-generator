from lib import *
import pickle,datetime
fam={'P':[], 'C':[]}
for f in sorted(os.listdir(T)):
    if not f.endswith('.blueprint.json'): continue
    m=re.match(r'MM Live - Parent(\d+)',f)
    if m: fam['P'].append((int(m.group(1)),f));continue
    m=re.match(r'MM Live - Child \(Unified\)(\d+)-',f)
    if m: fam['C'].append((int(m.group(1)),f));continue
    if f=='MM Live - Child (Unified).blueprint.json': fam['C'].append((1,f))
hist={}
for k in fam:
    fam[k].sort()
    hist[k]=[]
    for n,f in fam[k]:
        try:
            ps=prompts(T+f)
        except Exception as e:
            print('ERR',f,e);continue
        st=os.stat(T+f)
        d=datetime.date.fromtimestamp(getattr(st,'st_birthtime',st.st_mtime)).isoformat()
        rows=[]
        for mid,(name,txt) in ps.items():
            for r in rules_of(txt):
                if r['kind'] in('rule','schema-embedded','language_instruction'):
                    rows.append((mid,name,norm(r['text']),r['text']))
        hist[k].append((n,f,d,rows))
        print(k,n,d,len(ps),len(rows),sum(len(t) for _,t in ps.values()))
pickle.dump(hist,open('hist.pkl','wb'))
