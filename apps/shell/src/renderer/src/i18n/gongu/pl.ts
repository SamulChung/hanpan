import type { zh } from './zh'

export const pl = {
  gonguTitle: 'Obrazy Gongu',
  gonguDesc:
    'Klucz do wyszukiwania obrazów, których prawa autorskie wygasły, w Gongu – bibliotece wolnych utworów Koreańskiej Komisji Praw Autorskich. Klucz otrzymasz bezpłatnie w koreańskim portalu danych publicznych (data.go.kr).',
  gonguHowTo:
    'Zaloguj się w portalu danych publicznych i złóż wniosek o dostęp do „한국저작권위원회_공유(만료)저작물 서비스” (usługi Gongu z utworami, których prawa wygasły); klucz zostanie wydany od razu. Pozwala na maksymalnie 1000 wyszukiwań dziennie.',
  gonguPrivacy:
    'Podczas sprawdzania klucza lub wyszukiwania wpisane słowa i ten klucz trafiają do portalu danych publicznych. Treść dokumentów nie jest wysyłana. Klucz zostaje na tym komputerze.',
  gonguKey: 'Klucz usługi',
  gonguKeySaved: 'Klucz jest zapisany.',
  gonguNoKey: 'Brak klucza.',
  gonguSave: 'Zapisz',
  gonguClear: 'Wyczyść',
  gonguCheck: 'Sprawdź',
  gonguChecking: 'Sprawdzanie…',
  gonguOk: 'Klucz działa.',
  gonguErrNoKey: 'Wpisz klucz.',
  gonguErrBadKey:
    'Portal danych publicznych nie przyjmuje tego klucza. Skopiuj go ponownie albo sprawdź, czy wniosek został zatwierdzony. Nowy klucz może zacząć działać dopiero po około godzinie.',
  gonguErrExpired: 'Klucz wygasł. Przedłuż go w portalu danych publicznych.',
  gonguErrQuota: 'Dzisiejszy limit wyszukiwań został wyczerpany. Spróbuj jutro.',
  gonguErrRate: 'Zbyt wiele żądań w krótkim czasie. Spróbuj ponownie za chwilę.',
  gonguErrBlocked: 'Portal danych publicznych zablokował żądania z tego adresu internetowego.',
  gonguErrNetwork:
    'Nie udało się połączyć z portalem danych publicznych. Sprawdź połączenie z internetem.',
  gonguErrService:
    'Portal danych publicznych nie odpowiada teraz poprawnie. Spróbuj ponownie za chwilę.',
} satisfies Record<keyof typeof zh, string>
