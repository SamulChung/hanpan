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
} satisfies Record<keyof typeof zh, string>
