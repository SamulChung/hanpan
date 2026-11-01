import type { zh } from './zh'

export const cs = {
  gonguTitle: 'Obrázky Gongu',
  gonguDesc:
    'Klíč pro hledání obrázků s vypršelými autorskými právy v Gongu, knihovně volných děl Korejské komise pro autorská práva. Klíč získáte zdarma na korejském portálu veřejných dat (data.go.kr).',
  gonguHowTo:
    'Přihlaste se na portál veřejných dat a požádejte o používání „한국저작권위원회_공유(만료)저작물 서비스“ (služby Gongu pro díla s vypršelými právy); klíč dostanete hned. Umožňuje až 1 000 hledání denně.',
  gonguPrivacy:
    'Při kontrole klíče nebo hledání se hledaná slova a tento klíč odesílají na portál veřejných dat. Obsah dokumentů se neodesílá. Klíč zůstává v tomto počítači.',
  gonguKey: 'Klíč služby',
  gonguKeySaved: 'Klíč je uložen.',
  gonguNoKey: 'Žádný klíč.',
  gonguSave: 'Uložit',
  gonguClear: 'Vymazat',
  gonguCheck: 'Zkontrolovat',
  gonguChecking: 'Kontroluje se…',
  gonguOk: 'Klíč funguje.',
  gonguErrNoKey: 'Zadejte klíč.',
  gonguErrBadKey:
    'Portál veřejných dat tento klíč nepřijímá. Zkopírujte ho znovu nebo ověřte, že vaše žádost byla schválena. Nový klíč může začít fungovat až zhruba za hodinu.',
  gonguErrExpired: 'Platnost klíče vypršela. Prodlužte ji na portálu veřejných dat.',
  gonguErrQuota: 'Dnešní hledání jsou vyčerpána. Zkuste to zítra.',
  gonguErrRate: 'Příliš mnoho požadavků v krátké době. Zkuste to za chvíli znovu.',
  gonguErrBlocked: 'Portál veřejných dat zablokoval požadavky z této internetové adresy.',
  gonguErrNetwork: 'Nelze se spojit s portálem veřejných dat. Zkontrolujte připojení k internetu.',
  gonguErrService: 'Portál veřejných dat teď neodpovídá správně. Zkuste to za chvíli znovu.',
} satisfies Record<keyof typeof zh, string>
