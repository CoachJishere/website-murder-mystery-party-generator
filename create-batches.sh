#!/bin/bash

# Batch 1: Portuguese 1-5
echo "Creating Batch 1: Portuguese 1-5..."
{
  node insert-single-post.mjs pt 1 como-corrigir-convidados-quebrando-o-personagem
  echo ""
  node insert-single-post.mjs pt 2 como-corrigir-problemas-de-ritmo-de-misterio
  echo ""
  node insert-single-post.mjs pt 3 como-corrigir-misterios-de-assassinato-excessivamente-complexos
  echo ""
  node insert-single-post.mjs pt 4 como-corrigir-finais-de-misterio-insatisfatorios
  echo ""
  node insert-single-post.mjs pt 5 como-corrigir-baixa-participacao-do-convidado
} > batch-pt-1-5.sql 2>&1

# Batch 2: Portuguese 6-10
echo "Creating Batch 2: Portuguese 6-10..."
{
  node insert-single-post.mjs pt 6 como-corrigir-convidados-resolvendo-muito-cedo
  echo ""
  node insert-single-post.mjs pt 7 como-corrigir-problemas-de-atribuicao-de-personagem
  echo ""
  node insert-single-post.mjs pt 8 como-corrigir-revelacoes-anticlimacticas
  echo ""
  node insert-single-post.mjs pt 9 como-corrigir-desenvolvimento-fraco-de-personagem
  echo ""
  node insert-single-post.mjs pt 10 como-corrigir-problemas-de-fluxo-de-pistas
} > batch-pt-6-10.sql 2>&1

# Batch 3: Korean 1-5
echo "Creating Batch 3: Korean 1-5..."
{
  node insert-single-post.mjs ko 1 1920s-speakeasy-murder-mystery-party-guide-ko
  echo ""
  node insert-single-post.mjs ko 2 vintage-circus-murder-mystery-party-guide-ko
  echo ""
  node insert-single-post.mjs ko 3 ancient-egypt-murder-mystery-party-guide-ko
  echo ""
  node insert-single-post.mjs ko 4 art-gallery-murder-mystery-party-guide-ko
  echo ""
  node insert-single-post.mjs ko 5 bookstore-murder-mystery-party-guide-ko
} > batch-ko-1-5.sql 2>&1

# Batch 4: Korean 6-9
echo "Creating Batch 4: Korean 6-9..."
{
  node insert-single-post.mjs ko 6 1940s-film-noir-detective-murder-mystery-party-ko
  echo ""
  node insert-single-post.mjs ko 7 wild-west-saloon-murder-mystery-party-ko
  echo ""
  node insert-single-post.mjs ko 8 colonial-mansion-butler-murder-mystery-party-ko
  echo ""
  node insert-single-post.mjs ko 9 cruise-ship-murder-mystery-party-ko
} > batch-ko-6-9.sql 2>&1

# Batch 5: Chinese 6-9
echo "Creating Batch 5: Chinese 6-9..."
{
  node insert-single-post.mjs zh-cn 6 fairy-tale-murder-mystery-party-zh-cn
  echo ""
  node insert-single-post.mjs zh-cn 7 hollywood-murder-mystery-party-zh-cn
  echo ""
  node insert-single-post.mjs zh-cn 8 medieval-castle-murder-mystery-party-zh-cn
  echo ""
  node insert-single-post.mjs zh-cn 9 prohibition-era-murder-mystery-party-zh-cn
} > batch-zh-6-9.sql 2>&1

# Batch 6: Chinese 10-12
echo "Creating Batch 6: Chinese 10-12..."
{
  node insert-single-post.mjs zh-cn 10 steampunk-murder-mystery-party-zh-cn
  echo ""
  node insert-single-post.mjs zh-cn 11 jazz-age-murder-mystery-party-zh-cn
  echo ""
  node insert-single-post.mjs zh-cn 12 investigative-journalist-murder-mystery-party-zh-cn
} > batch-zh-10-12.sql 2>&1

echo "✅ All batches created!"
ls -lh batch-*.sql
