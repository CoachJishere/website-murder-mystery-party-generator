#!/usr/bin/env python3
"""
One-off: insert the new `home` translation block into each of the 13 locale
files. Idempotent — re-running will overwrite the `home` block, leaving other
keys untouched. Preserves key ordering (places `home` right after `hero`).
"""
import json
from pathlib import Path
from collections import OrderedDict

LOCALES_DIR = Path(__file__).parent.parent / "src" / "i18n" / "locales"

# Per-locale translations for the new `home` block.
# Stats are short labels. Parallax testimonials are localized versions of the
# three real reviews shown on the homepage.
HOME_BLOCKS = {
    "en": {
        "stats": {
            "mysteriesCreated": "Mysteries Created",
            "themesPossible": "Themes Possible",
            "toGetStarted": "To Get Started",
            "minutesShort": "min",
        },
        "verifiedTrustpilotReview": "Verified Trustpilot Review",
        "watchDemo": "Watch a Demo",
        "seo": {
            "title": "Create Custom Murder Mystery Parties",
            "description": "Generate unique murder mystery party scenarios with our AI-powered tool. Customize themes, characters, and plots for unforgettable events.",
            "brand": "Murder Mystery Party Generator",
        },
        "parallaxTestimonials": {
            "sophia": {
                "text": "My work team and I had so much fun with our custom murder mystery!!! We were able to enter the location and setting of where we really were (winery in Trodos mountains, Cyprus) and put in a theme of our choice (Greek mythology) and it created something so unique. The fact that the setting matched made it feel real and super fun! Plus you get to enter the exact number of participants, so it's perfectly designed. So much better than just the generic murder mysteries I've done in the past. I highly recommend!",
                "author": "Sophia",
            },
            "will": {
                "text": "Ahhh. My wife and I had such a blast with our friends using this party package!!! I'm friends with a lot of theater geeks so many of us dressed up over the top (some hardcore nerds memorized their parts) but everyone had a lotta fun. Still talking about it weeks later and we can't wait to schedule the next one.",
                "author": "Will Treaty",
            },
            "jed": {
                "text": "Ok so I went into this pretty sceptical because I am NOT a roleplay person and my friend convinced me to do a White Lotus island one for her dinner party. I was ready to cringe the whole time. Instead I was fully absorbed for like 3 hours interrogating everyone and genuinely upset when it turned out I wasn't the murderer. Incredible. Absolutely do not sleep on this if someone suggests it.",
                "author": "Jed",
            },
        },
    },
    "es": {
        "stats": {
            "mysteriesCreated": "Misterios creados",
            "themesPossible": "Temas posibles",
            "toGetStarted": "Para empezar",
            "minutesShort": "min",
        },
        "verifiedTrustpilotReview": "Reseña verificada de Trustpilot",
        "watchDemo": "Ver una demo",
        "seo": {
            "title": "Crea fiestas personalizadas de misterio de asesinato",
            "description": "Genera escenarios únicos de fiestas de misterio con nuestra herramienta de IA. Personaliza temas, personajes y tramas para eventos inolvidables.",
            "brand": "Generador de Fiestas de Misterio de Asesinato",
        },
        "parallaxTestimonials": {
            "sophia": {
                "text": "¡¡¡Mi equipo del trabajo y yo nos divertimos muchísimo con nuestro misterio de asesinato personalizado!!! Pudimos meter la ubicación y el escenario donde realmente estábamos (un viñedo en las montañas de Tródos, Chipre) y elegir nuestro tema (mitología griega), y creó algo realmente único. Que el escenario coincidiera lo hizo sentir real y súper divertido. Además puedes poner el número exacto de participantes, así está perfectamente diseñado. ¡Muchísimo mejor que los misterios genéricos que he probado antes! Súper recomendable.",
                "author": "Sophia",
            },
            "will": {
                "text": "¡¡¡Ahhh, mi mujer y yo nos lo pasamos increíble con nuestros amigos usando este pack!!! Tengo amigos muy fans del teatro, así que muchos se disfrazaron a lo grande (algunos incluso se memorizaron sus papeles) y todo el mundo se rió un montón. Semanas después seguimos hablando de ello y ya queremos organizar el próximo.",
                "author": "Will Treaty",
            },
            "jed": {
                "text": "Vale, entré bastante escéptico porque NO soy nada de rol y mi amiga me convenció para hacer uno temático de White Lotus para su cena. Estaba listo para sentir vergüenza ajena toda la noche. En cambio, me quedé absorto durante 3 horas interrogando a todos y me dio rabia genuina cuando resultó que no era yo el asesino. Increíble. No dejes pasar esto si alguien te lo propone.",
                "author": "Jed",
            },
        },
    },
    "fr": {
        "stats": {
            "mysteriesCreated": "Mystères créés",
            "themesPossible": "Thèmes possibles",
            "toGetStarted": "Pour commencer",
            "minutesShort": "min",
        },
        "verifiedTrustpilotReview": "Avis Trustpilot vérifié",
        "watchDemo": "Voir une démo",
        "seo": {
            "title": "Créez des soirées enquête sur mesure",
            "description": "Générez des scénarios uniques de soirées enquête grâce à notre outil propulsé par l'IA. Personnalisez thèmes, personnages et intrigues pour des événements inoubliables.",
            "brand": "Générateur de Soirées Enquête",
        },
        "parallaxTestimonials": {
            "sophia": {
                "text": "Mon équipe et moi nous sommes éclatés avec notre soirée enquête personnalisée !!! On a pu indiquer le lieu et le décor où nous étions réellement (un domaine viticole dans les montagnes du Troodos, à Chypre) et choisir notre thème (mythologie grecque), ça a créé quelque chose de vraiment unique. Que le décor corresponde a rendu le tout super réaliste et fun. En plus tu mets le nombre exact de participants, donc c'est parfaitement calibré. Tellement mieux que les soirées enquête génériques que j'ai faites avant. Je recommande vivement !",
                "author": "Sophia",
            },
            "will": {
                "text": "Ahhh. Ma femme et moi avons passé une soirée géniale avec nos amis grâce à ce pack !!! J'ai pas mal d'amis fans de théâtre alors beaucoup se sont déguisés à fond (certains avaient même appris leur texte par cœur) et tout le monde s'est éclaté. On en parle encore des semaines après et on a hâte de remettre ça.",
                "author": "Will Treaty",
            },
            "jed": {
                "text": "Bon, j'y suis allé super sceptique parce que je ne suis PAS du tout du genre jeu de rôle, et une amie m'a convaincu d'en faire un sur le thème White Lotus pour son dîner. Je m'attendais à passer la soirée à être gêné. À la place, j'étais complètement absorbé pendant 3 heures à interroger tout le monde et franchement déçu de ne pas être le meurtrier. Incroyable. Si on vous propose ça, foncez.",
                "author": "Jed",
            },
        },
    },
    "de": {
        "stats": {
            "mysteriesCreated": "Erstellte Krimis",
            "themesPossible": "Mögliche Themen",
            "toGetStarted": "Für den Start",
            "minutesShort": "Min",
        },
        "verifiedTrustpilotReview": "Verifizierte Trustpilot-Bewertung",
        "watchDemo": "Demo ansehen",
        "seo": {
            "title": "Maßgeschneiderte Krimi-Dinner-Partys erstellen",
            "description": "Erstelle einzigartige Krimi-Dinner-Szenarien mit unserem KI-gestützten Tool. Themen, Charaktere und Handlungen frei anpassbar – für unvergessliche Events.",
            "brand": "Krimi-Dinner-Generator",
        },
        "parallaxTestimonials": {
            "sophia": {
                "text": "Mein Arbeitsteam und ich hatten so viel Spaß mit unserem maßgeschneiderten Krimi-Dinner!!! Wir konnten den genauen Ort und das Setting eingeben, an dem wir wirklich waren (ein Weingut in den Troodos-Bergen, Zypern), dazu unser Wunschthema (griechische Mythologie) – und es entstand etwas wirklich Einzigartiges. Dass das Setting passte, machte alles real und richtig lustig. Außerdem gibt man die genaue Teilnehmerzahl an, alles passt perfekt. Viel besser als die generischen Krimi-Dinner, die ich früher gemacht habe. Klare Empfehlung!",
                "author": "Sophia",
            },
            "will": {
                "text": "Ahhh. Meine Frau und ich hatten mit unseren Freunden so einen großartigen Abend mit diesem Paket!!! Ich habe viele Theater-Nerds als Freunde, also haben sich einige richtig hardcore verkleidet (manche haben ihre Rollen sogar auswendig gelernt) und alle hatten riesigen Spaß. Wir reden Wochen später noch davon und können den nächsten kaum erwarten.",
                "author": "Will Treaty",
            },
            "jed": {
                "text": "Also, ich bin da ziemlich skeptisch reingegangen, weil ich GAR kein Rollenspiel-Typ bin – aber eine Freundin hat mich überzeugt, einen White-Lotus-Krimi für ihr Dinner zu machen. Ich war bereit, mich den ganzen Abend zu fremdschämen. Stattdessen war ich 3 Stunden voll dabei, habe alle verhört und war ehrlich enttäuscht, dass ich nicht der Mörder war. Unfassbar gut. Wenn das jemand vorschlägt, unbedingt zusagen.",
                "author": "Jed",
            },
        },
    },
    "it": {
        "stats": {
            "mysteriesCreated": "Misteri creati",
            "themesPossible": "Temi possibili",
            "toGetStarted": "Per iniziare",
            "minutesShort": "min",
        },
        "verifiedTrustpilotReview": "Recensione Trustpilot verificata",
        "watchDemo": "Guarda una demo",
        "seo": {
            "title": "Crea feste di mistero su misura",
            "description": "Genera scenari unici di feste di mistero con il nostro strumento basato sull'IA. Personalizza temi, personaggi e trame per eventi indimenticabili.",
            "brand": "Generatore di Feste di Mistero",
        },
        "parallaxTestimonials": {
            "sophia": {
                "text": "Il mio team di lavoro e io ci siamo divertiti tantissimo con il nostro mistery party personalizzato!!! Abbiamo potuto inserire il luogo e l'ambientazione reali (una cantina sulle montagne di Troodos, a Cipro) e scegliere il nostro tema (mitologia greca), e ha creato qualcosa di davvero unico. Che l'ambientazione corrispondesse l'ha reso reale e super divertente. In più puoi inserire il numero esatto di partecipanti, quindi è perfettamente calibrato. Molto meglio dei mistery party generici che ho fatto in passato. Lo consiglio davvero!",
                "author": "Sophia",
            },
            "will": {
                "text": "Ahhh. Io e mia moglie ci siamo divertiti tantissimo con i nostri amici grazie a questo pacchetto!!! Ho parecchi amici appassionati di teatro, quindi molti si sono travestiti alla grande (alcuni hanno persino memorizzato le battute) e tutti si sono goduti la serata. A distanza di settimane ne parliamo ancora e non vediamo l'ora di organizzarne un altro.",
                "author": "Will Treaty",
            },
            "jed": {
                "text": "Ok, ci sono entrato piuttosto scettico perché NON sono per niente tipo da gioco di ruolo, e una mia amica mi ha convinto a fare un'ambientazione tipo White Lotus per la sua cena. Mi aspettavo di provare imbarazzo per tutta la sera. Invece sono rimasto completamente assorto per 3 ore a interrogare tutti, e sinceramente deluso quando ho scoperto che non ero io l'assassino. Pazzesco. Se qualcuno ve lo propone, non perdetevelo.",
                "author": "Jed",
            },
        },
    },
    "pt": {
        "stats": {
            "mysteriesCreated": "Mistérios criados",
            "themesPossible": "Temas possíveis",
            "toGetStarted": "Para começar",
            "minutesShort": "min",
        },
        "verifiedTrustpilotReview": "Avaliação verificada do Trustpilot",
        "watchDemo": "Assistir a uma demo",
        "seo": {
            "title": "Crie festas de mistério de assassinato personalizadas",
            "description": "Gere cenários únicos de festas de mistério com a nossa ferramenta baseada em IA. Personalize temas, personagens e enredos para eventos inesquecíveis.",
            "brand": "Gerador de Festas de Mistério de Assassinato",
        },
        "parallaxTestimonials": {
            "sophia": {
                "text": "Eu e a minha equipa de trabalho divertimo-nos imenso com o nosso mistério de assassinato personalizado!!! Conseguimos colocar o local e o cenário onde estávamos realmente (uma quinta vinícola nas montanhas de Troodos, em Chipre) e escolhemos o nosso tema (mitologia grega), e criou algo verdadeiramente único. O facto de o cenário coincidir tornou tudo real e super divertido. Além disso, indicas o número exato de participantes, por isso fica perfeitamente desenhado. Muito melhor do que os mistérios genéricos que já fiz. Recomendo vivamente!",
                "author": "Sophia",
            },
            "will": {
                "text": "Ahhh. Eu e a minha mulher divertimo-nos imenso com os nossos amigos com este pacote!!! Tenho muitos amigos apaixonados por teatro, por isso muitos disfarçaram-se a sério (alguns até decoraram as falas) e toda a gente se riu muito. Semanas depois ainda falamos nisto e mal podemos esperar pelo próximo.",
                "author": "Will Treaty",
            },
            "jed": {
                "text": "Então, entrei bastante céptico porque NÃO sou nada do género de role-play, e uma amiga convenceu-me a fazer um com tema de White Lotus para o jantar dela. Estava preparado para passar a noite com vergonha alheia. Em vez disso, fiquei completamente absorto durante 3 horas a interrogar toda a gente e fiquei mesmo desiludido quando descobri que não era eu o assassino. Incrível. Não recusem se alguém vos propuser isto.",
                "author": "Jed",
            },
        },
    },
    "nl": {
        "stats": {
            "mysteriesCreated": "Mysteries gemaakt",
            "themesPossible": "Mogelijke thema's",
            "toGetStarted": "Om te starten",
            "minutesShort": "min",
        },
        "verifiedTrustpilotReview": "Geverifieerde Trustpilot-review",
        "watchDemo": "Bekijk een demo",
        "seo": {
            "title": "Maak op maat gemaakte moordmysterie-feesten",
            "description": "Genereer unieke moordmysterie-scenario's met onze AI-tool. Pas thema's, personages en plots aan voor onvergetelijke evenementen.",
            "brand": "Moordmysterie-Feestgenerator",
        },
        "parallaxTestimonials": {
            "sophia": {
                "text": "Mijn werkteam en ik hebben zoveel plezier gehad met ons aangepaste moordmysterie!!! We konden de echte locatie en setting invoeren waar we waren (een wijnhuis in het Troodos-gebergte op Cyprus) en ons eigen thema kiezen (Griekse mythologie), en het creëerde iets heel unieks. Dat de setting klopte maakte het echt en super leuk. Plus je vult het exacte aantal deelnemers in, dus alles is perfect afgestemd. Veel beter dan de generieke moordmysteries die ik eerder heb gedaan. Echt een aanrader!",
                "author": "Sophia",
            },
            "will": {
                "text": "Ahhh. Mijn vrouw en ik hebben zo'n geweldige avond gehad met onze vrienden dankzij dit pakket!!! Ik heb veel theatergekke vrienden, dus velen waren helemaal verkleed (sommigen hadden hun rol zelfs uit hun hoofd geleerd) en iedereen genoot enorm. Weken later praten we er nog over en kunnen we niet wachten op de volgende.",
                "author": "Will Treaty",
            },
            "jed": {
                "text": "Oké, ik ging er behoorlijk sceptisch in omdat ik ECHT geen rollenspeltype ben, en een vriendin overtuigde me om een White Lotus-eiland-versie voor haar diner te doen. Ik was klaar om de hele avond plaatsvervangende schaamte te voelen. In plaats daarvan was ik 3 uur lang volledig opgeslorpt in iedereen ondervragen, en oprecht teleurgesteld toen bleek dat ik niet de moordenaar was. Fantastisch. Als iemand dit voorstelt, doe het.",
                "author": "Jed",
            },
        },
    },
    "da": {
        "stats": {
            "mysteriesCreated": "Mysterier skabt",
            "themesPossible": "Mulige temaer",
            "toGetStarted": "For at komme i gang",
            "minutesShort": "min",
        },
        "verifiedTrustpilotReview": "Verificeret Trustpilot-anmeldelse",
        "watchDemo": "Se en demo",
        "seo": {
            "title": "Lav skræddersyede mordmysterie-fester",
            "description": "Generer unikke mordmysterie-scenarier med vores AI-drevne værktøj. Tilpas temaer, karakterer og plots til uforglemmelige begivenheder.",
            "brand": "Mordmysterie-festgenerator",
        },
        "parallaxTestimonials": {
            "sophia": {
                "text": "Mit arbejdshold og jeg havde så meget sjov med vores skræddersyede mordmysterium!!! Vi kunne indtaste den faktiske lokation og setting, hvor vi var (en vingård i Troodos-bjergene på Cypern) og vælge vores eget tema (græsk mytologi), og det skabte noget helt unikt. At settingen passede gjorde det virkeligt og super sjovt. Plus du indtaster det præcise antal deltagere, så det er perfekt designet. Meget bedre end de generiske mordmysterier, jeg har prøvet før. Kan klart anbefales!",
                "author": "Sophia",
            },
            "will": {
                "text": "Ahhh. Min kone og jeg havde sådan en fantastisk aften med vores venner takket være denne pakke!!! Jeg har mange teaternørde-venner, så mange klædte sig helt ud (nogle havde endda lært deres roller udenad), og alle havde det vildt sjovt. Vi taler stadig om det uger efter og glæder os til næste gang.",
                "author": "Will Treaty",
            },
            "jed": {
                "text": "Okay, jeg gik ind i det ret skeptisk, fordi jeg slet IKKE er en rollespils-type, og en veninde overtalte mig til at lave en White Lotus-version til hendes middagsselskab. Jeg var klar til at krybe i 3 timer. I stedet var jeg fuldstændigt opslugt i 3 timer af at afhøre alle og oprigtigt skuffet, da det viste sig, at jeg ikke var morderen. Helt vildt. Sig ja, hvis nogen foreslår det.",
                "author": "Jed",
            },
        },
    },
    "sv": {
        "stats": {
            "mysteriesCreated": "Skapade mysterier",
            "themesPossible": "Möjliga teman",
            "toGetStarted": "För att komma igång",
            "minutesShort": "min",
        },
        "verifiedTrustpilotReview": "Verifierad Trustpilot-recension",
        "watchDemo": "Se en demo",
        "seo": {
            "title": "Skapa skräddarsydda mordmysterie-fester",
            "description": "Generera unika mordmysterie-scenarion med vårt AI-drivna verktyg. Anpassa teman, karaktärer och intriger för oförglömliga evenemang.",
            "brand": "Mordmysterie-festgenerator",
        },
        "parallaxTestimonials": {
            "sophia": {
                "text": "Mitt arbetslag och jag hade så kul med vårt skräddarsydda mordmysterium!!! Vi kunde fylla i den verkliga platsen och miljön där vi var (en vingård i Troodos-bergen på Cypern) och välja vårt eget tema (grekisk mytologi), och det skapade något helt unikt. Att miljön stämde gjorde det äkta och superkul. Dessutom anger man det exakta antalet deltagare, så allt är perfekt anpassat. Mycket bättre än de generiska mordmysterierna jag spelat tidigare. Rekommenderas verkligen!",
                "author": "Sophia",
            },
            "will": {
                "text": "Ahhh. Min fru och jag hade en så fantastisk kväll med våra vänner tack vare det här paketet!!! Jag har många teaternördsvänner, så flera klädde ut sig totalt (några hade till och med lärt sig sina repliker utantill) och alla hade jättekul. Vi pratar fortfarande om det veckor senare och längtar tills vi kan göra om det.",
                "author": "Will Treaty",
            },
            "jed": {
                "text": "Okej, jag gick in i det ganska skeptisk eftersom jag verkligen INTE är någon rollspelstyp, och en vän övertalade mig att göra en White Lotus-version till hennes middag. Jag var beredd på att skämmas hela kvällen. Istället var jag helt uppslukad i 3 timmar av att förhöra alla och uppriktigt besviken när det visade sig att jag inte var mördaren. Helt otroligt. Tacka ja om någon föreslår det.",
                "author": "Jed",
            },
        },
    },
    "fi": {
        "stats": {
            "mysteriesCreated": "Luotuja mysteerejä",
            "themesPossible": "Mahdollisia teemoja",
            "toGetStarted": "Aloittamiseen",
            "minutesShort": "min",
        },
        "verifiedTrustpilotReview": "Vahvistettu Trustpilot-arvostelu",
        "watchDemo": "Katso demo",
        "seo": {
            "title": "Luo räätälöityjä murhamysteeri-juhlia",
            "description": "Luo ainutlaatuisia murhamysteeri-skenaarioita tekoälypohjaisella työkalullamme. Mukauta teemat, hahmot ja juonet unohtumattomiin tapahtumiin.",
            "brand": "Murhamysteeri-juhlageneraattori",
        },
        "parallaxTestimonials": {
            "sophia": {
                "text": "Työporukkani kanssa meillä oli niin hauskaa räätälöidyn murhamysteerimme parissa!!! Pystyimme syöttämään todellisen sijainnin ja ympäristön, jossa olimme (viinitila Troodos-vuoristossa Kyproksella) ja valitsemaan oman teeman (kreikkalainen mytologia), ja se loi jotain todella ainutlaatuista. Se että ympäristö vastasi todellisuutta teki kokemuksesta aidon ja superhauskan. Lisäksi voit antaa tarkan osallistujamäärän, joten kaikki on täydellisesti suunniteltu. Paljon parempi kuin geneeriset murhamysteerit, joita olen aiemmin kokeillut. Suosittelen vahvasti!",
                "author": "Sophia",
            },
            "will": {
                "text": "Ahhh. Vaimoni kanssa meillä oli mahtava ilta ystäviemme kanssa tämän paketin avulla!!! Minulla on paljon teatterihullu-ystäviä, joten monet pukeutuivat täysillä (osa oli jopa opetellut osansa ulkoa) ja kaikilla oli mahtavaa. Puhumme siitä yhä viikkojen jälkeen, ja odotamme jo seuraavaa.",
                "author": "Will Treaty",
            },
            "jed": {
                "text": "Okei, lähdin mukaan aika skeptisenä, koska EN todellakaan ole roolipelaaja-tyyppiä, ja eräs ystävä suostutteli minut tekemään White Lotus -aiheisen illallisilleen. Olin valmistautunut myötähäpeään koko illan. Sen sijaan olin täysin uppoutunut kolmen tunnin ajan kaikkien kuulusteluun, ja olin aidosti pettynyt, kun selvisi etten ollutkaan murhaaja. Uskomatonta. Älkää jättäkö väliin, jos joku tätä ehdottaa.",
                "author": "Jed",
            },
        },
    },
    "ko": {
        "stats": {
            "mysteriesCreated": "생성된 미스터리",
            "themesPossible": "가능한 테마",
            "toGetStarted": "시작까지",
            "minutesShort": "분",
        },
        "verifiedTrustpilotReview": "검증된 Trustpilot 리뷰",
        "watchDemo": "데모 보기",
        "seo": {
            "title": "맞춤형 머더 미스터리 파티 만들기",
            "description": "AI 기반 도구로 독창적인 머더 미스터리 파티 시나리오를 생성하세요. 테마, 캐릭터, 줄거리를 자유롭게 커스터마이즈해 잊지 못할 이벤트를 만드세요.",
            "brand": "머더 미스터리 파티 생성기",
        },
        "parallaxTestimonials": {
            "sophia": {
                "text": "저희 팀과 맞춤형 머더 미스터리로 정말 즐거운 시간을 보냈어요!!! 실제로 저희가 있었던 위치와 배경(키프로스 트로도스 산맥의 와이너리)을 입력하고 원하는 테마(그리스 신화)를 골랐더니 정말 독창적인 작품이 만들어졌어요. 배경이 실제와 일치하니 현실감 있고 정말 재미있었어요. 게다가 정확한 참가자 수를 입력할 수 있어서 완벽하게 설계됐어요. 예전에 해본 일반적인 머더 미스터리보다 훨씬 좋았어요. 강력 추천합니다!",
                "author": "소피아",
            },
            "will": {
                "text": "아아. 아내와 친구들과 함께 이 패키지로 정말 즐거운 시간을 보냈어요!!! 연극 마니아 친구들이 많아서 다들 본격적으로 분장하고 (일부는 대사까지 외워서) 모두가 엄청 웃었어요. 몇 주가 지난 지금도 그 얘기를 하고 있고, 다음 모임이 너무 기대돼요.",
                "author": "윌 트리티",
            },
            "jed": {
                "text": "솔직히 저는 롤플레이 타입이 전혀 아니라 굉장히 회의적이었는데, 친구가 저녁 모임에서 화이트 로터스 섬 컨셉으로 해보자고 설득했어요. 저녁 내내 민망할 줄 알았는데, 오히려 3시간 동안 모든 사람을 심문하느라 완전히 몰입했고, 제가 범인이 아니라는 게 밝혀지자 정말 아쉬워했어요. 정말 대단해요. 누가 제안하면 절대 거절하지 마세요.",
                "author": "제드",
            },
        },
    },
    "ja": {
        "stats": {
            "mysteriesCreated": "作成されたミステリー",
            "themesPossible": "可能なテーマ",
            "toGetStarted": "開始まで",
            "minutesShort": "分",
        },
        "verifiedTrustpilotReview": "Trustpilot認証済みレビュー",
        "watchDemo": "デモを見る",
        "seo": {
            "title": "オリジナルのマーダーミステリーパーティーを作成",
            "description": "AIを活用したツールでユニークなマーダーミステリーシナリオを生成。テーマ、キャラクター、プロットを自由にカスタマイズして、忘れられないイベントを。",
            "brand": "マーダーミステリーパーティー・ジェネレーター",
        },
        "parallaxTestimonials": {
            "sophia": {
                "text": "職場のチームと一緒に作ったオリジナルのマーダーミステリーで本当に盛り上がりました!!! 実際にいた場所と設定（キプロスのトロードス山中のワイナリー）を入力し、好きなテーマ（ギリシャ神話）を選んだら、本当にユニークな作品が出来上がりました。設定が実際と一致しているのでリアルでとても楽しかったです。さらに参加人数を正確に指定できるので、完璧に設計されています。これまでにやった一般的なマーダーミステリーよりずっと良かったです。強くお勧めします！",
                "author": "ソフィア",
            },
            "will": {
                "text": "ああ。妻と友人たちと、このパッケージを使って最高の夜を過ごしました!!! 演劇好きの友人が多くて、何人かは本気で仮装し（中にはセリフを暗記してきた人も）、みんな大爆笑でした。何週間経った今も話題になっていて、次回が待ちきれません。",
                "author": "ウィル・トリーティ",
            },
            "jed": {
                "text": "正直、僕はロールプレイ系が全然タイプじゃないので相当懐疑的だったんですが、友人にディナーパーティーでホワイト・ロータス島テーマをやろうと説得されました。一晩中気まずい思いをする覚悟でした。ところが、3時間ずっと夢中で全員を尋問して、自分が犯人じゃないと分かって本気でガッカリしたほど。すごいです。誰かに誘われたら絶対に逃さないでください。",
                "author": "ジェド",
            },
        },
    },
    "zh-cn": {
        "stats": {
            "mysteriesCreated": "已创建的谜案",
            "themesPossible": "可选主题",
            "toGetStarted": "即可开始",
            "minutesShort": "分钟",
        },
        "verifiedTrustpilotReview": "Trustpilot 已验证评价",
        "watchDemo": "观看演示",
        "seo": {
            "title": "定制专属谋杀谜案派对",
            "description": "使用我们的 AI 工具生成独一无二的谋杀谜案派对剧本。自定义主题、角色和情节,打造难忘的活动。",
            "brand": "谋杀谜案派对生成器",
        },
        "parallaxTestimonials": {
            "sophia": {
                "text": "我和工作团队用定制的谋杀谜案玩得超级开心!!! 我们可以输入实际所在的地点和场景(塞浦路斯特罗多斯山区的酒庄),并选择自己想要的主题(希腊神话),结果生成的剧本独一无二。场景和实际一致让整个体验非常真实又好玩。而且能精确输入参与人数,设计得刚刚好。比我以前玩过的通用版谋杀谜案好太多了。强烈推荐!",
                "author": "Sophia",
            },
            "will": {
                "text": "啊啊啊。我和老婆与朋友们用这个套装度过了超棒的一晚!!! 我有很多戏剧迷朋友,所以很多人都全副武装地装扮(有几个甚至背下了台词),大家都笑翻了。几周过去了我们还在聊这件事,迫不及待想再来一次。",
                "author": "Will Treaty",
            },
            "jed": {
                "text": "好吧,我一开始相当怀疑,因为我完全不是角色扮演型的人,但朋友说服我在她的晚餐派对上玩一个《白莲花度假村》风格的版本。我做好了整晚尴尬的准备。结果我完全沉浸了 3 个小时不停审问每一个人,得知我不是凶手时还真的有点失望。太棒了。要是有人提议,千万别错过。",
                "author": "Jed",
            },
        },
    },
}


def merge_home(target: dict, home_block: dict) -> dict:
    """Replace target['home'] with home_block, preserving order: place 'home'
    immediately after 'hero' if hero exists, else after the first key."""
    result = OrderedDict()
    inserted = False
    for k, v in target.items():
        if k == "home":
            continue  # we'll insert ours
        result[k] = v
        if not inserted and k == "hero":
            result["home"] = home_block
            inserted = True
    if not inserted:
        result["home"] = home_block
    return result


def main():
    for locale_code, home_block in HOME_BLOCKS.items():
        path = LOCALES_DIR / f"{locale_code}.json"
        if not path.exists():
            print(f"  SKIP: {path} (file not found)")
            continue
        with path.open("r", encoding="utf-8") as f:
            data = json.load(f, object_pairs_hook=OrderedDict)
        merged = merge_home(data, home_block)
        with path.open("w", encoding="utf-8") as f:
            json.dump(merged, f, ensure_ascii=False, indent=2)
            f.write("\n")
        print(f"  OK:   {path.name}")


if __name__ == "__main__":
    main()
