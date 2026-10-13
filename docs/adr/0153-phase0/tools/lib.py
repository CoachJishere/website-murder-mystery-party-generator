import json,os,re,glob,hashlib
T='/Users/jonathanmiller/CascadeProjects/website-murder-mystery-party-generator-main/temp-files/'
def walk(flow,out):
    for m in flow:
        out.append(m)
        for r in m.get('routes',[]) or []:
            walk(r.get('flow',[]),out)
        if 'onerror' in m: walk(m['onerror'],out)
    return out
def prompts(path):
    bp=json.load(open(path))
    res={}
    for m in walk(bp['flow'],[]):
        if m.get('module')=='anthropic-claude:createAMessage':
            txt=''.join(c.get('text','') for msg in m['mapper']['messages'] for c in msg['content'])
            res[m['id']]=(m.get('metadata',{}).get('designer',{}).get('name',str(m['id'])),txt)
    return res
DATA_TAGS={'context','input_data','master_context','already_written_for_this_character','game_parameters','evidence_cards','game_structure_context','mystery_arc_structure'}
SCHEMA_TAGS={'output_schema','output_format'}
EMPH=re.compile(r'\bCRITICAL\b|\bMUST\b|\bNEVER\b|\bALWAYS\b|\bDo not\b|\bDo NOT\b|\bNO\b|\bONLY\b|\bFORBIDDEN\b|\bmandatory\b')
def sections(txt):
    out=[];pos=0
    for m in re.finditer(r'<([a-z_]+)>\n(.*?)\n</\1>',txt,re.S):
        if m.start()>pos and txt[pos:m.start()].strip(): out.append(('(untagged)',txt[pos:m.start()].strip()))
        out.append((m.group(1),m.group(2)));pos=m.end()
    if txt[pos:].strip(): out.append(('(untagged)',txt[pos:].strip()))
    return out
BUL=re.compile(r'^(\s*)([-*•]|\d+[.)]) ')
def items(body):
    """split a rule section into discrete items: each top-level bullet / numbered item / standalone line; sub-bullets (indented) and continuation lines join the parent."""
    its=[];cur=None;hdr=''
    for line in body.split('\n'):
        if not line.strip() or line.strip() in('---','***','___'):
            continue
        if re.match(r'^#{1,4} ',line):
            hdr=line.strip('# ').strip(); cur=None; continue
        m=BUL.match(line)
        if m and len(m.group(1))<=1:
            cur=[hdr,line.strip()]; its.append(cur)
        elif m and cur is not None:
            cur[1]+=' '+line.strip()
        elif cur is not None and line.startswith('  '):
            cur[1]+=' '+line.strip()
        else:
            cur=[hdr,line.strip()]; its.append(cur)
    return [(h,t) for h,t in its]
def norm(t):
    t=re.sub(r'\{\{[^}]*\}\}','{{}}',t)
    return re.sub(r'\s+',' ',t).strip().lower()
def rules_of(txt):
    """returns list of dicts: section, header, text, kind"""
    rows=[]
    for tag,body in sections(txt):
        if tag in DATA_TAGS:
            rows.append(dict(section=tag,header='',text=body,kind='data'))
        elif tag in SCHEMA_TAGS:
            rows.append(dict(section=tag,header='',text=body,kind='schema'))
            # embedded directives inside the schema block
            for l in body.split('\n'):
                if EMPH.search(l) and len(l.strip())>40:
                    rows.append(dict(section=tag,header='embedded',text=l.strip(),kind='schema-embedded'))
        elif tag in('language_instruction','role'):
            rows.append(dict(section=tag,header='',text=body,kind=tag))
        else:
            for h,t in items(body):
                if len(t)<30 and t.endswith(':'): continue
                rows.append(dict(section=tag,header=h,text=t,kind='rule'))
    return rows
