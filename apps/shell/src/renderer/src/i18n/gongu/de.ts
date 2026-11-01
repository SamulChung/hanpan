import type { zh } from './zh'

export const de = {
  gonguTitle: 'Gongu-Bilder',
  gonguDesc:
    'Der Schlüssel für die Suche nach gemeinfreien Bildern in Gongu, der Bibliothek freier Werke der Koreanischen Urheberrechtskommission. Sie erhalten ihn kostenlos im koreanischen Portal für öffentliche Daten (data.go.kr).',
  gonguHowTo:
    'Melden Sie sich im Portal für öffentliche Daten an und beantragen Sie die Nutzung von „한국저작권위원회_공유(만료)저작물 서비스“ (dem Gongu-Dienst für gemeinfreie Werke); der Schlüssel wird sofort ausgestellt. Er erlaubt bis zu 1.000 Suchen pro Tag.',
  gonguPrivacy:
    'Beim Prüfen des Schlüssels oder bei einer Suche gehen Ihre Suchbegriffe und dieser Schlüssel an das Portal für öffentliche Daten. Es werden keine Dokumentinhalte gesendet. Der Schlüssel bleibt auf diesem PC.',
  gonguKey: 'Dienstschlüssel',
  gonguKeySaved: 'Ein Schlüssel ist gespeichert.',
  gonguNoKey: 'Kein Schlüssel.',
  gonguSave: 'Speichern',
  gonguClear: 'Löschen',
  gonguCheck: 'Prüfen',
  gonguChecking: 'Wird geprüft…',
  gonguOk: 'Der Schlüssel funktioniert.',
  gonguErrNoKey: 'Geben Sie einen Schlüssel ein.',
  gonguErrBadKey:
    'Das Portal für öffentliche Daten akzeptiert diesen Schlüssel nicht. Kopieren Sie ihn erneut oder prüfen Sie, ob Ihr Antrag genehmigt wurde. Ein neuer Schlüssel kann etwa eine Stunde brauchen, bis er funktioniert.',
  gonguErrExpired:
    'Der Schlüssel ist abgelaufen. Verlängern Sie ihn im Portal für öffentliche Daten.',
  gonguErrQuota: 'Die Suchen für heute sind aufgebraucht. Versuchen Sie es morgen wieder.',
  gonguErrRate: 'Zu viele Anfragen in kurzer Zeit. Versuchen Sie es gleich noch einmal.',
  gonguErrBlocked:
    'Das Portal für öffentliche Daten hat Anfragen von dieser Internetadresse gesperrt.',
  gonguErrNetwork:
    'Das Portal für öffentliche Daten ist nicht erreichbar. Prüfen Sie Ihre Internetverbindung.',
  gonguErrService:
    'Das Portal für öffentliche Daten antwortet gerade nicht richtig. Versuchen Sie es gleich noch einmal.',
  gpFind: 'In Gongu suchen',
  gpPlaceholder: 'Titel oder Künstler (z. B. 호랑이, 김홍도)',
  gpSearch: 'Suchen',
  gpSearching: 'Suche läuft…',
  gpNoResults:
    'Keine Bilder gefunden. Versuchen Sie ein einzelnes Wort aus dem Titel oder dem Namen.',
  gpTotal: '{count} Treffer',
  gpMore: 'Mehr',
  gpInsert: 'Einfügen',
  gpInserting: 'Wird eingefügt…',
  gpNoKey:
    'Kein Gongu-Schlüssel vorhanden. Geben Sie ihn unter Einstellungen → Integrationen → „Gongu-Bilder“ ein.',
  gpFooter:
    'Gongu-Werke stellt die Koreanische Urheberrechtskommission bereit. Die Quellenangabe eines eingefügten Bildes wird automatisch geschrieben.',
  gpPictureFailed: 'Das Bild konnte nicht geladen werden. Versuchen Sie es gleich noch einmal.',
  gpYear: 'Jahr',
  gpProvider: 'Bereitgestellt von',
  gpWarnNc: 'Nicht für kommerzielle Dokumente.',
  gpWarnNd: 'Darf nicht verändert werden, etwa durch Zuschneiden oder Umfärben.',
  gpWarnSa:
    'Was durch Veränderung entsteht, muss unter denselben Bedingungen weitergegeben werden.',
  gpConfirm: 'Für dieses Bild gelten Nutzungsbedingungen.\n{conditions}\nTrotzdem einfügen?',
  gpLocked:
    'Dieses Bild darf nicht verändert werden. Sie können es verschieben und unter Beibehaltung des Seitenverhältnisses skalieren.',
  gpCreditList: 'Bildquellenliste hinzufügen',
  gpCheck: 'Quellen prüfen',
  gpCheckTitle: 'Bildquellen prüfen',
  gpCheckClean: 'Nichts zu prüfen.',
  gpIssueNoCredit:
    'Dieses Bild hat keine Quellenangabe. Klären Sie die Herkunft und geben Sie die Quelle an.',
  gpIssueConditions: 'Nutzungsbedingungen: {conditions}',
  gpIssueChanged:
    'Dieses Bild ohne Bearbeitungsrecht zeigt noch Änderungen (Zuschnitt, Filter, Spiegelung usw.).',
  gpIssueNoLine: 'Seine Quellenzeile steht nicht im Entwurf.',
  gpGoTo: 'Zum Bild',
  gpReAdd: 'Quellenzeile neu einfügen',
  gpPage: 'Seite {page}',
  gpCondNc: 'nicht kommerziell',
  gpCondNd: 'keine Bearbeitung',
  gpCondSa: 'Weitergabe unter gleichen Bedingungen',
  gpExportWarn: 'Einige Bilder brauchen eine Quellenprüfung. Siehe Quellen prüfen.',
  gpClose: 'Schließen',
  gpPicture: 'Bild',
} satisfies Record<keyof typeof zh, string>
