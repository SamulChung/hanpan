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
} satisfies Record<keyof typeof zh, string>
