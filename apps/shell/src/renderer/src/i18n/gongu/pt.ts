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
} satisfies Record<keyof typeof zh, string>
