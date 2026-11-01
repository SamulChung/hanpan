import type { zh } from './zh'

export const fr = {
  gonguTitle: 'Images Gongu',
  gonguDesc:
    'La clé pour trouver des images libres de droits dans Gongu, la bibliothèque d’œuvres libres de la Commission coréenne du droit d’auteur. Vous l’obtenez gratuitement sur le portail coréen des données publiques (data.go.kr).',
  gonguHowTo:
    'Connectez-vous au portail des données publiques et demandez l’accès à « 한국저작권위원회_공유(만료)저작물 서비스 » (le service Gongu des œuvres tombées dans le domaine public) ; la clé est délivrée aussitôt. Elle permet jusqu’à 1 000 recherches par jour.',
  gonguPrivacy:
    'Lorsque vous vérifiez la clé ou lancez une recherche, vos mots de recherche et cette clé sont envoyés au portail des données publiques. Aucun contenu de document n’est envoyé. La clé reste sur ce PC.',
  gonguKey: 'Clé de service',
  gonguKeySaved: 'Une clé est enregistrée.',
  gonguNoKey: 'Aucune clé.',
  gonguSave: 'Enregistrer',
  gonguClear: 'Effacer',
  gonguCheck: 'Vérifier',
  gonguChecking: 'Vérification…',
  gonguOk: 'La clé fonctionne.',
  gonguErrNoKey: 'Saisissez une clé.',
  gonguErrBadKey:
    'Le portail des données publiques n’accepte pas cette clé. Copiez-la de nouveau ou vérifiez que votre demande a été approuvée. Une nouvelle clé peut mettre environ une heure à fonctionner.',
  gonguErrExpired: 'La clé a expiré. Prolongez-la sur le portail des données publiques.',
  gonguErrQuota: 'Les recherches du jour sont épuisées. Réessayez demain.',
  gonguErrRate: 'Trop de requêtes en peu de temps. Réessayez dans un instant.',
  gonguErrBlocked:
    'Le portail des données publiques a bloqué les requêtes venant de cette adresse internet.',
  gonguErrNetwork:
    'Impossible de joindre le portail des données publiques. Vérifiez votre connexion internet.',
  gonguErrService:
    'Le portail des données publiques ne répond pas correctement pour le moment. Réessayez dans un instant.',
  gpFind: 'Chercher dans Gongu',
  gpPlaceholder: 'Titre ou artiste (ex. 호랑이, 김홍도)',
  gpSearch: 'Rechercher',
  gpSearching: 'Recherche…',
  gpNoResults: "Aucune image trouvée. Essayez un seul mot du titre ou du nom de l'artiste.",
  gpTotal: '{count} résultats',
  gpMore: 'Plus',
  gpInsert: 'Insérer',
  gpInserting: 'Insertion…',
  gpNoKey: 'Aucune clé Gongu. Saisissez-en une dans Paramètres → Intégrations → « Images Gongu ».',
  gpFooter:
    "Les œuvres de Gongu sont fournies par la Commission coréenne du droit d'auteur. Le crédit d'une image insérée est écrit automatiquement.",
  gpPictureFailed: "Impossible de récupérer l'image. Réessayez dans un instant.",
  gpYear: 'Année',
  gpProvider: 'Fourni par',
  gpWarnNc: 'Interdit dans les documents à but commercial.',
  gpWarnNd: 'Ne doit pas être modifiée (recadrage, changement de couleurs, etc.).',
  gpWarnSa: 'Toute création faite en la modifiant doit être partagée selon les mêmes conditions.',
  gpConfirm: "Cette image a des conditions d'utilisation.\n{conditions}\nL'insérer quand même ?",
  gpLocked:
    'Cette image ne doit pas être modifiée. Vous pouvez la déplacer et la redimensionner en gardant ses proportions.',
  gpCreditList: "Ajouter une liste des crédits d'images",
  gpCheck: 'Vérifier les crédits',
  gpCheckTitle: "Vérification des crédits d'images",
  gpCheckClean: 'Rien à vérifier.',
  gpIssueNoCredit: "Cette image n'a pas de crédit. Vérifiez sa provenance et créditez-la.",
  gpIssueConditions: "Conditions d'utilisation : {conditions}",
  gpIssueChanged:
    'Cette image sans modification autorisée garde des changements (recadrage, filtre, retournement…).',
  gpIssueNoLine: "Sa ligne de crédit n'est pas dans la création.",
  gpGoTo: "Aller à l'image",
  gpReAdd: 'Remettre la ligne de crédit',
  gpPage: 'Page {page}',
  gpCondNc: "pas d'utilisation commerciale",
  gpCondNd: 'pas de modification',
  gpCondSa: 'partage dans les mêmes conditions',
  gpExportWarn: 'Des images demandent une vérification des crédits. Voir Vérifier les crédits.',
  gpClose: 'Fermer',
  gpPicture: 'Image',
} satisfies Record<keyof typeof zh, string>
