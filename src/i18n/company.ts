import { COMPANY } from '@/config/company';

export const companyCopy = {
  en: {
    title: 'Corporate registration',
    operator: `${COMPANY.brand} is operated by ${COMPANY.legalName}`,
    corporation: 'Corporation number',
    business: 'Business number (BN)',
    incorporated: 'Date of incorporation',
    office: 'Registered office',
    viewRecord: 'View official registration',
    note: 'Federal incorporation is not a financial-services licence or government endorsement.',
    licenceQuestion: 'Is corporate registration a financial-services licence?',
    services: [
      [
        'Case review',
        'Reviewing the incident, supporting records, and information supplied for an investigation.',
      ],
      [
        'Transaction tracing',
        'Examining blockchain transactions and documenting relevant addresses and transfer paths.',
      ],
      ['Investigation reports', 'Organising findings and supporting references for the client to review.'],
      [
        'Case communications',
        'Providing access to case updates, messages, and published findings through the client account.',
      ],
      [
        'Scope and limitations',
        'Investigation findings do not guarantee that funds can be recovered. Corporate registration does not establish authorisation to provide regulated financial services.',
      ],
    ],
    registration: `${COMPANY.legalName} is federally incorporated in Canada under corporation number ${COMPANY.corporationNumber}.`,
    websiteInfo: `${COMPANY.brand} is operated by ${COMPANY.legalName}, a Canadian federal corporation (no. ${COMPANY.corporationNumber}). Registered office: ${COMPANY.address}.`,
    about: `${COMPANY.brand} helps organise digital asset investigations through case review, transaction tracing, and documented findings. The website is operated by ${COMPANY.legalName}`,
    verification:
      'You can consult the official Corporations Canada record for our corporate registration. Incorporation alone does not establish a financial-services licence or guarantee a recovery outcome.',
    disclaimer: `${COMPANY.brand} is operated by ${COMPANY.legalName} Our services concern investigation reports and cryptocurrency tracing. We do not provide investment advice, fund management, or a guarantee of recovery.`,
  },
  fr: {
    title: 'Immatriculation de la société',
    operator: `${COMPANY.brand} est exploité par ${COMPANY.legalName}`,
    corporation: 'Numéro de société',
    business: 'Numéro d’entreprise (NE)',
    incorporated: 'Date de constitution',
    office: 'Siège social',
    viewRecord: 'Consulter le registre officiel',
    note: 'La constitution fédérale ne constitue ni un agrément de services financiers ni une approbation gouvernementale.',
    licenceQuestion: 'L’immatriculation constitue-t-elle un agrément de services financiers ?',
    services: [
      ['Examen du dossier', 'Examiner les faits, les pièces et les informations fournies pour l’enquête.'],
      [
        'Traçage des transactions',
        'Analyser les transactions blockchain et documenter les adresses et les parcours de transfert pertinents.',
      ],
      [
        'Rapports d’enquête',
        'Organiser les conclusions et les références justificatives pour consultation par le client.',
      ],
      [
        'Communications du dossier',
        'Donner accès aux mises à jour, aux messages et aux conclusions publiées dans le compte client.',
      ],
      [
        'Portée et limites',
        'Les résultats d’une enquête ne garantissent pas le recouvrement. L’immatriculation ne prouve pas une autorisation de fournir des services financiers réglementés.',
      ],
    ],
    registration: `${COMPANY.legalName} est une société de régime fédéral au Canada, sous le numéro ${COMPANY.corporationNumber}.`,
    websiteInfo: `${COMPANY.brand} est exploité par ${COMPANY.legalName}, une société de régime fédéral canadien (n° ${COMPANY.corporationNumber}). Siège social : ${COMPANY.address}.`,
    about: `${COMPANY.brand} structure les enquêtes sur les actifs numériques : examen du dossier, traçage des transactions et conclusions documentées. Le site est exploité par ${COMPANY.legalName}`,
    verification:
      'Vous pouvez consulter notre immatriculation dans le registre officiel de Corporations Canada. La constitution ne prouve pas un agrément de services financiers et ne garantit aucun recouvrement.',
    disclaimer: `${COMPANY.brand} est exploité par ${COMPANY.legalName} Nos services portent sur les rapports d’enquête et le traçage des cryptomonnaies. Nous ne proposons ni conseils en investissement, ni gestion de fonds, ni garantie de recouvrement.`,
  },
  de: {
    title: 'Unternehmensregistrierung',
    operator: `${COMPANY.brand} wird von ${COMPANY.legalName} betrieben.`,
    corporation: 'Gesellschaftsnummer',
    business: 'Unternehmensnummer (BN)',
    incorporated: 'Gründungsdatum',
    office: 'Eingetragener Sitz',
    viewRecord: 'Offiziellen Registereintrag ansehen',
    note: 'Die bundesrechtliche Gründung ist weder eine Finanzdienstleistungslizenz noch eine staatliche Empfehlung.',
    licenceQuestion: 'Ist die Unternehmensregistrierung eine Finanzdienstleistungslizenz?',
    services: [
      [
        'Fallprüfung',
        'Prüfung des Vorfalls, der Unterlagen und der für die Untersuchung bereitgestellten Informationen.',
      ],
      [
        'Transaktionsverfolgung',
        'Analyse von Blockchain-Transaktionen und Dokumentation relevanter Adressen und Übertragungswege.',
      ],
      [
        'Untersuchungsberichte',
        'Aufbereitung von Ergebnissen und Belegverweisen zur Einsicht durch den Kunden.',
      ],
      [
        'Fallkommunikation',
        'Zugang zu Fallaktualisierungen, Nachrichten und veröffentlichten Ergebnissen im Kundenkonto.',
      ],
      [
        'Umfang und Grenzen',
        'Untersuchungsergebnisse garantieren keine Rückgewinnung. Die Unternehmensregistrierung belegt keine Zulassung für regulierte Finanzdienstleistungen.',
      ],
    ],
    registration: `${COMPANY.legalName} ist in Kanada bundesrechtlich unter der Gesellschaftsnummer ${COMPANY.corporationNumber} gegründet.`,
    websiteInfo: `${COMPANY.brand} wird von ${COMPANY.legalName} betrieben, einer kanadischen Gesellschaft nach Bundesrecht (Nr. ${COMPANY.corporationNumber}). Eingetragener Sitz: ${COMPANY.address}.`,
    about: `${COMPANY.brand} strukturiert Untersuchungen digitaler Vermögenswerte durch Fallprüfung, Transaktionsverfolgung und dokumentierte Ergebnisse. Betreiber der Website ist ${COMPANY.legalName}`,
    verification:
      'Unsere Unternehmensregistrierung lässt sich im offiziellen Register von Corporations Canada einsehen. Die Gründung allein belegt keine Finanzdienstleistungslizenz und garantiert keine Rückgewinnung.',
    disclaimer: `${COMPANY.brand} wird von ${COMPANY.legalName} betrieben. Unsere Leistungen betreffen Untersuchungsberichte und die Verfolgung von Kryptowährungstransaktionen. Wir bieten keine Anlageberatung, Fondsverwaltung oder Rückgewinnungsgarantie.`,
  },
  it: {
    title: 'Registrazione societaria',
    operator: `${COMPANY.brand} è gestito da ${COMPANY.legalName}`,
    corporation: 'Numero di società',
    business: 'Numero d’impresa (BN)',
    incorporated: 'Data di costituzione',
    office: 'Sede legale',
    viewRecord: 'Consulta il registro ufficiale',
    note: 'La costituzione federale non rappresenta una licenza per servizi finanziari né un’approvazione governativa.',
    licenceQuestion: 'La registrazione societaria è una licenza per servizi finanziari?',
    services: [
      ['Esame del caso', 'Esame dell’incidente, dei documenti e delle informazioni forniti per l’indagine.'],
      [
        'Tracciamento delle transazioni',
        'Analisi delle transazioni blockchain e documentazione degli indirizzi e dei percorsi di trasferimento pertinenti.',
      ],
      [
        'Rapporti investigativi',
        'Organizzazione dei risultati e dei riferimenti di supporto per la consultazione del cliente.',
      ],
      [
        'Comunicazioni sul caso',
        'Accesso ad aggiornamenti, messaggi e risultati pubblicati tramite l’account cliente.',
      ],
      [
        'Ambito e limiti',
        'I risultati dell’indagine non garantiscono il recupero dei fondi. La registrazione societaria non attesta l’autorizzazione a fornire servizi finanziari regolamentati.',
      ],
    ],
    registration: `${COMPANY.legalName} è costituita a livello federale in Canada con numero di società ${COMPANY.corporationNumber}.`,
    websiteInfo: `${COMPANY.brand} è gestito da ${COMPANY.legalName}, una società federale canadese (n. ${COMPANY.corporationNumber}). Sede legale: ${COMPANY.address}.`,
    about: `${COMPANY.brand} struttura le indagini sugli asset digitali tramite esame del caso, tracciamento delle transazioni e risultati documentati. Il sito è gestito da ${COMPANY.legalName}`,
    verification:
      'La nostra registrazione societaria è consultabile nel registro ufficiale di Corporations Canada. La costituzione da sola non attesta una licenza per servizi finanziari e non garantisce il recupero.',
    disclaimer: `${COMPANY.brand} è gestito da ${COMPANY.legalName} I nostri servizi riguardano rapporti investigativi e tracciamento di criptovalute. Non offriamo consulenza d’investimento, gestione di fondi o garanzie di recupero.`,
  },
} as const;
