# Exportação profissional de CPA

## Objetivo
Organizar a planilha para reduzir erros operacionais, separando claramente cada casa de aposta e listando seus afiliados em ordem alfabética.

## O que será alterado
- Corrigir o erro atual na área administrativa.
- Gerar uma aba **Resumo geral** com totais por casa: afiliados, CPAs, cliques, registros e valor estimado.
- Criar uma aba individual para cada casa de aposta, com os afiliados daquela casa ordenados por nome e e-mail.
- Manter uma aba de afiliados sem casa vinculada quando existirem.
- Usar o link correto de cada casa salvo nas solicitações liberadas, evitando repetir um link de outra casa.
- Destacar somente a coluna editável **CPA a adicionar**, com cabeçalhos, filtros, congelamento, moeda e totais padronizados.
- Melhorar o bloco de exportação na administração, deixando claro o filtro aplicado e o conteúdo que será baixado.

## Detalhes técnicos
- A exportação continuará em `.xlsx` e respeitará a busca e o filtro de casa selecionados.
- Nomes de abas serão normalizados para o limite do Excel e protegidos contra duplicidade.
- Campos serão preenchidos a partir dos acordos, perfis e links liberados relacionados pelo afiliado e pela casa.
- O arquivo será validado para abertura e ausência de erros de fórmula.
