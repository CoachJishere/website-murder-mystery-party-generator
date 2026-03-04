import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const slugs = [
  '5-beach-resort-murder-mystery-themes-that-will-make-your-vacation-unforgettable',
  '5-casino-murder-mystery-party-themes-roll-the-dice-on-deadly-high-stakes-drama',
  '5-haunted-mansion-murder-mystery-themes',
  '5-mountain-lodge-murder-mystery-themes-that-will-make-your-retreat-unforgettable',
  '5-renaissance-murder-mystery-party-themes'
];

async function fetchEnglishPost(slug) {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .eq('language', 'en')
    .single();
  
  if (error) throw error;
  return data;
}

async function translatePost(englishPost) {
  const content = englishPost.content;
  
  // Translation mapping for each post
  const translations = {
    '5-beach-resort-murder-mystery-themes-that-will-make-your-vacation-unforgettable': {
      title: '5 Temas de Misterio y Asesinato en Resort de Playa que Harán tu Vacación Inolvidable',
      content: content
        .replace(/\*Published: February 16, 2026 \| Last Updated: February 20, 2026 \| Author: Mystery Maker Party Team \| Next Review: May 20, 2026\*/g, 
          '*Publicado: 16 de febrero de 2026 | Actualizado: 20 de febrero de 2026 | Autor: Equipo de Mystery Maker Party | Próxima revisión: 20 de mayo de 2026*')
        .replace(/\*Based on analysis of 10,000\+ murder mystery parties and research into beach resorts, tropical getaways, and coastal entertainment\.\*/g,
          '*Basado en el análisis de más de 10,000 fiestas de misterio y asesinato e investigación sobre resorts de playa, escapadas tropicales y entretenimiento costero.*')
        .replace(/# 5 Beach Resort Murder Mystery Themes That Will Make Your Vacation Unforgettable/g,
          '# 5 Temas de Misterio y Asesinato en Resort de Playa que Harán tu Vacación Inolvidable')
        .replace(/Paradise has a dark side\. Your beachfront villa overlooks crystal-clear waters, palm trees sway in the tropical breeze, and somewhere between the poolside cabanas and the sunset cocktails\.\.\. someone has committed murder\./g,
          'El paraíso tiene un lado oscuro. Tu villa frente a la playa con vista a aguas cristalinas, palmeras que se mecen con la brisa tropical, y en algún lugar entre las cabañas junto a la piscina y los cócteles al atardecer... alguien ha cometido un asesinato.')
        .replace(/Beach resort murder mysteries transform your vacation into an interactive whodunit where every guest becomes a suspect, and solving the crime is just as important as catching the perfect tan\. Whether you're planning a corporate retreat, a destination wedding, or a family reunion with a twist, these five themes will turn your tropical getaway into an unforgettable murder mystery experience\./g,
          'Los misterios de asesinato en resorts de playa transforman tus vacaciones en un "whodunit" interactivo donde cada huésped se convierte en sospechoso, y resolver el crimen es tan importante como lograr el bronceado perfecto. Ya sea que estés planeando un retiro corporativo, una boda destino o una reunión familiar con un giro, estos cinco temas convertirán tu escapada tropical en una experiencia de misterio inolvidable.')
        .replace(/## Why Beach Resorts Are Perfect for Murder Mystery Parties/g,
          '## Por Qué los Resorts de Playa son Perfectos para Fiestas de Misterio y Asesinato')
        .replace(/Beach resorts offer everything a murder mystery party needs: multiple atmospheric locations \(beach, pool, restaurant, bar\), a captive audience of guests looking for entertainment, and a relaxed atmosphere that makes role-playing feel natural rather than forced\./g,
          'Los resorts de playa ofrecen todo lo que necesita una fiesta de misterio: múltiples ubicaciones atmosféricas (playa, piscina, restaurante, bar), una audiencia cautiva de huéspedes buscando entretenimiento, y una atmósfera relajada que hace que la interpretación de roles se sienta natural en lugar de forzada.')
        .replace(/The combination of vacation mindset and contained environment creates ideal conditions for immersive storytelling\. Guests are already away from their daily routines, making them more open to stepping into character\. The resort setting naturally limits suspects to "guests and staff," creating the closed-circle mystery format that makes classic whodunits so satisfying\./g,
          'La combinación de mentalidad vacacional y ambiente contenido crea condiciones ideales para narrativas inmersivas. Los huéspedes ya están lejos de sus rutinas diarias, haciéndolos más abiertos a interpretar personajes. El entorno del resort limita naturalmente a los sospechosos a "huéspedes y personal", creando el formato de misterio de círculo cerrado que hace que los whodunits clásicos sean tan satisfactorios.')
        .replace(/## The 5 Best Beach Resort Murder Mystery Themes/g,
          '## Los 5 Mejores Temas de Misterio y Asesinato en Resorts de Playa')
        .replace(/### 1\. Death in Paradise: Tropical Island Murder/g,
          '### 1. Muerte en el Paraíso: Asesinato en Isla Tropical')
        .replace(/\*\*The Setup:\*\* A tech billionaire has gathered investors, business rivals, and family members at an exclusive private island resort to announce a revolutionary new product\. During the champagne toast at sunset, he collapses—poisoned\. Every guest had access to his drink, and everyone had a motive\./g,
          '**La Configuración:** Un multimillonario tecnológico ha reunido inversores, rivales comerciales y miembros de su familia en un resort exclusivo en una isla privada para anunciar un producto revolucionario. Durante el brindis de champán al atardecer, colapsa—envenenado. Cada huésped tuvo acceso a su bebida, y todos tenían un motivo.')
        .replace(/\*\*Key Characters:\*\*/g, '**Personajes Clave:**')
        .replace(/- \*\*Victor Sterling\*\* \(the victim\): Tech billionaire with more enemies than friends/g,
          '- **Victor Sterling** (la víctima): Multimillonario tecnológico con más enemigos que amigos')
        .replace(/- \*\*Marina Sterling\*\*: Trophy wife thirty years his junior, recently discovered she wasn't included in the will/g,
          '- **Marina Sterling**: Esposa trofeo treinta años más joven, recientemente descubrió que no estaba incluida en el testamento')
        .replace(/- \*\*Blake Chen\*\*: Business partner who was about to be bought out against his will/g,
          '- **Blake Chen**: Socio comercial que estaba a punto de ser comprado en contra de su voluntad')
        .replace(/- \*\*Dr\. Simone Baptiste\*\*: Resort doctor who treated Victor for "food poisoning" the previous day/g,
          '- **Dr. Simone Baptiste**: Doctora del resort que trató a Victor por "intoxicación alimentaria" el día anterior')
        .replace(/- \*\*Rafael Santos\*\*: Head bartender who was seen arguing with Victor about a "personal matter"/g,
          '- **Rafael Santos**: Barman principal que fue visto discutiendo con Victor sobre un "asunto personal"')
        .replace(/- \*\*Jade Sterling\*\*: Victor's daughter from his first marriage, who stands to inherit everything/g,
          '- **Jade Sterling**: Hija de Victor de su primer matrimonio, quien heredará todo')
        .replace(/\*\*Perfect For:\*\* Groups who want a classic "everyone's a suspect" mystery with tropical atmosphere and multiple potential motives \(greed, revenge, jealousy\)\./g,
          '**Perfecto Para:** Grupos que quieren un misterio clásico de "todos son sospechosos" con atmósfera tropical y múltiples motivos potenciales (codicia, venganza, celos).')
        .replace(/\*\*Special Elements:\*\*/g, '**Elementos Especiales:**')
        .replace(/- Clues hidden in beach activities \(message in a bottle, footprints in the sand\)/g,
          '- Pistas ocultas en actividades de playa (mensaje en una botella, huellas en la arena)')
        .replace(/- Poolside interrogation sessions/g, '- Sesiones de interrogatorio junto a la piscina')
        .replace(/- Sunset reveal ceremony with dramatic ocean backdrop/g,
          '- Ceremonia de revelación al atardecer con dramático fondo oceánico')
        .replace(/### 2\. Killer Waves: Surf Competition Sabotage/g,
          '### 2. Olas Asesinas: Sabotaje en Competencia de Surf')
        .replace(/\*\*The Setup:\*\* The annual International Surf Championship has brought top surfers from around the world to a legendary beach break\. When the defending champion is found dead in the water with suspicious injuries, the competition becomes a crime scene\. Was it a surfing accident, or did someone ensure their biggest rival wouldn't make it to the finals\?/g,
          '**La Configuración:** El Campeonato Internacional de Surf anual ha traído a los mejores surfistas de todo el mundo a una legendaria rompiente de playa. Cuando el campeón defensor es encontrado muerto en el agua con lesiones sospechosas, la competencia se convierte en escena del crimen. ¿Fue un accidente de surf, o alguien se aseguró de que su mayor rival no llegara a las finales?')
        .replace(/\*\*Key Characters:\*\*/g, '**Personajes Clave:**')
        .replace(/- \*\*Kai "The King" Nakamoto\*\* \(the victim\): Three-time champion, known for trash-talking competitors/g,
          '- **Kai "The King" Nakamoto** (la víctima): Campeón tres veces, conocido por hablar mal de los competidores')
        .replace(/- \*\*Luna Rodriguez\*\*: Rising star who lost a sponsorship deal to Kai last year/g,
          '- **Luna Rodriguez**: Estrella en ascenso que perdió un contrato de patrocinio ante Kai el año pasado')
        .replace(/- \*\*Marcus "Reef" Thornton\*\*: Kai's former best friend and surfing partner, now bitter rivals/g,
          '- **Marcus "Reef" Thornton**: Ex mejor amigo y compañero de surf de Kai, ahora rivales amargos')
        .replace(/- \*\*Destiny Wright\*\*: Kai's girlfriend and fellow pro surfer who has her own secrets/g,
          '- **Destiny Wright**: Novia de Kai y surfista profesional con sus propios secretos')
        .replace(/- \*\*Coach Rick Paulson\*\*: Former champion who trained Kai but was recently fired/g,
          '- **Coach Rick Paulson**: Ex campeón que entrenó a Kai pero fue despedido recientemente')
        .replace(/- \*\*Zara Kim\*\*: Competition organizer facing bankruptcy if this event fails/g,
          '- **Zara Kim**: Organizadora de la competencia enfrentando bancarrota si este evento falla')
        .replace(/\*\*Perfect For:\*\* Active groups, younger crowds, or anyone who wants to incorporate beach sports into their mystery experience\./g,
          '**Perfecto Para:** Grupos activos, multitudes más jóvenes, o cualquiera que quiera incorporar deportes de playa en su experiencia de misterio.')
        .replace(/\*\*Special Elements:\*\*/g, '**Elementos Especiales:**')
        .replace(/- Actual surfing demonstrations or beach competitions as part of the mystery/g,
          '- Demostraciones reales de surf o competencias de playa como parte del misterio')
        .replace(/- Clues related to surf equipment, wax, boards/g,
          '- Pistas relacionadas con equipo de surf, cera, tablas')
        .replace(/- Beach bonfire interrogation scene/g, '- Escena de interrogatorio en fogata en la playa')
        .replace(/- Documentary-style "interviews" with suspects/g,
          '- "Entrevistas" estilo documental con sospechosos')
        .replace(/### 3\. Lethal Luau: Murder at the Polynesian Paradise/g,
          '### 3. Luau Letal: Asesinato en el Paraíso Polinesio')
        .replace(/\*\*The Setup:\*\* A resort's grand luau celebration attracts hundreds of guests for fire dancers, traditional feast, and Polynesian entertainment\. When the resort's controversial owner is found dead backstage—killed with a ceremonial Polynesian weapon—everyone from staff to performers to angry locals becomes a suspect\./g,
          '**La Configuración:** La gran celebración de luau de un resort atrae a cientos de huéspedes para bailarines de fuego, festín tradicional y entretenimiento polinesio. Cuando el controvertido dueño del resort es encontrado muerto detrás del escenario—asesinado con un arma ceremonial polinesia—todos desde el personal hasta los artistas y lugareños enojados se convierten en sospechosos.')
        .replace(/\*\*Key Characters:\*\*/g, '**Personajes Clave:**')
        .replace(/- \*\*Richard "Big Rick" Malone\*\* \(the victim\): Resort owner accused of exploiting Hawaiian culture/g,
          '- **Richard "Big Rick" Malone** (la víctima): Dueño del resort acusado de explotar la cultura hawaiana')
        .replace(/- \*\*Kaimana Akana\*\*: Native Hawaiian performer and cultural consultant who opposed the resort's expansion/g,
          '- **Kaimana Akana**: Artista nativo hawaiano y consultor cultural que se opuso a la expansión del resort')
        .replace(/- \*\*Veronica Malone\*\*: Big Rick's ex-wife who still owns 40% of the resort/g,
          '- **Veronica Malone**: Ex esposa de Big Rick que aún posee el 40% del resort')
        .replace(/- \*\*Tessa Brighton\*\*: Environmental activist who blamed the resort for coral reef damage/g,
          '- **Tessa Brighton**: Activista ambiental que culpó al resort por daño al arrecife de coral')
        .replace(/- \*\*Paulo Nakoa\*\*: Head chef who discovered Big Rick was adulterating "authentic" Hawaiian dishes/g,
          '- **Paulo Nakoa**: Chef principal que descubrió que Big Rick estaba adulterando platos hawaianos "auténticos"')
        .replace(/- \*\*Aria Santos\*\*: Resort manager and Big Rick's secret romantic partner/g,
          '- **Aria Santos**: Gerente del resort y pareja romántica secreta de Big Rick')
        .replace(/\*\*Perfect For:\*\* Groups who want cultural elements, dramatic performances, and themes of authenticity vs\. commercialization\./g,
          '**Perfecto Para:** Grupos que quieren elementos culturales, actuaciones dramáticas y temas de autenticidad vs. comercialización.')
        .replace(/\*\*Special Elements:\*\*/g, '**Elementos Especiales:**')
        .replace(/- Actual luau performance with fire dancers and drummers/g,
          '- Actuación real de luau con bailarines de fuego y percusionistas')
        .replace(/- Traditional Hawaiian feast as part of the experience/g,
          '- Festín hawaiano tradicional como parte de la experiencia')
        .replace(/- Clues hidden in lei, tiki torches, and ceremonial objects/g,
          '- Pistas ocultas en lei, antorchas tiki y objetos ceremoniales')
        .replace(/- Cultural education woven into the mystery/g,
          '- Educación cultural entrelazada en el misterio')
        .replace(/### 4\. Deadly Dive: Scuba Expedition Gone Wrong/g,
          '### 4. Buceo Mortal: Expedición de Buceo Salió Mal')
        .replace(/\*\*The Setup:\*\* An exclusive scuba diving expedition to explore a newly discovered shipwreck brings together treasure hunters, marine biologists, and wealthy adventure tourists\. When the expedition leader surfaces dead with his oxygen tank sabotaged, the remaining divers realize someone will kill to keep the shipwreck's secrets hidden\./g,
          '**La Configuración:** Una exclusiva expedición de buceo para explorar un naufragio recién descubierto reúne a cazadores de tesoros, biólogos marinos y turistas de aventura adinerados. Cuando el líder de la expedición emerge muerto con su tanque de oxígeno saboteado, los buzos restantes se dan cuenta de que alguien matará para mantener ocultos los secretos del naufragio.')
        .replace(/\*\*Key Characters:\*\*/g, '**Personajes Clave:**')
        .replace(/- \*\*Captain James "Salty" Morgan\*\* \(the victim\): Legendary dive master who discovered the wreck's location/g,
          '- **Capitán James "Salty" Morgan** (la víctima): Legendario maestro de buceo que descubrió la ubicación del naufragio')
        .replace(/- \*\*Dr\. Olivia Chen\*\*: Marine archaeologist who believes the wreck should be protected, not plundered/g,
          '- **Dr. Olivia Chen**: Arqueóloga marina que cree que el naufragio debe ser protegido, no saqueado')
        .replace(/- \*\*Jack "Treasure" Harrington\*\*: Professional salvage diver with a criminal past/g,
          '- **Jack "Treasure" Harrington**: Buzo profesional de salvamento con un pasado criminal')
        .replace(/- \*\*Nicole Dumont\*\*: Wealthy widow who funded the expedition and wants to recover her ancestor's lost fortune/g,
          '- **Nicole Dumont**: Viuda adinerada que financió la expedición y quiere recuperar la fortuna perdida de su ancestro')
        .replace(/- \*\*Rashid Al-Farsi\*\*: Rival treasure hunter who was denied permission to explore the wreck/g,
          '- **Rashid Al-Farsi**: Cazador de tesoros rival a quien se le negó permiso para explorar el naufragio')
        .replace(/- \*\*Emma Rodriguez\*\*: Dive equipment technician responsible for all the gear/g,
          '- **Emma Rodriguez**: Técnica de equipo de buceo responsable de todo el equipo')
        .replace(/\*\*Perfect For:\*\* Groups interested in adventure themes, maritime history, or treasure-hunting narratives\./g,
          '**Perfecto Para:** Grupos interesados en temas de aventura, historia marítima o narrativas de caza de tesoros.')
        .replace(/\*\*Special Elements:\*\*/g, '**Elementos Especiales:**')
        .replace(/- Underwater photography as "evidence" of what divers found/g,
          '- Fotografía submarina como "evidencia" de lo que encontraron los buzos')
        .replace(/- Technical diving equipment as potential murder weapons\/tools/g,
          '- Equipo técnico de buceo como posibles armas del crimen/herramientas')
        .replace(/- Shipwreck artifacts as clues/g, '- Artefactos del naufragio como pistas')
        .replace(/- Pool or snorkeling activity as part of the investigation/g,
          '- Actividad de piscina o snorkel como parte de la investigación')
        .replace(/### 5\. Sunset Soiree Slaying: Cocktail Party Murder/g,
          '### 5. Asesinato en la Fiesta al Atardecer: Crimen en la Fiesta de Cócteles')
        .replace(/\*\*The Setup:\*\* The resort's exclusive members-only beach club hosts its annual sunset cocktail party—the social event of the season where deals are made and reputations are built or destroyed\. When the club's president is found dead in the beach cabana, the pristine white sand paradise becomes a crime scene, and every perfectly-dressed guest has something to hide\./g,
          '**La Configuración:** El exclusivo club de playa solo para miembros del resort organiza su fiesta anual de cócteles al atardecer—el evento social de la temporada donde se hacen negocios y se construyen o destruyen reputaciones. Cuando el presidente del club es encontrado muerto en la cabaña de playa, el paraíso de arena blanca inmaculada se convierte en escena del crimen, y cada huésped perfectamente vestido tiene algo que ocultar.')
        .replace(/\*\*Key Characters:\*\*/g, '**Personajes Clave:**')
        .replace(/- \*\*Reginald "Reggie" Worthington III\*\* \(the victim\): Club president and social gatekeeper/g,
          '- **Reginald "Reggie" Worthington III** (la víctima): Presidente del club y guardián social')
        .replace(/- \*\*Vivienne Beaumont\*\*: Society columnist who Reggie threatened to blackball/g,
          '- **Vivienne Beaumont**: Columnista de sociedad a quien Reggie amenazó con vetar')
        .replace(/- \*\*Charles Montgomery\*\*: Rival for club presidency and Reggie's business competitor/g,
          '- **Charles Montgomery**: Rival por la presidencia del club y competidor comercial de Reggie')
        .replace(/- \*\*Sabrina Wells\*\*: Young socialite whose membership application Reggie rejected/g,
          '- **Sabrina Wells**: Joven de la alta sociedad cuya solicitud de membresía Reggie rechazó')
        .replace(/- \*\*Diego Martinez\*\*: Head server who overheard all the club's secrets/g,
          '- **Diego Martinez**: Mesero principal que escuchó todos los secretos del club')
        .replace(/- \*\*Patricia Worthington\*\*: Reggie's wife who recently discovered his affair/g,
          '- **Patricia Worthington**: Esposa de Reggie que recientemente descubrió su aventura')
        .replace(/\*\*Perfect For:\*\* Groups who enjoy upscale, sophisticated mysteries with social intrigue and elegant settings\./g,
          '**Perfecto Para:** Grupos que disfrutan misterios sofisticados de lujo con intriga social y entornos elegantes.')
        .replace(/\*\*Special Elements:\*\*/g, '**Elementos Especiales:**')
        .replace(/- Formal dress code \(resort elegant\/cocktail attire\)/g,
          '- Código de vestimenta formal (elegante de resort/atuendo de cóctel)')
        .replace(/- Actual craft cocktails served with clues in the garnishes or names/g,
          '- Cócteles artesanales reales servidos con pistas en las guarniciones o nombres')
        .replace(/- Society gossip and social media posts as evidence/g,
          '- Chismes de sociedad y publicaciones en redes sociales como evidencia')
        .replace(/- Dramatic sunset timeline \(murder occurred as sun touched the horizon\)/g,
          '- Línea de tiempo dramática al atardecer (el asesinato ocurrió cuando el sol tocó el horizonte)')
        .replace(/## How to Adapt These Themes to Your Beach Resort/g,
          '## Cómo Adaptar Estos Temas a tu Resort de Playa')
        .replace(/### Location Considerations/g, '### Consideraciones de Ubicación')
        .replace(/Each theme can be customized based on your specific resort layout:/g,
          'Cada tema puede personalizarse según el diseño específico de tu resort:')
        .replace(/- \*\*Large resorts\*\*: Use multiple locations \(beach, pool, restaurants\) for different scenes/g,
          '- **Resorts grandes**: Usa múltiples ubicaciones (playa, piscina, restaurantes) para diferentes escenas')
        .replace(/- \*\*Boutique resorts\*\*: Focus the mystery in one main area with intimate character interactions/g,
          '- **Resorts boutique**: Enfoca el misterio en un área principal con interacciones íntimas de personajes')
        .replace(/- \*\*All-inclusive resorts\*\*: Incorporate scheduled activities \(snorkeling, beach volleyball\) into clue discovery/g,
          '- **Resorts todo incluido**: Incorpora actividades programadas (snorkel, voleibol de playa) en el descubrimiento de pistas')
        .replace(/- \*\*Destination weddings\*\*: Frame the mystery around the wedding party with guests as suspects/g,
          '- **Bodas destino**: Enmarca el misterio alrededor de la fiesta de bodas con huéspedes como sospechosos')
        .replace(/### Timing Your Mystery/g, '### Cronometrando tu Misterio')
        .replace(/Beach resort mysteries work best when integrated into the vacation schedule:/g,
          'Los misterios en resorts de playa funcionan mejor cuando se integran en el horario de vacaciones:')
        .replace(/- \*\*Weekend mystery\*\*: Introduction Friday evening, investigation Saturday, reveal Saturday night/g,
          '- **Misterio de fin de semana**: Introducción viernes por la noche, investigación sábado, revelación sábado por la noche')
        .replace(/- \*\*Single evening\*\*: Compressed 3-4 hour experience during dinner and evening activities/g,
          '- **Una sola noche**: Experiencia comprimida de 3-4 horas durante la cena y actividades nocturnas')
        .replace(/- \*\*Week-long mystery\*\*: Clues revealed gradually throughout the vacation with final reveal at farewell dinner/g,
          '- **Misterio de una semana**: Pistas reveladas gradualmente durante las vacaciones con revelación final en la cena de despedida')
        .replace(/### Working with Resort Staff/g, '### Trabajando con el Personal del Resort')
        .replace(/Successful beach resort mysteries require coordination with resort operations:/g,
          'Los misterios exitosos en resorts de playa requieren coordinación con las operaciones del resort:')
        .replace(/- Brief key staff \(servers, bartenders, activities coordinators\) on their roles/g,
          '- Instruye al personal clave (meseros, bartenders, coordinadores de actividades) sobre sus roles')
        .replace(/- Schedule mystery activities around regular resort programming/g,
          '- Programa actividades de misterio alrededor de la programación regular del resort')
        .replace(/- Designate spaces for private interrogations and clue discovery/g,
          '- Designa espacios para interrogatorios privados y descubrimiento de pistas')
        .replace(/- Coordinate with kitchen for any themed meals or signature cocktails/g,
          '- Coordina con la cocina para cualquier comida temática o cócteles especiales')
        .replace(/## Essential Props and Materials/g, '## Materiales y Accesorios Esenciales')
        .replace(/### Universal Beach Mystery Props/g, '### Accesorios Universales para Misterios de Playa')
        .replace(/- Character description cards \(waterproof laminated versions for beach use\)/g,
          '- Tarjetas de descripción de personajes (versiones laminadas resistentes al agua para uso en la playa)')
        .replace(/- Sealed clue envelopes \(stored in waterproof container\)/g,
          '- Sobres de pistas sellados (almacenados en contenedor resistente al agua)')
        .replace(/- "Crime scene" markers \(decorative elements that don't disrupt resort aesthetics\)/g,
          '- Marcadores de "escena del crimen" (elementos decorativos que no interrumpen la estética del resort)')
        .replace(/- Detective notebooks for guests to record clues/g,
          '- Cuadernos de detective para que los huéspedes registren pistas')
        .replace(/- Timeline board showing character movements/g,
          '- Tablero de línea de tiempo mostrando movimientos de personajes')
        .replace(/### Theme-Specific Items/g, '### Artículos Específicos del Tema')
        .replace(/\*\*Death in Paradise:\*\*/g, '**Muerte en el Paraíso:**')
        .replace(/- Champagne glasses with "poison" residue \(food coloring\)/g,
          '- Copas de champán con residuo de "veneno" (colorante alimentario)')
        .replace(/- Investment documents and corporate secrets/g,
          '- Documentos de inversión y secretos corporativos')
        .replace(/- Island map showing private locations/g,
          '- Mapa de la isla mostrando ubicaciones privadas')
        .replace(/\*\*Killer Waves:\*\*/g, '**Olas Asesinas:**')
        .replace(/- Surfboards with competition numbers/g, '- Tablas de surf con números de competencia')
        .replace(/- Damaged surf leash or fin \(potential evidence\)/g,
          '- Correa de surf o aleta dañada (evidencia potencial)')
        .replace(/- Competition brackets and sponsorship contracts/g,
          '- Brackets de competencia y contratos de patrocinio')
        .replace(/- GoPro "footage" \(photos\) of final surf session/g,
          '- "Grabación" de GoPro (fotos) de la última sesión de surf')
        .replace(/\*\*Lethal Luau:\*\*/g, '**Luau Letal:**')
        .replace(/- Ceremonial Polynesian weapons \(decorative replicas\)/g,
          '- Armas ceremoniales polinesias (réplicas decorativas)')
        .replace(/- Traditional lei with hidden message/g, '- Lei tradicional con mensaje oculto')
        .replace(/- Cultural appropriation protest materials/g,
          '- Materiales de protesta de apropiación cultural')
        .replace(/- Resort expansion plans/g, '- Planes de expansión del resort')
        .replace(/\*\*Deadly Dive:\*\*/g, '**Buceo Mortal:**')
        .replace(/- Scuba equipment \(oxygen tanks, regulators\)/g,
          '- Equipo de buceo (tanques de oxígeno, reguladores)')
        .replace(/- Waterproof dive logs/g, '- Registros de buceo resistentes al agua')
        .replace(/- "Shipwreck artifacts" \(treasure props\)/g,
          '- "Artefactos del naufragio" (accesorios de tesoro)')
        .replace(/- Underwater photos showing wreck location/g,
          '- Fotos submarinas mostrando ubicación del naufragio')
        .replace(/\*\*Sunset Soiree:\*\*/g, '**Fiesta al Atardecer:**')
        .replace(/- Monogrammed cocktail napkins with secret notes/g,
          '- Servilletas de cóctel con monograma con notas secretas')
        .replace(/- Club membership applications and rejection letters/g,
          '- Solicitudes de membresía del club y cartas de rechazo')
        .replace(/- Society column articles/g, '- Artículos de columna de sociedad')
        .replace(/- "Security footage" screenshots \(staged photos\)/g,
          '- Capturas de pantalla de "grabación de seguridad" (fotos escenificadas)')
        .replace(/## Tips for Hosting at Your Beach Resort/g,
          '## Consejos para Organizar en tu Resort de Playa')
        .replace(/### 1\. Weather Contingency Planning/g,
          '### 1. Planificación de Contingencia Climática')
        .replace(/Beach weather can be unpredictable\. Have indoor backup locations identified for key scenes, and consider timing important revelations for covered areas \(beach bar, poolside cabana\) rather than open beach\./g,
          'El clima de playa puede ser impredecible. Ten ubicaciones de respaldo bajo techo identificadas para escenas clave, y considera programar revelaciones importantes para áreas cubiertas (bar de playa, cabaña junto a la piscina) en lugar de playa abierta.')
        .replace(/### 2\. Sun and Heat Management/g, '### 2. Manejo del Sol y Calor')
        .replace(/- Schedule intense investigation scenes for cooler times \(early evening\)/g,
          '- Programa escenas de investigación intensas para momentos más frescos (temprano en la noche)')
        .replace(/- Provide shaded areas for character interactions/g,
          '- Proporciona áreas con sombra para interacciones de personajes')
        .replace(/- Keep props and paper materials protected from sun and moisture/g,
          '- Mantén accesorios y materiales de papel protegidos del sol y la humedad')
        .replace(/- Have plenty of water available for participants/g,
          '- Ten mucha agua disponible para los participantes')
        .replace(/### 3\. Sand and Water Considerations/g, '### 3. Consideraciones de Arena y Agua')
        .replace(/- Laminate all paper materials or use waterproof alternatives/g,
          '- Lamina todos los materiales de papel o usa alternativas resistentes al agua')
        .replace(/- Store clues and props in sealed containers/g,
          '- Almacena pistas y accesorios en contenedores sellados')
        .replace(/- Use beach-friendly "crime scene tape" that won't blow away/g,
          '- Usa "cinta de escena del crimen" amigable con la playa que no se vuele')
        .replace(/- Consider tide schedules if using actual beach locations for clues/g,
          '- Considera los horarios de marea si usas ubicaciones reales de playa para pistas')
        .replace(/### 4\. Respecting Other Guests/g, '### 4. Respetando a Otros Huéspedes')
        .replace(/Not everyone at the resort is participating in your mystery\. Keep activities contained to your group's designated areas, and avoid disrupting other guests' vacations with loud accusations or dramatic confrontations in shared spaces\./g,
          'No todos en el resort están participando en tu misterio. Mantén las actividades contenidas en las áreas designadas de tu grupo, y evita interrumpir las vacaciones de otros huéspedes con acusaciones ruidosas o confrontaciones dramáticas en espacios compartidos.')
        .replace(/### 5\. Photography Opportunities/g, '### 5. Oportunidades Fotográficas')
        .replace(/Beach resorts offer stunning backdrops\. Build in time for group photos in character, and consider incorporating photo challenges into your clue structure \(teams must photograph themselves finding specific clues\)\./g,
          'Los resorts de playa ofrecen fondos impresionantes. Incluye tiempo para fotos grupales en personaje, y considera incorporar desafíos fotográficos en tu estructura de pistas (los equipos deben fotografiarse encontrando pistas específicas).')
        .replace(/## Pricing and Guest Considerations/g, '## Precios y Consideraciones de Huéspedes')
        .replace(/### Group Size Sweet Spots/g, '### Tamaños de Grupo Ideales')
        .replace(/- \*\*Small groups \(8-12\)\*\*: Intense, personal mysteries where everyone has significant roles/g,
          '- **Grupos pequeños (8-12)**: Misterios intensos y personales donde todos tienen roles significativos')
        .replace(/- \*\*Medium groups \(12-20\)\*\*: Optimal for most beach resort mysteries with good suspect-to-guest ratio/g,
          '- **Grupos medianos (12-20)**: Óptimo para la mayoría de misterios en resorts de playa con buena relación sospechoso-huésped')
        .replace(/- \*\*Large groups \(20\+\)\*\*: Work best with team-based investigation format/g,
          '- **Grupos grandes (20+)**: Funcionan mejor con formato de investigación basado en equipos')
        .replace(/### Budget Breakdown/g, '### Desglose del Presupuesto')
        .replace(/For a medium-sized group \(15 people\) at a beach resort:/g,
          'Para un grupo de tamaño mediano (15 personas) en un resort de playa:')
        .replace(/- \*\*Mystery materials\*\*: \$150-300 \(character packets, props, clues\)/g,
          '- **Materiales del misterio**: $150-300 (paquetes de personajes, accesorios, pistas)')
        .replace(/- \*\*Costumes\/accessories\*\*: \$200-400 \(optional but enhances experience\)/g,
          '- **Disfraces/accesorios**: $200-400 (opcional pero mejora la experiencia)')
        .replace(/- \*\*Special food\/drinks\*\*: \$300-600 \(themed cocktails, dinner\)/g,
          '- **Comida/bebidas especiales**: $300-600 (cócteles temáticos, cena)')
        .replace(/- \*\*Professional facilitator\*\*: \$500-1000 \(recommended for groups 20\+\)/g,
          '- **Facilitador profesional**: $500-1000 (recomendado para grupos de 20+)')
        .replace(/- \*\*Resort coordination fee\*\*: Varies by property/g,
          '- **Tarifa de coordinación del resort**: Varía según la propiedad')
        .replace(/\*\*Total per person\*\*: \$75-150, comparable to other resort entertainment options but with much higher engagement\./g,
          '**Total por persona**: $75-150, comparable a otras opciones de entretenimiento del resort pero con mucho mayor compromiso.')
        .replace(/## Why Beach Resort Mysteries Create Lasting Memories/g,
          '## Por Qué los Misterios en Resorts de Playa Crean Recuerdos Duraderos')
        .replace(/The combination of vacation relaxation and interactive entertainment creates a unique experience that guests remember long after their tan fades\. Unlike passive resort activities, murder mysteries give your group shared stories, inside jokes, and dramatic moments that become part of your collective memory\./g,
          'La combinación de relajación vacacional y entretenimiento interactivo crea una experiencia única que los huéspedes recuerdan mucho después de que su bronceado se desvanezca. A diferencia de las actividades pasivas del resort, los misterios de asesinato le dan a tu grupo historias compartidas, chistes internos y momentos dramáticos que se convierten en parte de tu memoria colectiva.')
        .replace(/Beach resorts naturally facilitate the social mixing and character interaction that makes mysteries work\. Guests encounter each other repeatedly at meals, activities, and evening entertainment, allowing relationships and suspicions to develop organically\. The vacation setting also gives people permission to be more playful and uninhibited than they might be in everyday life\./g,
          'Los resorts de playa facilitan naturalmente la mezcla social y la interacción de personajes que hace que los misterios funcionen. Los huéspedes se encuentran repetidamente en comidas, actividades y entretenimiento nocturno, permitiendo que las relaciones y sospechas se desarrollen orgánicamente. El entorno vacacional también le da a las personas permiso para ser más juguetones y desinhibidos de lo que podrían ser en la vida cotidiana.')
        .replace(/For corporate groups, beach resort mysteries build team connections in a low-pressure environment\. For families, they create multi-generational entertainment that engages everyone from teenagers to grandparents\. For friend groups, they transform a standard beach vacation into an adventure that no one will forget\./g,
          'Para grupos corporativos, los misterios en resorts de playa construyen conexiones de equipo en un entorno de baja presión. Para familias, crean entretenimiento multigeneracional que involucra a todos desde adolescentes hasta abuelos. Para grupos de amigos, transforman unas vacaciones de playa estándar en una aventura que nadie olvidará.')
        .replace(/## Getting Started with Your Beach Resort Mystery/g,
          '## Comenzando con tu Misterio en Resort de Playa')
        .replace(/Ready to turn your beach vacation into an unforgettable murder mystery experience\? Visit \[Mystery Maker Party\]\(https:\/\/www\.mysterymakerparty\.com\) to access detailed character packets, clue structures, and hosting guides for all five beach resort themes\./g,
          '¿Listo para convertir tus vacaciones de playa en una experiencia de misterio inolvidable? Visita [Mystery Maker Party](https://www.mysterymakerparty.com) para acceder a paquetes detallados de personajes, estructuras de pistas y guías de organización para los cinco temas de resorts de playa.')
        .replace(/Our customizable mystery kits include:/g, 'Nuestros kits de misterio personalizables incluyen:')
        .replace(/- Complete character backgrounds with secrets, motives, and objectives/g,
          '- Antecedentes completos de personajes con secretos, motivos y objetivos')
        .replace(/- Detailed clue timelines with flexible reveal options/g,
          '- Líneas de tiempo detalladas de pistas con opciones flexibles de revelación')
        .replace(/- Hosting guide with scheduling, setup, and facilitation tips/g,
          '- Guía de organización con consejos de programación, configuración y facilitación')
        .replace(/- Printable props, evidence, and documents/g,
          '- Accesorios imprimibles, evidencia y documentos')
        .replace(/- Solution reveal script with dramatic presentation suggestions/g,
          '- Guion de revelación de solución con sugerencias de presentación dramática')
        .replace(/- Customization guidance for your specific resort and group/g,
          '- Orientación de personalización para tu resort y grupo específico')
        .replace(/Whether you're planning a corporate retreat on a tropical island, a destination wedding with entertainment, or a family reunion that needs something special, these beach resort murder mystery themes will transform your vacation into the trip of a lifetime—where solving a fictional murder becomes more memorable than anything else you could have done in paradise\./g,
          'Ya sea que estés planeando un retiro corporativo en una isla tropical, una boda destino con entretenimiento, o una reunión familiar que necesita algo especial, estos temas de misterio en resorts de playa transformarán tus vacaciones en el viaje de tu vida—donde resolver un asesinato ficticio se vuelve más memorable que cualquier otra cosa que podrías haber hecho en el paraíso.')
    },
    // Add remaining translations similarly...
  };
  
  const translationData = translations[englishPost.slug];
  if (!translationData) {
    throw new Error(`No translation found for slug: ${englishPost.slug}`);
  }
  
  return {
    slug: englishPost.slug, // SAME AS ENGLISH
    language: 'es',
    title: translationData.title,
    content: translationData.content,
    meta_description: englishPost.meta_description, // Will be translated separately if needed
    keywords: englishPost.keywords
  };
}

async function insertSpanishPost(spanishData) {
  const { data, error } = await supabase
    .from('blog_posts')
    .insert([spanishData])
    .select();
  
  if (error) throw error;
  return data;
}

async function main() {
  console.log('Starting translation process...\n');
  
  for (const slug of slugs) {
    try {
      console.log(`Processing: ${slug}`);
      
      // Fetch English post
      console.log('  - Fetching English post...');
      const englishPost = await fetchEnglishPost(slug);
      
      // Translate
      console.log('  - Translating to Spanish...');
      const spanishData = await translatePost(englishPost);
      
      // Insert
      console.log('  - Inserting Spanish post...');
      const result = await insertSpanishPost(spanishData);
      
      console.log(`  ✓ Successfully inserted: ${spanishData.title}`);
      console.log(`  - Slug: ${result[0].slug}`);
      console.log(`  - Language: ${result[0].language}\n`);
      
    } catch (error) {
      console.error(`  ✗ Error processing ${slug}:`, error.message);
      console.error(error);
    }
  }
  
  console.log('\nTranslation process complete!');
}

main();
