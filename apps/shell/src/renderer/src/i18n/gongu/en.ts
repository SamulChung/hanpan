import type { zh } from './zh'

export const en = {
  gonguTitle: 'Gongu pictures',
  gonguDesc:
    "The key for finding out-of-copyright pictures in Gongu, the Korea Copyright Commission's library of free works. You get the key free of charge from the Public Data Portal (data.go.kr).",
  gonguHowTo:
    'Sign in to the Public Data Portal and apply to use "한국저작권위원회_공유(만료)저작물 서비스" (the Gongu expired-works service); the key is issued right away. It allows up to 1,000 searches a day.',
  gonguPrivacy:
    'When you check the key or search, your search words and this key go to the Public Data Portal. No document content is sent. The key stays on this PC.',
  gonguKey: 'Service key',
  gonguKeySaved: 'A key is saved.',
  gonguNoKey: 'No key.',
  gonguSave: 'Save',
  gonguClear: 'Clear',
  gonguCheck: 'Check',
  gonguChecking: 'Checking…',
  gonguOk: 'The key works.',
  gonguErrNoKey: 'Enter a key.',
  gonguErrBadKey:
    'The Public Data Portal does not accept this key. Copy it again, or check that your application was approved. A new key can take about an hour to start working.',
  gonguErrExpired: 'The key has expired. Extend it on the Public Data Portal.',
  gonguErrQuota: "Today's searches are used up. Try again tomorrow.",
  gonguErrRate: 'Too many requests in a short time. Try again in a moment.',
  gonguErrBlocked: 'The Public Data Portal blocked requests from this internet address.',
  gonguErrNetwork: 'Could not reach the Public Data Portal. Check your internet connection.',
  gonguErrService:
    'The Public Data Portal is not answering properly right now. Try again in a moment.',
} satisfies Record<keyof typeof zh, string>
