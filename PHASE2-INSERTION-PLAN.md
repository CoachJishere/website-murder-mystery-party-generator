# Phase 2 Translation Insertion Plan

## Summary
Total posts to insert: 32 (26 ready + 6 need title fixes)

## Ready to Insert (26 posts):

### Portuguese (10 posts):
1. pt-1: como-corrigir-convidados-quebrando-o-personagem ✓
2. pt-2: como-corrigir-problemas-de-ritmo-de-misterio ✓
3. pt-3: como-corrigir-misterios-de-assassinato-excessivamente-complexos ✓
4. pt-4: como-corrigir-finais-de-misterio-insatisfatorios ✓
5. pt-5: como-corrigir-baixa-participacao-do-convidado ✓
6. pt-6: como-corrigir-convidados-resolvendo-muito-cedo ✓
7. pt-7: como-corrigir-problemas-de-atribuicao-de-personagem ✓
8. pt-8: como-corrigir-revelacoes-anticlimacticas ✓
9. pt-9: como-corrigir-desenvolvimento-fraco-de-personagem ✓
10. pt-10: como-corrigir-problemas-de-fluxo-de-pistas ✓

### Korean (9 posts):
1. ko-1: 1920s-speakeasy-murder-mystery-party-guide-ko ✓
2. ko-2: vintage-circus-murder-mystery-party-guide-ko ✓
3. ko-3: ancient-egypt-murder-mystery-party-guide-ko ✓
4. ko-4: art-gallery-murder-mystery-party-guide-ko ✓
5. ko-5: bookstore-murder-mystery-party-guide-ko ✓
6. ko-6: 1940s-film-noir-detective-murder-mystery-party-ko ✓
7. ko-7: wild-west-saloon-murder-mystery-party-ko ✓
8. ko-8: colonial-mansion-butler-murder-mystery-party-ko ✓
9. ko-9: cruise-ship-murder-mystery-party-ko ✓

### Chinese Simplified (7 posts):
1. zh-cn-6: fairy-tale-murder-mystery-party-zh-cn ✓
2. zh-cn-7: hollywood-murder-mystery-party-zh-cn ✓
3. zh-cn-8: medieval-castle-murder-mystery-party-zh-cn ✓
4. zh-cn-9: prohibition-era-murder-mystery-party-zh-cn ✓
5. zh-cn-10: steampunk-murder-mystery-party-zh-cn ✓
6. zh-cn-11: jazz-age-murder-mystery-party-zh-cn ✓
7. zh-cn-12: investigative-journalist-murder-mystery-party-zh-cn ✓

## Need Title Extraction Fix (6 posts):
1. pt-11 (missing title header)
2. zh-cn-1 through zh-cn-5 (need title extraction from content)

## Execution Strategy:
Use Supabase MCP `apply_migration` in batches of 5-8 posts to stay within size limits.

### Batch 1: Portuguese 1-5
### Batch 2: Portuguese 6-10
### Batch 3: Korean 1-5
### Batch 4: Korean 6-9
### Batch 5: Chinese 6-9
### Batch 6: Chinese 10-12
### Batch 7: Fix and insert remaining 6 posts
