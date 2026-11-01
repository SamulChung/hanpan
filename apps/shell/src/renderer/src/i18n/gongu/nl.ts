import type { zh } from './zh'

export const nl = {
  gonguTitle: 'Gongu-afbeeldingen',
  gonguDesc:
    'De sleutel voor het zoeken naar afbeeldingen waarvan het auteursrecht is verlopen in Gongu, de bibliotheek met vrije werken van de Koreaanse Auteursrechtcommissie. U krijgt de sleutel gratis via het Koreaanse portaal voor open data (data.go.kr).',
  gonguHowTo:
    'Meld u aan bij het portaal voor open data en vraag gebruik aan van "한국저작권위원회_공유(만료)저작물 서비스" (de Gongu-dienst voor werken met verlopen auteursrecht); de sleutel wordt meteen uitgegeven. Hiermee kunt u tot 1.000 keer per dag zoeken.',
  gonguPrivacy:
    'Bij het controleren van de sleutel of bij zoeken gaan uw zoekwoorden en deze sleutel naar het portaal voor open data. Er wordt geen documentinhoud verzonden. De sleutel blijft op deze pc.',
  gonguKey: 'Dienstsleutel',
  gonguKeySaved: 'Er is een sleutel opgeslagen.',
  gonguNoKey: 'Geen sleutel.',
  gonguSave: 'Opslaan',
  gonguClear: 'Wissen',
  gonguCheck: 'Controleren',
  gonguChecking: 'Bezig met controleren…',
  gonguOk: 'De sleutel werkt.',
  gonguErrNoKey: 'Voer een sleutel in.',
  gonguErrBadKey:
    'Het portaal voor open data accepteert deze sleutel niet. Kopieer hem opnieuw of controleer of uw aanvraag is goedgekeurd. Een nieuwe sleutel kan ongeveer een uur nodig hebben voordat hij werkt.',
  gonguErrExpired: 'De sleutel is verlopen. Verleng hem op het portaal voor open data.',
  gonguErrQuota: 'De zoekopdrachten van vandaag zijn op. Probeer het morgen opnieuw.',
  gonguErrRate: 'Te veel verzoeken in korte tijd. Probeer het zo meteen opnieuw.',
  gonguErrBlocked: 'Het portaal voor open data heeft verzoeken van dit internetadres geblokkeerd.',
  gonguErrNetwork:
    'Kan het portaal voor open data niet bereiken. Controleer uw internetverbinding.',
  gonguErrService:
    'Het portaal voor open data antwoordt op dit moment niet goed. Probeer het zo meteen opnieuw.',
  gpFind: 'Zoeken in Gongu',
  gpPlaceholder: 'Titel of kunstenaar (bijv. 호랑이, 김홍도)',
  gpSearch: 'Zoeken',
  gpSearching: 'Zoeken…',
  gpNoResults:
    'Geen afbeeldingen gevonden. Probeer één woord uit de titel of de naam van de kunstenaar.',
  gpTotal: '{count} gevonden',
  gpMore: 'Meer',
  gpInsert: 'Invoegen',
  gpInserting: 'Invoegen…',
  gpNoKey:
    'Er is geen Gongu-sleutel. Voer er een in bij Instellingen → Integraties → "Gongu-afbeeldingen".',
  gpFooter:
    'Gongu-werken worden aangeboden door de Koreaanse auteursrechtcommissie. De bronvermelding van een ingevoegde afbeelding wordt automatisch geschreven.',
  gpPictureFailed: 'De afbeelding kon niet worden opgehaald. Probeer het zo meteen opnieuw.',
  gpYear: 'Jaar',
  gpProvider: 'Aangeboden door',
  gpWarnNc: 'Niet voor gebruik in commerciële documenten.',
  gpWarnNd: 'Mag niet worden gewijzigd, zoals bijsnijden of herkleuren.',
  gpWarnSa: 'Wat je maakt door haar te wijzigen, moet onder dezelfde voorwaarden worden gedeeld.',
  gpConfirm: 'Voor deze afbeelding gelden gebruiksvoorwaarden.\n{conditions}\nToch invoegen?',
  gpLocked:
    'Deze afbeelding mag niet worden gewijzigd. Je kunt haar alleen verplaatsen en schalen met behoud van verhoudingen.',
  gpCreditList: 'Lijst met bronvermeldingen toevoegen',
  gpCheck: 'Bronnen controleren',
  gpCheckTitle: 'Bronvermeldingen controleren',
  gpCheckClean: 'Niets te controleren.',
  gpIssueNoCredit:
    'Deze afbeelding heeft geen bronvermelding. Zoek uit waar ze vandaan komt en vermeld de bron.',
  gpIssueConditions: 'Gebruiksvoorwaarden: {conditions}',
  gpIssueChanged:
    'Deze afbeelding zonder afgeleide werken toont nog wijzigingen (bijsnijden, filter, spiegelen enz.).',
  gpIssueNoLine: 'Haar bronregel staat niet in het ontwerp.',
  gpGoTo: 'Naar afbeelding',
  gpReAdd: 'Bronregel opnieuw invoegen',
  gpPage: 'Pagina {page}',
  gpCondNc: 'niet-commercieel',
  gpCondNd: 'geen afgeleide werken',
  gpCondSa: 'gelijk delen',
  gpExportWarn: 'Sommige afbeeldingen hebben een broncontrole nodig. Zie Bronnen controleren.',
  gpClose: 'Sluiten',
  gpPicture: 'Afbeelding',
} satisfies Record<keyof typeof zh, string>
