import subprocess,shutil,sys
R='/Users/jonathanmiller/CascadeProjects/website-murder-mystery-party-generator-main/'
CC=R+'supabase/functions/_shared/childContext.ts'
H=R+'supabase/functions/child-context/handler.ts'
RG=R+'supabase/functions/regenerate-child-content/index.ts'
muts=[
 ("switch ignored (off no longer short-circuits)",CC,'if (mode === "off") return keepFull(["switch-off"]);','',),
 ("test_only ignores isTest",CC,'if (mode === "test_only" && !input.isTest) return keepFull(["test-only-skip"]);','',),
 ("role derivation never says murderer",CC,'if (p.murderer && sameCharacter(characterName, p.murderer)) return "murderer";','',),
 ("role derivation never says accomplice",CC,'if (p.accomplice && sameCharacter(characterName, p.accomplice)) return "accomplice";','',),
 ("fallback returns a partial/blank redaction",CC,'redacted: false, role, context: null, excerpt: null, chat: null, flags: [...flags, `fallback:${reason}`]','redacted: true, role, context: "", excerpt: "", chat: "", flags: [...flags, `fallback:${reason}`]'),
 ("culprit gets redacted",CC,'if (FULL_ROLES.has(derived) || storedCulprit) {','if (false) {'),
 ("innocent gets the full design",CC,'redacted: true, role: derived, context: ctx.context,','redacted: true, role: derived, context: input.masterContext,'),
 ("starvation guard removed",CC,'if (ctx.context.length < MIN_CONTEXT_CHARS) return','if (false) return'),
 ("chat doubt ignored",CC,'if (r.flags.includes("character-list-not-recognised") && r.survivors > 0) throw','if (false) throw'),
 ("own-entry-not-found ignored",CC,'if (ctx.dropped.some((d) => d.includes("[self] (NOT FOUND)"))) return','if (false) return'),
 ("stored culprit role ignored",CC,'const storedCulprit = FULL_ROLES.has(stored.toLowerCase());','const storedCulprit = false;'),
 ("intrigue not detected",CC,'if (people.mysteryType === "intrigue") return','if (false) return'),
 ("unknown switch value turns redaction on",CC,'(v === "on" || v === "test_only" ? v : "off")','(v === "off" ? "off" : "on")'),
 ("regeneration seam: exception escapes",CC,'prep = fallback("exception", true, null, [String((e as Error)?.message ?? e).slice(0, 120)]);','throw e;'),
 ("handler: key not checked",H,'if (!given || !(await sameKey(given, deps.expectedKey))) return json(401, { error: "unauthorized" });',''),
 ("handler: unconfigured key serves anyway",H,'if (!deps.expectedKey) return json(503, { error: "not configured" });',''),
 ("handler: text returned when not redacted",H,'context: prep.redacted ? prep.context : null,','context: prep.context ?? "FULL",'),
 ("handler: fallback not logged",H,'try { await deps.logFallback(body.packageId, action); }','try { }'),
 ("handler: alert never sent",H,'if (prep.fallback.alert) {','if (false) {'),
 ("handler: customer text logged",H,'deps.log(`child-context: ${body.packageId} role=','deps.log(`child-context: ${body.conversation} ${body.packageId} role='),
 ("regenerate: prompt gets the full design",RG,'masterContext: redaction.masterContext, character,','masterContext: masterContextStr, character,'),
 ("regenerate: roles shown to redacted characters",RG,'character_role: redaction.prep.redacted ? null : c.character_role','character_role: c.character_role'),
]
tests=['supabase/functions/_shared/childContext.test.mjs','supabase/functions/child-context/child-context.test.mjs','supabase/functions/regenerate-child-content/redaction-seam.test.mjs']
survived=[]
for name,path,old,new in muts:
    src=open(path).read()
    if src.count(old)!=1:
        print("ANCHOR PROBLEM",name,src.count(old)); continue
    open(path,'w').write(src.replace(old,new))
    try:
        failed=False
        for t in tests:
            r=subprocess.run(['node','--experimental-strip-types',R+t],capture_output=True,text=True,cwd=R)
            if r.returncode!=0: failed=True; break
        print(("KILLED  " if failed else "SURVIVED"),name)
        if not failed: survived.append(name)
    finally:
        open(path,'w').write(src)
print("survivors:",survived)
