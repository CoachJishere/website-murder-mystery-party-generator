import json
GT=[
 # semantic, single generation (6)
 ("single_gen","Honey Hustle","description","the conversation that followed Dusty threatened"),
 ("single_gen","Honey Hustle","round2_innocent","That's what I did."),
 ("single_gen","Francesca Vinyl","round2_innocent","a informant"),
 ("single_gen","Pete Platform","round2_accomplice","it's not short list"),
 ("single_gen","Roxanne Starlight","round3_guilty","last night, not once"),
 ("single_gen","Pete Platform","relationships","I keep my head down and my opinions to myself, which means"),
 # wrong fact vs another character / master_context (3)
 ("wrong_fact","Honey Hustle","rumors","not a bartender's instinct"),
 ("wrong_fact","Sandro Night","final_innocent","behind the bar that night"),
 ("wrong_fact","Chuck Bomb","final_innocent","a badge, a business"),
 # same character, different call (1)
 ("cross_call","Honey Hustle","round2_guilty","I spent three years keeping this club's finances honest"),
 # victim pronoun drift (12 prose locations)
 ("pronoun","Lena Lush","round2_questions","memoir of hers"),
 ("pronoun","Lena Lush","round2_questions","she shouldn't have been able to get her hands"),
 ("pronoun","Lena Lush","round2_questions","Did she ever let slip"),
 ("pronoun","Lena Lush","round2_innocent","I told her then"),
 ("pronoun","Lena Lush","round2_innocent","owed her something"),
 ("pronoun","Lena Lush","round2_innocent","I resented her"),
 ("pronoun","Lena Lush","final_innocent","She mocked my gift"),
 ("pronoun","Lena Lush","final_innocent","She was squeezing this entire club dry"),
 ("pronoun","Lena Lush","final_innocent","watch her die"),
 ("pronoun","Pete Platform","round4_accomplice","Dusty herself"),
 ("pronoun","Francesca Vinyl","round3_innocent","a man's drink"),
 ("pronoun","Dot Mirrorball","background","golden girl"),
 # mechanical leaks (secondary; detectors already catch these)
 ("mechanical","Gio Fandango","reveal_confession_accomplice","</br>"),
 ("mechanical","Honey Hustle","final_innocent","Let me correct that formatting issue"),
 ("mechanical","Lena Lush","reveal_confession_guilty","without pretending otherwise.'"),
 ("mechanical","Pete Platform","reveal_confession_accomplice","it's the truth, finally.”"),
 ("mechanical","Roxanne Starlight","final_innocent","once for good tonight.'"),
 ("mechanical","Sandro Night","reveal_confession_accomplice","conscience.`"),
]
if __name__=="__main__":
    d=json.load(open('pkg_before.json')); M={c['character_name']:c for c in d['chars']}
    bad=[g for g in GT if g[3] not in (M[g[1]][g[2]] or '')]
    print(len(GT),'items; locators missing in pre-fix text:',bad)
    from collections import Counter; print(Counter(g[0] for g in GT))
