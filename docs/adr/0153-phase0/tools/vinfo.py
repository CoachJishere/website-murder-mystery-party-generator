import re,os,glob,pickle,collections
R='/Users/jonathanmiller/CascadeProjects/website-murder-mystery-party-generator-main/'
hist=pickle.load(open('hist.pkl','rb'))
adr={}
for f in sorted(glob.glob(R+'docs/adr/*.md')):
    adr[os.path.basename(f)]=open(f).read()
cl=open(R+'CHANGELOG.md').read()
# changelog entries: split by '### '
entries=re.split(r'\n(?=### )',cl)
def date_of(entry_idx):
    pass
info={}
for fam,label in (('P','Parent'),('C','Child')):
    for n,f,d,rows in hist[fam]:
        pat=re.compile(r'\b%s ?%d\b(?!\d)'%(label,n))
        hits=collections.Counter()
        for fn,t in adr.items():
            c=len(pat.findall(t))
            if c: hits[fn[:4]]+=c
        # earliest changelog entry mentioning token (file is reverse chrono -> last)
        ce=[e for e in entries if pat.search(e)]
        title=ce[-1].split('\n')[0][:110] if ce else ''
        adrs=[a for a,_ in hits.most_common(2)]
        short=re.sub(r'^MM Live - ','',f).replace('.blueprint.json','')
        info[(fam,n)]=dict(file=short,date=d,adrs=adrs,cl=title)
pickle.dump(info,open('vinfo.pkl','wb'))
for k in [('C',44),('C',51),('C',57),('C',58),('P',73),('P',77),('P',84),('P',75),('C',53)]:
    print(k,info[k])
