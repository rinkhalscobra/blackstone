import type { Language } from './translations';

interface RecoveryStageCopy {
  label: string;
  title: string;
  description: string;
  document: string;
  items: [string, string, string];
  outcome: string;
}

interface RecoveryHeroCopy {
  eyebrow: string;
  service: string;
  title: [string, string];
  description: string;
  start: string;
  explore: string;
  note: string;
  process: string;
  processTitle: string;
  overview: string;
  outcome: string;
  stages: [RecoveryStageCopy, RecoveryStageCopy, RecoveryStageCopy];
}

export const recoveryHeroCopy: Record<Language, RecoveryHeroCopy> = {
  en: {
    eyebrow: 'A clearer way forward',
    service: 'Digital asset investigations',
    title: ['Clarity starts', 'with the evidence.'],
    description: 'Understand what happened. Follow the transaction trail. Crest Financial brings case information, blockchain analysis, and recovery guidance into one structured process.',
    start: 'Request a case review',
    explore: 'Explore our approach',
    note: 'A considered first step. A clear view of your options.',
    process: 'Our approach',
    processTitle: 'From the first question to the next step.',
    overview: 'Process overview',
    outcome: 'The objective',
    stages: [
      {
        label: 'Review the case',
        title: 'Start with the facts.',
        description: 'Every investigation begins with context. We review your account of events and supporting records to understand the incident and define the scope of the case.',
        document: 'Information we review',
        items: ['Transaction references', 'Wallet and platform details', 'Supporting correspondence'],
        outcome: 'A clear starting point for your investigation.',
      },
      {
        label: 'Trace the activity',
        title: 'Make the trail understandable.',
        description: 'Transaction analysis connects individual transfers into a wider picture. We examine available blockchain records, wallet activity, and linked movements to document the trail.',
        document: 'The analysis in focus',
        items: ['Transfer history', 'Connected wallet activity', 'Documented transaction patterns'],
        outcome: 'An evidence-led view of how the assets moved.',
      },
      {
        label: 'Plan the next steps',
        title: 'Move forward with context.',
        description: 'Findings should help you make informed decisions. We bring the available evidence together and explain potential next steps in the context of your case.',
        document: 'Your next-step briefing',
        items: ['Summary of findings', 'Organised supporting evidence', 'Case-specific recovery options'],
        outcome: 'A practical understanding of the options ahead.',
      },
    ],
  },
  fr: {
    eyebrow: 'Avancer avec clarté',
    service: 'Enquêtes sur les actifs numériques',
    title: ['La clarté commence', 'par les preuves.'],
    description: 'Comprenez les faits. Suivez les transactions. Crest Financial réunit les informations du dossier, l’analyse blockchain et les pistes de recouvrement dans une démarche structurée.',
    start: 'Demander un examen du dossier',
    explore: 'Découvrir notre démarche',
    note: 'Un premier pas réfléchi. Une vision claire de vos options.',
    process: 'Notre démarche',
    processTitle: 'De la première question à la prochaine étape.',
    overview: 'Aperçu de la démarche',
    outcome: 'L’objectif',
    stages: [
      {
        label: 'Examiner le dossier',
        title: 'Partir des faits.',
        description: 'Toute enquête commence par le contexte. Nous examinons votre récit et les pièces justificatives pour comprendre l’incident et définir le périmètre du dossier.',
        document: 'Les informations examinées',
        items: ['Références des transactions', 'Détails des portefeuilles et plateformes', 'Correspondance relative au dossier'],
        outcome: 'Un point de départ clair pour votre enquête.',
      },
      {
        label: 'Retracer l’activité',
        title: 'Comprendre le parcours des fonds.',
        description: 'L’analyse relie les transferts pour offrir une vue d’ensemble. Nous étudions les données blockchain disponibles, l’activité des portefeuilles et les mouvements associés.',
        document: 'Les axes de l’analyse',
        items: ['Historique des transferts', 'Activité des portefeuilles liés', 'Schémas de transactions documentés'],
        outcome: 'Une lecture du parcours des actifs fondée sur les preuves.',
      },
      {
        label: 'Préparer la suite',
        title: 'Avancer en connaissance de cause.',
        description: 'Les résultats doivent éclairer vos décisions. Nous rassemblons les preuves disponibles et expliquons les prochaines étapes possibles selon votre dossier.',
        document: 'Votre synthèse des prochaines étapes',
        items: ['Synthèse des résultats', 'Pièces justificatives organisées', 'Options de recouvrement adaptées'],
        outcome: 'Une compréhension concrète des options possibles.',
      },
    ],
  },
  de: {
    eyebrow: 'Mit Klarheit weitergehen',
    service: 'Ermittlungen zu digitalen Vermögenswerten',
    title: ['Klarheit beginnt', 'mit den Belegen.'],
    description: 'Verstehen Sie die Ereignisse. Verfolgen Sie die Transaktionen. Crest Financial verbindet Fallinformationen, Blockchain-Analyse und mögliche Rückgewinnungsschritte in einem strukturierten Prozess.',
    start: 'Fallprüfung anfragen',
    explore: 'Unser Vorgehen entdecken',
    note: 'Ein überlegter erster Schritt. Ein klarer Blick auf Ihre Optionen.',
    process: 'Unser Vorgehen',
    processTitle: 'Von der ersten Frage zum nächsten Schritt.',
    overview: 'Prozessübersicht',
    outcome: 'Das Ziel',
    stages: [
      {
        label: 'Den Fall prüfen',
        title: 'Mit den Fakten beginnen.',
        description: 'Jede Untersuchung beginnt mit dem Kontext. Wir prüfen Ihre Schilderung und die Unterlagen, um den Vorfall zu verstehen und den Umfang der Untersuchung festzulegen.',
        document: 'Diese Informationen prüfen wir',
        items: ['Transaktionsreferenzen', 'Wallet- und Plattformangaben', 'Relevanter Schriftverkehr'],
        outcome: 'Ein klarer Ausgangspunkt für Ihre Untersuchung.',
      },
      {
        label: 'Aktivitäten verfolgen',
        title: 'Den Transaktionsweg verstehen.',
        description: 'Die Analyse verbindet einzelne Transfers zu einem Gesamtbild. Wir untersuchen verfügbare Blockchain-Daten, Wallet-Aktivitäten und zusammenhängende Bewegungen.',
        document: 'Im Fokus der Analyse',
        items: ['Transferverlauf', 'Verbundene Wallet-Aktivitäten', 'Dokumentierte Transaktionsmuster'],
        outcome: 'Ein beleggestützter Überblick über die Vermögensbewegungen.',
      },
      {
        label: 'Nächste Schritte planen',
        title: 'Informiert weitergehen.',
        description: 'Erkenntnisse sollen fundierte Entscheidungen ermöglichen. Wir bündeln die verfügbaren Belege und erläutern mögliche nächste Schritte im Kontext Ihres Falls.',
        document: 'Ihr Überblick für das weitere Vorgehen',
        items: ['Zusammenfassung der Erkenntnisse', 'Geordnete Belegunterlagen', 'Fallbezogene Rückgewinnungsoptionen'],
        outcome: 'Ein praktisches Verständnis Ihrer Handlungsmöglichkeiten.',
      },
    ],
  },
  it: {
    eyebrow: 'Un percorso più chiaro',
    service: 'Indagini sugli asset digitali',
    title: ['La chiarezza inizia', 'dalle prove.'],
    description: 'Comprendi i fatti. Segui le transazioni. Crest Financial riunisce informazioni sul caso, analisi blockchain e orientamento al recupero in un percorso strutturato.',
    start: 'Richiedi una valutazione del caso',
    explore: 'Scopri il nostro approccio',
    note: 'Un primo passo ponderato. Una visione chiara delle tue opzioni.',
    process: 'Il nostro approccio',
    processTitle: 'Dalla prima domanda al prossimo passo.',
    overview: 'Panoramica del percorso',
    outcome: 'L’obiettivo',
    stages: [
      {
        label: 'Esaminare il caso',
        title: 'Partire dai fatti.',
        description: 'Ogni indagine parte dal contesto. Esaminiamo il tuo racconto e i documenti disponibili per comprendere l’accaduto e definire l’ambito del caso.',
        document: 'Le informazioni esaminate',
        items: ['Riferimenti delle transazioni', 'Dettagli di wallet e piattaforme', 'Corrispondenza relativa al caso'],
        outcome: 'Un punto di partenza chiaro per la tua indagine.',
      },
      {
        label: 'Tracciare le attività',
        title: 'Comprendere il percorso dei fondi.',
        description: 'L’analisi collega i singoli trasferimenti in un quadro più ampio. Esaminiamo i dati blockchain disponibili, le attività dei wallet e i movimenti correlati.',
        document: 'Il fulcro dell’analisi',
        items: ['Cronologia dei trasferimenti', 'Attività dei wallet collegati', 'Schemi di transazione documentati'],
        outcome: 'Una visione dei movimenti degli asset basata sulle prove.',
      },
      {
        label: 'Pianificare i prossimi passi',
        title: 'Procedere con consapevolezza.',
        description: 'I risultati devono aiutarti a decidere. Riuniamo le prove disponibili e illustriamo i possibili passi successivi nel contesto del tuo caso.',
        document: 'Il quadro dei prossimi passi',
        items: ['Sintesi dei risultati', 'Documentazione di supporto organizzata', 'Opzioni di recupero specifiche'],
        outcome: 'Una comprensione concreta delle opzioni disponibili.',
      },
    ],
  },
};
