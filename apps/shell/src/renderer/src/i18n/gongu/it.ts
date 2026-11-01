import type { zh } from './zh'

export const it = {
  gonguTitle: 'Immagini Gongu',
  gonguDesc:
    'La chiave per cercare immagini con diritti d’autore scaduti in Gongu, la biblioteca di opere libere della Commissione coreana per il diritto d’autore. Si ottiene gratuitamente dal portale coreano dei dati pubblici (data.go.kr).',
  gonguHowTo:
    'Accedi al portale dei dati pubblici e richiedi l’uso di «한국저작권위원회_공유(만료)저작물 서비스» (il servizio Gongu delle opere con diritti scaduti); la chiave viene rilasciata subito. Consente fino a 1.000 ricerche al giorno.',
  gonguPrivacy:
    'Quando verifichi la chiave o fai una ricerca, le parole cercate e questa chiave vengono inviate al portale dei dati pubblici. Il contenuto dei documenti non viene inviato. La chiave resta su questo PC.',
  gonguKey: 'Chiave di servizio',
  gonguKeySaved: 'È salvata una chiave.',
  gonguNoKey: 'Nessuna chiave.',
  gonguSave: 'Salva',
  gonguClear: 'Cancella',
  gonguCheck: 'Verifica',
  gonguChecking: 'Verifica in corso…',
  gonguOk: 'La chiave funziona.',
  gonguErrNoKey: 'Inserisci una chiave.',
  gonguErrBadKey:
    'Il portale dei dati pubblici non accetta questa chiave. Copiala di nuovo o verifica che la richiesta sia stata approvata. Una chiave nuova può impiegare circa un’ora per funzionare.',
  gonguErrExpired: 'La chiave è scaduta. Prolungala sul portale dei dati pubblici.',
  gonguErrQuota: 'Le ricerche di oggi sono esaurite. Riprova domani.',
  gonguErrRate: 'Troppe richieste in poco tempo. Riprova tra poco.',
  gonguErrBlocked:
    'Il portale dei dati pubblici ha bloccato le richieste da questo indirizzo internet.',
  gonguErrNetwork:
    'Impossibile raggiungere il portale dei dati pubblici. Controlla la connessione a internet.',
  gonguErrService:
    'Il portale dei dati pubblici non risponde correttamente in questo momento. Riprova tra poco.',
  gpFind: 'Cerca in Gongu',
  gpPlaceholder: 'Titolo o artista (es. 호랑이, 김홍도)',
  gpSearch: 'Cerca',
  gpSearching: 'Ricerca in corso…',
  gpNoResults:
    "Nessuna immagine trovata. Prova una sola parola del titolo o del nome dell'artista.",
  gpTotal: '{count} risultati',
  gpMore: 'Altro',
  gpInsert: 'Inserisci',
  gpInserting: 'Inserimento…',
  gpNoKey: 'Nessuna chiave Gongu. Inseriscila in Impostazioni → Integrazioni → "Immagini Gongu".',
  gpFooter:
    "Le opere di Gongu sono fornite dalla Commissione coreana per il diritto d'autore. Il credito dell'immagine inserita viene scritto automaticamente.",
  gpPictureFailed: "Impossibile ottenere l'immagine. Riprova tra poco.",
  gpYear: 'Anno',
  gpProvider: 'Fornito da',
  gpWarnNc: 'Non utilizzabile in documenti commerciali.',
  gpWarnNd: 'Non si può modificare, ad esempio ritagliandola o cambiandone i colori.',
  gpWarnSa: 'Ciò che si crea modificandola va condiviso alle stesse condizioni.',
  gpConfirm: "Questa immagine ha condizioni d'uso.\n{conditions}\nInserirla comunque?",
  gpLocked:
    'Questa immagine non si può modificare. Puoi spostarla e ridimensionarla mantenendo le proporzioni.',
  gpCreditList: 'Aggiungi un elenco dei crediti delle immagini',
  gpCheck: 'Controlla crediti',
  gpCheckTitle: 'Controllo dei crediti delle immagini',
  gpCheckClean: 'Niente da controllare.',
  gpIssueNoCredit:
    'Questa immagine non ha un credito. Verifica da dove proviene e indicane il credito.',
  gpIssueConditions: "Condizioni d'uso: {conditions}",
  gpIssueChanged:
    'Questa immagine non modificabile mostra ancora modifiche (ritaglio, filtro, capovolgimento ecc.).',
  gpIssueNoLine: 'La sua riga di credito non è nel progetto.',
  gpGoTo: "Vai all'immagine",
  gpReAdd: 'Reinserisci la riga di credito',
  gpPage: 'Pagina {page}',
  gpCondNc: 'non commerciale',
  gpCondNd: 'non opere derivate',
  gpCondSa: 'condividi allo stesso modo',
  gpExportWarn: 'Alcune immagini richiedono un controllo dei crediti. Vedi Controlla crediti.',
  gpClose: 'Chiudi',
  gpPicture: 'Immagine',
} satisfies Record<keyof typeof zh, string>
