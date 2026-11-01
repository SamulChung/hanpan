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
  gpFind: 'Buscar en Gongu',
  gpPlaceholder: 'Título o artista (p. ej., 호랑이, 김홍도)',
  gpSearch: 'Buscar',
  gpSearching: 'Buscando…',
  gpNoResults:
    'No se encontraron imágenes. Pruebe con una sola palabra del título o del nombre del artista.',
  gpTotal: '{count} resultados',
  gpMore: 'Más',
  gpInsert: 'Insertar',
  gpInserting: 'Insertando…',
  gpNoKey:
    'No hay clave de Gongu. Introdúzcala en Configuración → Integraciones → «Imágenes de Gongu».',
  gpFooter:
    'Las obras de Gongu las proporciona la Comisión de Derechos de Autor de Corea. El crédito de una imagen insertada se escribe automáticamente.',
  gpPictureFailed: 'No se pudo obtener la imagen. Inténtelo de nuevo en un momento.',
  gpYear: 'Año',
  gpProvider: 'Proporcionado por',
  gpWarnNc: 'No se puede usar en documentos con fines comerciales.',
  gpWarnNd: 'No se puede modificar, por ejemplo recortándola o cambiando sus colores.',
  gpWarnSa: 'Lo que se cree modificándola debe compartirse con las mismas condiciones.',
  gpConfirm: 'Esta imagen tiene condiciones de uso.\n{conditions}\n¿Insertarla de todos modos?',
  gpLocked:
    'Esta imagen no se puede modificar. Puede moverla y cambiar su tamaño manteniendo las proporciones.',
  gpCreditList: 'Añadir una lista de créditos de imágenes',
  gpCheck: 'Revisar créditos',
  gpCheckTitle: 'Revisión de créditos de imágenes',
  gpCheckClean: 'Nada que revisar.',
  gpIssueNoCredit: 'Esta imagen no tiene crédito. Compruebe su origen y añada el crédito.',
  gpIssueConditions: 'Condiciones de uso: {conditions}',
  gpIssueChanged:
    'Esta imagen sin obras derivadas aún muestra cambios (recorte, filtro, volteo, etc.).',
  gpIssueNoLine: 'Su línea de crédito no está en el diseño.',
  gpGoTo: 'Ir a la imagen',
  gpReAdd: 'Volver a añadir la línea de crédito',
  gpPage: 'Página {page}',
  gpCondNc: 'no comercial',
  gpCondNd: 'sin obras derivadas',
  gpCondSa: 'compartir igual',
  gpExportWarn: 'Hay imágenes que necesitan revisar sus créditos. Vea Revisar créditos.',
  gpClose: 'Cerrar',
  gpPicture: 'Imagen',
} satisfies Record<keyof typeof zh, string>
