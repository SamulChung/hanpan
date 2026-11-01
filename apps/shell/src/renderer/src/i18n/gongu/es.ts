import type { zh } from './zh'

export const es = {
  gonguTitle: 'Imágenes de Gongu',
  gonguDesc:
    'La clave para buscar imágenes cuyo derecho de autor ha expirado en Gongu, la biblioteca de obras libres de la Comisión de Derechos de Autor de Corea. Se obtiene gratis en el portal coreano de datos públicos (data.go.kr).',
  gonguHowTo:
    'Inicia sesión en el portal de datos públicos y solicita el uso de «한국저작권위원회_공유(만료)저작물 서비스» (el servicio de Gongu de obras con derechos vencidos); la clave se emite al momento. Permite hasta 1.000 búsquedas al día.',
  gonguPrivacy:
    'Al comprobar la clave o buscar, tus palabras de búsqueda y esta clave se envían al portal de datos públicos. No se envía el contenido de los documentos. La clave se queda en este PC.',
  gonguKey: 'Clave de servicio',
  gonguKeySaved: 'Hay una clave guardada.',
  gonguNoKey: 'No hay clave.',
  gonguSave: 'Guardar',
  gonguClear: 'Borrar',
  gonguCheck: 'Comprobar',
  gonguChecking: 'Comprobando…',
  gonguOk: 'La clave funciona.',
  gonguErrNoKey: 'Escribe una clave.',
  gonguErrBadKey:
    'El portal de datos públicos no acepta esta clave. Vuelve a copiarla o comprueba que tu solicitud fue aprobada. Una clave nueva puede tardar alrededor de una hora en funcionar.',
  gonguErrExpired: 'La clave ha caducado. Amplía su plazo en el portal de datos públicos.',
  gonguErrQuota: 'Se han agotado las búsquedas de hoy. Vuelve a intentarlo mañana.',
  gonguErrRate: 'Demasiadas solicitudes en poco tiempo. Vuelve a intentarlo en un momento.',
  gonguErrBlocked:
    'El portal de datos públicos ha bloqueado las solicitudes de esta dirección de internet.',
  gonguErrNetwork:
    'No se pudo conectar con el portal de datos públicos. Comprueba tu conexión a internet.',
  gonguErrService:
    'El portal de datos públicos no responde bien en este momento. Vuelve a intentarlo en un momento.',
} satisfies Record<keyof typeof zh, string>
