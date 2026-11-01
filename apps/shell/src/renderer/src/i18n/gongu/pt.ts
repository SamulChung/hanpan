import type { zh } from './zh'

export const pt = {
  gonguTitle: 'Imagens do Gongu',
  gonguDesc:
    'A chave para encontrar imagens com direitos autorais expirados no Gongu, a biblioteca de obras livres da Comissão de Direitos Autorais da Coreia. Você a obtém gratuitamente no portal coreano de dados públicos (data.go.kr).',
  gonguHowTo:
    'Entre no portal de dados públicos e solicite o uso de “한국저작권위원회_공유(만료)저작물 서비스” (o serviço do Gongu de obras com direitos expirados); a chave é emitida na hora. Ela permite até 1.000 buscas por dia.',
  gonguPrivacy:
    'Ao verificar a chave ou buscar, suas palavras de busca e esta chave vão para o portal de dados públicos. Nenhum conteúdo de documento é enviado. A chave fica neste PC.',
  gonguKey: 'Chave de serviço',
  gonguKeySaved: 'Há uma chave salva.',
  gonguNoKey: 'Nenhuma chave.',
  gonguSave: 'Salvar',
  gonguClear: 'Limpar',
  gonguCheck: 'Verificar',
  gonguChecking: 'Verificando…',
  gonguOk: 'A chave funciona.',
  gonguErrNoKey: 'Digite uma chave.',
  gonguErrBadKey:
    'O portal de dados públicos não aceita esta chave. Copie-a novamente ou confira se sua solicitação foi aprovada. Uma chave nova pode levar cerca de uma hora para funcionar.',
  gonguErrExpired: 'A chave expirou. Prorrogue-a no portal de dados públicos.',
  gonguErrQuota: 'As buscas de hoje acabaram. Tente novamente amanhã.',
  gonguErrRate: 'Solicitações demais em pouco tempo. Tente novamente em instantes.',
  gonguErrBlocked:
    'O portal de dados públicos bloqueou as solicitações deste endereço de internet.',
  gonguErrNetwork:
    'Não foi possível conectar ao portal de dados públicos. Verifique sua conexão com a internet.',
  gonguErrService:
    'O portal de dados públicos não está respondendo corretamente agora. Tente novamente em instantes.',
  gpFind: 'Procurar no Gongu',
  gpPlaceholder: 'Título ou artista (ex.: 호랑이, 김홍도)',
  gpSearch: 'Procurar',
  gpSearching: 'Procurando…',
  gpNoResults:
    'Nenhuma imagem encontrada. Tente uma única palavra do título ou do nome do artista.',
  gpTotal: '{count} resultados',
  gpMore: 'Mais',
  gpInsert: 'Inserir',
  gpInserting: 'Inserindo…',
  gpNoKey: 'Não há chave do Gongu. Insira-a em Configurações → Integrações → "Imagens do Gongu".',
  gpFooter:
    'As obras do Gongu são fornecidas pela Comissão de Direitos Autorais da Coreia. O crédito da imagem inserida é escrito automaticamente.',
  gpPictureFailed: 'Não foi possível obter a imagem. Tente de novo em instantes.',
  gpYear: 'Ano',
  gpProvider: 'Fornecido por',
  gpWarnNc: 'Não pode ser usada em documentos comerciais.',
  gpWarnNd: 'Não pode ser alterada, por exemplo cortada ou recolorida.',
  gpWarnSa: 'O que for criado alterando-a deve ser compartilhado nas mesmas condições.',
  gpConfirm: 'Esta imagem tem condições de uso.\n{conditions}\nInserir mesmo assim?',
  gpLocked:
    'Esta imagem não pode ser alterada. Você pode movê-la e redimensioná-la mantendo as proporções.',
  gpCreditList: 'Adicionar lista de créditos das imagens',
  gpCheck: 'Verificar créditos',
  gpCheckTitle: 'Verificação de créditos das imagens',
  gpCheckClean: 'Nada a verificar.',
  gpIssueNoCredit: 'Esta imagem não tem crédito. Verifique a origem e dê o crédito.',
  gpIssueConditions: 'Condições de uso: {conditions}',
  gpIssueChanged:
    'Esta imagem sem derivações ainda mostra alterações (corte, filtro, espelhamento etc.).',
  gpIssueNoLine: 'A linha de crédito dela não está no design.',
  gpGoTo: 'Ir para a imagem',
  gpReAdd: 'Inserir a linha de crédito de novo',
  gpPage: 'Página {page}',
  gpCondNc: 'não comercial',
  gpCondNd: 'sem derivações',
  gpCondSa: 'compartilha igual',
  gpExportWarn: 'Algumas imagens precisam de verificação de créditos. Veja Verificar créditos.',
  gpClose: 'Fechar',
  gpPicture: 'Imagem',
} satisfies Record<keyof typeof zh, string>
