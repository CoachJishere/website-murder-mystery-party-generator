import pickle,re,collections,csv
rows,by=pickle.load(open('rows.pkl','rb'))
reg=pickle.load(open('reg.pkl','rb'))
def sh(t,n=4):
    w=re.findall(r'\w+',t.lower()); return set(tuple(w[i:i+n]) for i in range(max(1,len(w)-n+1)))
# align rows to rules
items=[]
k=0
for fam,mid,name,slot,L,rs in reg:
    for i,r in enumerate(rs):
        items.append((fam,mid,r))
assert len(items)==len(rows)
dirs=[(i,rows[i],items[i][2]) for i in range(len(rows)) if rows[i]['kind'] in('rule','schema-embedded','language_instruction')]
print('directive rows',len(dirs))
# clusters (union-find)
par=list(range(len(dirs)))
def f(x):
    while par[x]!=x: par[x]=par[par[x]]; x=par[x]
    return x
shs=[sh(d[2]['norm']) for d in dirs]
byk=collections.defaultdict(list)
for j,d in enumerate(dirs): byk[d[2]['norm'][:25]].append(j)
for j in range(len(dirs)):
    for jj in range(j+1,len(dirs)):
        if dirs[j][1]['module_id']==dirs[jj][1]['module_id']: continue
        a,b=shs[j],shs[jj]
        if not a or not b: continue
        if len(a)>0 and abs(len(a)-len(b))/max(len(a),len(b))>0.5: continue
        i=len(a&b)
        if i/(len(a)+len(b)-i)>=0.8: par[f(jj)]=f(j)
cl=collections.defaultdict(list)
for j in range(len(dirs)): cl[f(j)].append(j)
print('unique rule clusters',len(cl),'from',len(dirs),'rows')
def strength_of(c):
    # strongest strength among members
    order=['detector+heal','detector','partial','advisory-detector','llm-reviewer-only','none']
    ss=[dirs[j][1]['coverage_strength'] for j in c]
    return min(ss,key=lambda s:order.index(s) if s in order else 9)
tot=collections.Counter(); totrows=collections.Counter(); emphrows=collections.Counter(); emphcl=collections.Counter()
for c in cl.values():
    tot[strength_of(c)]+=1
    if any(dirs[j][1]['emphatic']=='yes' for j in c): emphcl[strength_of(c)]+=1
for _,r,_ in dirs:
    totrows[r['coverage_strength']]+=1
    if r['emphatic']=='yes': emphrows[r['coverage_strength']]+=1
print('rows',dict(totrows),sum(totrows.values()))
print('clusters',dict(tot),sum(tot.values()))
print('emph rows',dict(emphrows),sum(emphrows.values()))
print('emph clusters',dict(emphcl),sum(emphcl.values()))
# by blueprint
for bp in ['Parent84','Child62']:
    c=collections.Counter(r['coverage_strength'] for _,r,_ in dirs if r['blueprint']==bp)
    print(bp,dict(c),sum(c.values()))
# duplicates: top clusters by module count
big=sorted(cl.values(),key=lambda c:-len({dirs[j][1]['module_id'] for j in c}))
print('top duplicated')
for c in big[:25]:
    mods=sorted({dirs[j][1]['module_id'] for j in c})
    ch=sum(dirs[j][1]['chars'] for j in c)
    print(len(mods),'mods',ch,'total chars |',dirs[c[0]][1]['rule_text_first_200_chars'][:80],'|',strength_of(c))
pickle.dump((dirs and [(d[1]['rule_id']) for d in dirs],[[dirs[j][1]['rule_id'] for j in c] for c in cl.values()]),open('clusters.pkl','wb'))
# recurrence counts
rc=collections.Counter(r['recurred_after_prompt_fix'].split(' - ')[0] for _,r,_ in dirs)
print('recurred',rc)
# chars in duplicated clusters
dupchars=sum(sum(dirs[j][1]['chars'] for j in c) for c in cl.values() if len({dirs[j][1]['module_id'] for j in c})>1)
allchars=sum(d[1]['chars'] for d in dirs)
uniqchars=sum(dirs[c[0]][1]['chars'] for c in cl.values())
print('directive chars total',allchars,'in clusters spanning >1 module',dupchars,'if each cluster appeared once',uniqchars)
