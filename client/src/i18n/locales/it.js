/*
 * Italian locale (Italiano)
 * -------------------------
 * Mirrors en.js. Any omitted key falls back to English automatically.
 */

export default {
  common: {
    bookTurnover: "Prenota una pulizia",
    callUs: "Chiamaci",
    getStarted: "Inizia ora",
    learnMore: "Scopri di più",
    readMore: "Leggi di più",
    viewAll: "Vedi tutto",
    loading: "Caricamento",
    submit: "Invia",
    send: "Invia messaggio",
    continue: "Continua",
    back: "Indietro",
    edit: "Modifica",
    signIn: "Accedi",
    signUp: "Registrati",
    signOut: "Esci",
    email: "Email",
    password: "Password",
    fullName: "Nome completo",
    phone: "Telefono",
    optional: "Facoltativo",
    search: "Cerca",
    talkToTeam: "Parla con il nostro team",
    talkToSales: "Contatta le vendite",
    from: "Da",
    perTurnover: "/ visita",
  },

  language: { label: "Lingua", select: "Seleziona lingua" },

  theme: { label: "Tema", light: "Chiaro", dark: "Scuro" },

  profile: {
    title: "Il mio profilo",
    subtitle: "Gestisci i dati e le preferenze del tuo account.",
    menu: "Profilo",
    account: "Account",
    personalInfo: "Informazioni personali",
    memberSince: "Membro dal",
    role: "Ruolo",
    verified: "Verificato",
    unverified: "Non verificato",
    save: "Salva modifiche",
    saved: "Il tuo profilo è stato aggiornato.",
    adminConsole: "Pannello admin",
    dangerZone: "Esci dal tuo account",
    bookingHistory: "Storico prenotazioni",
    bookingHistorySubtitle: "Le tue pulizie passate e future.",
    noBookings: "Nessuna prenotazione",
    noBookingsHint: "Quando prenoti una pulizia, apparirà qui.",
    bookNow: "Prenota una pulizia",
    cancelBooking: "Annulla",
    cancelTitle: "Annullare questa prenotazione?",
    cancelBody: "Verrà annullata la tua pulizia {service} del {date}. L'azione è irreversibile.",
    cancelConfirm: "Sì, annulla la prenotazione",
    keepBooking: "Mantieni la prenotazione",
    cancelError: "Non siamo riusciti ad annullare la prenotazione. Riprova.",
    rate: "Valuta",
    yourRating: "La tua valutazione",
    rateTitle: "Valuta la tua prenotazione",
    rateSubtitle: "Com'è andata la tua pulizia {service} del {date}?",
    ratingLabel: "La tua valutazione",
    rateStars: "Valutazione di {count} stelle",
    commentLabel: "La tua recensione",
    commentPlaceholder: "Raccontaci com'è andata…",
    submitReview: "Invia recensione",
    reviewError: "Non siamo riusciti a inviare la recensione. Riprova.",
    payments: {
      title: "Metodi di pagamento",
      add: "Aggiungi carta",
      addTitle: "Aggiungi un metodo di pagamento",
      save: "Salva carta",
      empty: "Nessuna carta salvata.",
      remove: "Rimuovi carta",
      error: "Non siamo riusciti a salvare la carta. Riprova.",
    },
  },

  nav: {
    services: "Servizi",
    pricing: "Prezzi",
    about: "Chi siamo",
    blog: "Blog",
    faq: "FAQ",
    contact: "Contatti",
    careers: "Lavora con noi",
    menu: "Menu",
  },

  footer: {
    blurb:
      "Pulizie professionali per case e uffici in tutta Italia. Addetti selezionati e assicurati, prezzi trasparenti e una garanzia dietro ogni visita.",
    newsletterTitle: "Ricevi consigli per la casa, ogni mese",
    subscribe: "Iscriviti",
    subscribed: "Iscrizione completata — controlla la tua casella.",
    emailPlaceholder: "tu@email.com",
    rights: "Tutti i diritti riservati.",
    columns: {
      Company: "Azienda",
      Services: "Servizi",
      Resources: "Risorse",
      Legal: "Legale",
    },
    links: {
      "About us": "Chi siamo",
      Careers: "Lavora con noi",
      Blog: "Blog",
      Contact: "Contatti",
      "Home cleaning": "Pulizie di casa",
      "Deep cleaning": "Pulizia profonda",
      "Office cleaning": "Pulizie uffici",
      "Move-out cleaning": "Pulizie di fine locazione",
      Pricing: "Prezzi",
      FAQ: "FAQ",
      "Book a cleaning": "Prenota una pulizia",
      "Privacy policy": "Informativa privacy",
      "Terms of service": "Termini di servizio",
    },
  },

  auth: {
    panelTitle: "Pulizie, gestite.",
    panelSubtitle:
      "Unisciti a migliaia di clienti che si affidano a CasaClean per case e uffici impeccabili.",
    panelStat1: "48.000+ pulizie completate",
    panelStat2: "4,97★ valutazione media dei clienti",
    panelStat3: "99,6% di arrivi puntuali",
    orContinueWith: "oppure continua con",
    google: "Continua con Google",
    backToSite: "Torna al sito",
    signin: {
      title: "Bentornato",
      subtitle: "Accedi per gestire le tue prenotazioni e preferenze.",
      submit: "Accedi",
      forgot: "Password dimenticata?",
      noAccount: "Nuovo su CasaClean?",
      createAccount: "Crea un account",
      success: "Accesso effettuato. Reindirizzamento…",
    },
    signup: {
      title: "Crea il tuo account",
      subtitle: "Prenota la tua prima pulizia in pochi minuti.",
      submit: "Crea account",
      haveAccount: "Hai già un account?",
      signInInstead: "Accedi",
      terms:
        "Creando un account accetti i nostri Termini e l'Informativa sulla privacy.",
      success: "Account creato! Controlla la tua email per la verifica.",
      verifyNote:
        "Abbiamo inviato un link di verifica alla tua email. Aprilo per attivare l'account: verrai connesso e portato alla home automaticamente.",
    },
    fields: {
      fullName: "Nome completo",
      email: "Email",
      phone: "Telefono",
      password: "Password",
      confirmPassword: "Conferma password",
      rememberMe: "Ricordami",
    },
    placeholders: {
      fullName: "Lela Gorelishvili",
      email: "tu@email.com",
      phone: "+39 ...",
      password: "••••••••",
    },
    errors: {
      nameMin: "Inserisci il tuo nome completo",
      emailInvalid: "Inserisci un indirizzo email valido",
      phoneInvalid: "Inserisci un numero di telefono valido",
      passwordMin: "La password deve contenere almeno 8 caratteri",
      passwordUpper: "Includi almeno una lettera maiuscola",
      passwordNumber: "Includi almeno un numero",
      passwordMatch: "Le password non coincidono",
      generic: "Qualcosa è andato storto. Riprova.",
    },
  },

  hero: {
    badge: "Ora in 12 città in tutta Italia",
    titleA: "Una casa impeccabile,",
    titleHighlight: "senza muovere un dito",
    subtitle:
      "Prenota un professionista delle pulizie selezionato e assicurato per la tua casa o il tuo ufficio in circa 60 secondi. Prezzi trasparenti, la tua lingua parlata e ogni visita coperta dalla nostra Garanzia Impeccabile.",
    ctaPrimary: "Prenota una pulizia",
    ctaSecondary: "Scopri come funziona",
    ratingText: "da oltre 1.280 clienti",
    guarantee: "Garanzia Impeccabile",
    cardLabel: "Pulizia di casa",
    cardStatus: "Impeccabile ✓",
    cardStatusLabel: "Stato",
    cardRatingLabel: "Valutazione media clienti",
  },

  trustedBy: {
    label: "Valutati eccellente dai clienti sulle piattaforme che già conosci",
  },

  servicesSection: {
    eyebrow: "Cosa facciamo",
    title: "Ogni tipo di pulizia, un unico team di fiducia",
    subtitle:
      "Dal riordino settimanale di casa ai contratti per uffici e alle pulizie di fine locazione — scegli ciò che ti serve, al resto pensiamo noi.",
    exploreAll: "Esplora tutti i servizi",
    bookNow: "Prenota ora",
    mostBooked: "Più richiesto",
  },

  why: {
    eyebrow: "Perché CasaClean",
    title: "Pulizie a cui puoi finalmente smettere di pensare",
    subtitle:
      "Ci occupiamo noi dei dettagli — selezione, pianificazione, qualità — così prenotare una pulizia diventa facile come chiamare un taxi.",
    items: {
      reliability: {
        title: "Puntuali, ogni volta",
        description:
          "Professionisti puntuali, pianificazione in tempo reale e un tasso di arrivi puntuali del 99,6% — anche per richieste in giornata.",
      },
      standards: {
        title: "Professionisti con verifiche approfondite",
        description:
          "Ogni addetto è identificato, sottoposto a controlli, assicurato e formato sul nostro standard di 50 punti prima della prima visita.",
      },
      allinone: {
        title: "Un solo team per casa e ufficio",
        description:
          "Pulizie regolari, pulizie profonde, uffici, fine locazione, lavanderia e disinfezione — una prenotazione, una fattura, un unico standard.",
      },
      guarantee: {
        title: "La Garanzia Impeccabile",
        description:
          "Non sei soddisfatto di una pulizia? Comunicacelo entro 48 ore e ripuliamo gratis — oppure rimborsiamo la visita.",
      },
    },
  },

  workflow: {
    eyebrow: "Come funziona",
    title: "Dalla prenotazione allo splendore in quattro passi",
    subtitle:
      "Prenotare una pulizia non deve essere una fatica. Ecco tutta l'esperienza.",
    items: {
      book: {
        title: "Prenota online in 60 secondi",
        description:
          "Scegli il servizio, raccontaci del tuo spazio e seleziona un orario. Vedi il prezzo esatto prima di confermare.",
      },
      clean: {
        title: "Ti abbiniamo a un professionista",
        description:
          "Assegniamo un addetto selezionato e verificato compatibile con i tuoi orari — tenendo conto di lingua e preferenze.",
      },
      inspect: {
        title: "Facciamo splendere tutto",
        description:
          "Il tuo addetto segue la nostra checklist di 50 punti, partendo dalle priorità indicate nella prenotazione.",
      },
      relax: {
        title: "Valuta — è garantito",
        description:
          "Valuta la pulizia al termine. Se qualcosa non va, ripuliamo entro 48 ore senza costi.",
      },
    },
  },

  timeline: {
    eyebrow: "Processo in loco",
    title: "Cosa succede durante la tua pulizia",
    subtitle:
      "Nessun mistero su dove finiscono le ore. Ecco come si svolge una tipica visita CasaClean.",
    items: {
      arrival: {
        title: "Arrivo e sopralluogo",
        description:
          "Il tuo addetto arriva puntuale, rivede le note della prenotazione e conferma priorità ed eventuali zone da evitare.",
      },
      strip: {
        title: "Riordino e spolveratura",
        description:
          "Le superfici vengono riordinate e spolverate dall'alto in basso — mensole, cornici, battiscopa e gli angoli dimenticati.",
      },
      "kitchen-bath": {
        title: "Cucina e bagni",
        description:
          "Gli ambienti che contano di più: sgrassatura, decalcificazione e sanificazione di elettrodomestici, sanitari e superfici di contatto.",
      },
      living: {
        title: "Camere e zone giorno",
        description:
          "Letti rifatti, specchi lucidati, mobili puliti e ogni stanza riportata alla calma.",
      },
      restock: {
        title: "Pavimenti e tocchi finali",
        description:
          "Aspirapolvere e lavaggio ovunque, cestini svuotati e ogni cosa rimessa al suo posto.",
      },
      inspect: {
        title: "Controllo finale e feedback",
        description:
          "Un ultimo passaggio sulla checklist, poi valuti la visita — il tuo feedback migliora ogni pulizia successiva.",
      },
    },
  },

  beforeAfter: {
    eyebrow: "La differenza CasaClean",
    title: "Guarda la trasformazione",
    subtitle:
      "Trascina per confrontare una stanza vissuta di tutti i giorni con lo stesso spazio dopo una visita CasaClean.",
    before: "Prima",
    after: "Dopo",
  },

  stats: {
    turnovers: "Pulizie completate",
    rating: "Valutazione media dei clienti",
    ontime: "Tasso di arrivi puntuali",
    cities: "Città servite",
  },

  testimonialsSection: {
    eyebrow: "Amato dai clienti",
    title: "I clienti non si limitano ad apprezzarci — riprenotano",
    subtitle:
      "Parole reali dalle case e dagli uffici che si affidano a CasaClean.",
  },

  testimonials: {
    t1: {
      quote:
        "Tornare a casa il venerdì e trovare l'appartamento impeccabile ha davvero cambiato la nostra settimana. La stessa addetta ad ogni visita, e sa esattamente come ci piace.",
      metric: "Cliente settimanale da 2 anni",
    },
    t2: {
      quote:
        "Il nostro studio viene pulito prima dell'arrivo del team, con una fattura al mese e zero solleciti. Passare a CasaClean mi ha tolto un intero compito dal lavoro.",
      metric: "3 sedi, una sola fattura",
    },
    t3: {
      quote:
        "Ho prenotato in inglese in circa un minuto, e anche la mia addetta parlava inglese — niente app di traduzione imbarazzanti. Il mio appartamento non è mai stato così bello.",
      metric: "Prenotato in meno di un minuto",
    },
    t4: {
      quote:
        "Le loro pulizie di fine locazione sono così accurate che i miei inquilini riottengono la caparra senza una sola contestazione. Ora ne prenoto una ad ogni cambio.",
      metric: "Caparre restituite per intero",
    },
    t5: {
      quote:
        "La pulizia profonda è arrivata dove io non riuscivo da anni — dentro il forno, dietro i mobili, tutto. Persone gentili e attente.",
      metric: "4,97★ dopo oltre 40 visite",
    },
  },

  faqSection: {
    eyebrow: "Risposte alle domande",
    title: "Le cose che i clienti ci chiedono di più",
    subtitle: "Non trovi ciò che cerchi? Il nostro team è a un messaggio di distanza.",
    readAll: "Leggi tutte le FAQ",
  },

  cta: {
    eyebrow: "Pronti quando vuoi",
    title: "Hai di meglio da fare che sfregare.",
    subtitle:
      "Prenota un addetto selezionato in circa un minuto — niente contratti, niente vincoli, solo uno spazio impeccabile.",
    primary: "Prenota una pulizia",
    secondary: "Parla con il nostro team",
  },

  services: {
    1: {
      name: "Pulizie di Casa",
      tagline: "La tua pulizia di routine, senza pensieri",
      description:
        "Una pulizia accurata di tutta la casa — cucina, bagni, camere e zone giorno — una tantum o con la frequenza che preferisci.",
      features: [
        "Sanificazione di cucina e bagno",
        "Spolveratura, aspirapolvere e lavaggio",
        "Letti rifatti e stanze riordinate",
        "Cestini svuotati e superfici lucidate",
      ],
    },
    2: {
      name: "Pulizia Profonda",
      tagline: "Per quando serve più di una passata",
      description:
        "Una pulizia intensiva dall'alto in basso — interno degli elettrodomestici, calcare, fughe e tutti i punti che una pulizia normale non raggiunge.",
      features: [
        "Interno di forno, frigo e mobili",
        "Trattamento calcare, fughe e piastrelle",
        "Battiscopa, porte e bocchette",
        "Sotto e dietro i mobili",
      ],
    },
    3: {
      name: "Pulizie Uffici",
      tagline: "Uno spazio di lavoro che il team apprezza",
      description:
        "Pulizie affidabili per uffici, studi e negozi — programmate intorno ai tuoi orari di lavoro, con un'unica semplice fattura mensile.",
      features: [
        "Scrivanie, sale riunioni e cucine",
        "Punti di contatto sanificati",
        "Fasce serali e mattutine",
        "Fatturazione mensile disponibile",
      ],
    },
    4: {
      name: "Pulizie Trasloco / Fine Locazione",
      tagline: "Lascia dietro di te solo splendore",
      description:
        "Una pulizia di fine locazione rigorosa che aiuta a riottenere la caparra per intero e a iniziare da zero — accurata come la checklist di un proprietario.",
      features: [
        "Pulizia profonda dell'intero immobile",
        "Interno di elettrodomestici e armadi",
        "Finestre, infissi e porte",
        "Documentazione utile per la caparra",
      ],
    },
    5: {
      name: "Lavanderia e Stiratura",
      tagline: "Fresco, piegato e riposto",
      description:
        "Aggiungi lavaggio, stiratura e piegatura a qualsiasi pulizia — o prenotalo da solo. Il tuo guardaroba e la tua biancheria, gestiti.",
      features: [
        "Lavaggio, asciugatura e piegatura",
        "Stiratura e cura dei capi",
        "Rotazione di lenzuola e asciugamani",
        "Extra abbinabile a ogni pulizia",
      ],
    },
    6: {
      name: "Sanificazione e Disinfezione",
      tagline: "Pulizia certificata, fin nei dettagli",
      description:
        "Disinfezione di livello professionale delle superfici di contatto per case e luoghi di lavoro — ideale dopo malattie, inquilini o ristrutturazioni.",
      features: [
        "Disinfettanti professionali certificati",
        "Trattamento delle superfici di contatto",
        "Focus su cucina e bagni",
        "Adatta a case e uffici",
      ],
    },
  },

  faq: {
    categories: {
      "getting-started": "Per iniziare",
      "pricing-billing": "Prezzi e fatturazione",
      "quality-trust": "Qualità e fiducia",
    },
    items: {
      q1: {
        question: "Devo essere a casa durante la pulizia?",
        answer:
          "Dipende solo da te. Molti clienti consegnano le chiavi, usano una serratura smart o le lasciano al portiere. Il tuo addetto conferma arrivo e completamento, così sai sempre a che punto siamo.",
      },
      q2: {
        question: "In quali città operate?",
        answer:
          "Operiamo attualmente in 12 città italiane tra cui Roma, Milano, Firenze, Napoli e Venezia — e ci espandiamo ogni trimestre. Inserisci il tuo indirizzo in fase di prenotazione per confermare la copertura.",
      },
      q3: {
        question: "L'addetto porta prodotti e attrezzatura?",
        answer:
          "Sì — di norma il tuo addetto arriva con prodotti professionali e attrezzatura senza costi aggiuntivi. Preferisci i tuoi prodotti ecologici o specifici? Basta lasciare una nota nella prenotazione.",
      },
      q4: {
        question: "Come funzionano i prezzi?",
        answer:
          "Il prezzo è orario e dipende dalle dimensioni del tuo spazio e dal servizio scelto. Vedi il prezzo esatto prima di confermare — niente contratti, niente costi nascosti, e i piani regolari fanno risparmiare il 20%.",
      },
      q5: {
        question: "Come posso pagare?",
        answer:
          "Paghi online in modo sicuro con carta al momento della prenotazione — accettiamo tutte le principali carte tramite Stripe. Se annulli in tempo, il pagamento viene rimborsato per intero automaticamente.",
      },
      q6: {
        question: "Qual è la politica di cancellazione?",
        answer:
          "Puoi annullare gratuitamente fino a 24 ore prima dell'appuntamento. Entro le 24 ore si applica una penale del 50%, perché il tuo addetto ha riservato quel tempo per te.",
      },
      q7: {
        question: "E se non sono soddisfatto della pulizia?",
        answer:
          "Ogni visita è coperta dalla nostra Garanzia Impeccabile: comunicacelo entro 48 ore e rimanderemo un addetto a sistemare tutto gratuitamente — oppure rimborsiamo la visita.",
      },
      q8: {
        question: "I vostri addetti sono selezionati e assicurati?",
        answer:
          "Sì. Ogni professionista è identificato, sottoposto a controlli, formato sul nostro standard di 50 punti e coperto da assicurazione di responsabilità ad ogni singola visita.",
      },
      q9: {
        question: "Posso avere sempre lo stesso addetto?",
        answer:
          "Sì — con un piano regolare settimanale o quindicinale mantieni lo stesso addetto di fiducia, che impara esattamente come ti piace la casa. Se non è disponibile, ti proponiamo un sostituto verificato che puoi accettare o rifiutare.",
      },
    },
  },

  pages: {
    services: {
      heroEyebrow: "I nostri servizi",
      heroTitle: "Pulizie professionali per ogni spazio e situazione",
      heroSubtitle:
        "Una tantum, regolare, profonda, per l'ufficio o di fine locazione — prenota esattamente la pulizia che ti serve, da professionisti selezionati.",
      emptyTitle: "Servizi in arrivo",
      emptyDescription:
        "Stiamo ultimando la nostra gamma di servizi. Contattaci e creeremo un piano su misura per te.",
      emptyAction: "Contattaci",
      processEyebrow: "Il processo",
      processTitle: "Semplice fin dalla prima prenotazione",
      processSubtitle:
        "Qualunque servizio tu scelga, l'esperienza è la stessa: semplice, affidabile, garantita.",
      includedEyebrow: "Sempre incluso",
      includedTitle: "Ogni visita, garantita",
      includedSubtitle: "Qualunque servizio prenoti, questi sono di serie.",
      included: [
        "Professionisti selezionati e verificati",
        "Prodotti e attrezzatura professionali inclusi",
        "La nostra checklist di qualità di 50 punti",
        "Assicurazione completa ad ogni visita",
        "Pagamento online sicuro e ricevute",
        "Garanzia Impeccabile — o ripuliamo gratis",
      ],
      ctaTitle: "Non sai quale pulizia ti serve?",
      ctaSubtitle:
        "Raccontaci del tuo spazio e ti consiglieremo il servizio e la durata giusti.",
    },
    pricing: {
      heroEyebrow: "Prezzi",
      heroTitle: "Prezzi semplici che crescono con te",
      heroSubtitle:
        "Paga a visita o risparmia con un piano regolare. Niente contratti, niente costi di attivazione, nessuna sorpresa.",
      disclaimer:
        "I prezzi indicati sono di partenza e variano in base alle dimensioni dell'immobile. Vedrai un preventivo esatto prima di confermare qualsiasi prenotazione.",
      addonsEyebrow: "Extra",
      addonsTitle: "Personalizza ogni pulizia con gli extra",
      addonsSubtitle: "Aggiungi esattamente ciò che serve al tuo spazio, quando serve.",
      faqEyebrow: "FAQ sui prezzi",
      faqTitle: "Buono a sapersi",
      ctaTitle: "Inizia con una singola pulizia",
      ctaSubtitle:
        "Nessun piano richiesto. Prenota una visita, vedi la differenza, poi decidi.",
    },
    about: {
      heroEyebrow: "La nostra storia",
      heroTitle: "Abbiamo creato CasaClean per rendere semplici le grandi pulizie",
      heroSubtitle:
        "Ciò che è iniziato con tre addetti e un furgone in prestito è oggi un team selezionato che mantiene impeccabili migliaia di case e luoghi di lavoro in tutta Italia.",
      missionLabel: "La nostra missione",
      mission:
        "Restituire alle persone il loro tempo — rendendo le pulizie professionali e affidabili facili da prenotare come un taxi, per ogni casa e luogo di lavoro.",
      valuesEyebrow: "I nostri valori",
      valuesTitle: "I principi dietro ogni visita",
      milestonesEyebrow: "Tappe",
      milestonesTitle: "Come siamo arrivati fin qui",
      teamEyebrow: "Leadership",
      teamTitle: "Le persone dietro CasaClean",
      ctaTitle: "Unisciti a migliaia di clienti che si affidano a CasaClean",
      ctaSubtitle:
        "Scopri una pulizia su cui puoi contare — a casa e al lavoro.",
    },
    contact: {
      heroEyebrow: "Contatti",
      heroTitle: "Rendiamo impeccabile il tuo spazio",
      heroSubtitle:
        "Domande su copertura, prezzi o pulizie per il tuo ufficio? Siamo qui per aiutarti, 7 giorni su 7.",
      emailLabel: "Scrivici",
      emailNote: "Rispondiamo entro un giorno lavorativo",
      phoneLabel: "Chiamaci",
      phoneNote: "Lun–Sab, 9:00–18:00 CET",
      visitLabel: "Vieni a trovarci",
      visitNote: "Su appuntamento",
      pmTitle: "Ufficio o più immobili?",
      pmNote: "Chiedi dei piani business, della fatturazione mensile e dei prezzi per volumi.",
      formTitle: "Inviaci un messaggio",
      formSubtitle: "Compila il modulo e ti ricontatteremo a breve.",
      successTitle: "Messaggio inviato",
      successBody:
        "Grazie per averci contattato — un membro del nostro team ti risponderà entro un giorno lavorativo.",
      fields: {
        name: "Nome completo",
        email: "Email",
        phone: "Telefono",
        topic: "Argomento",
        message: "Come possiamo aiutarti?",
        messagePlaceholder: "Raccontaci del tuo spazio e di ciò che ti serve…",
        topicPlaceholder: "Seleziona un argomento",
      },
      topics: {
        general: "Richiesta generale",
        booking: "Prenotare una pulizia",
        pricing: "Prezzi e piani",
        partnership: "Uffici / pulizie aziendali",
        support: "Assistenza per clienti esistenti",
      },
    },
    faq: {
      heroEyebrow: "Centro assistenza",
      heroTitle: "Domande frequenti",
      heroSubtitle:
        "Tutto ciò che devi sapere per prenotare con CasaClean. Ancora dubbi? Contattaci quando vuoi.",
      ctaEyebrow: "Hai ancora domande?",
      ctaTitle: "Siamo a un messaggio di distanza",
      ctaSubtitle:
        "Il nostro team risponde entro un giorno lavorativo — di solito molto prima.",
    },
    careers: {
      heroEyebrow: "Lavora con noi",
      heroTitle: "Fai un lavoro di cui essere orgoglioso — e vieni valorizzato",
      heroSubtitle:
        "Crediamo che pulire sia un lavoro qualificato che merita una paga equa, formazione vera e rispetto. Vieni a costruire l'azienda di pulizie più affidabile d'Italia.",
      seeRoles: "Vedi le posizioni aperte",
      perksEyebrow: "Perché unirti a noi",
      perksTitle: "Più di un lavoro — un posto dove crescere",
      rolesEyebrow: "Posizioni aperte",
      rolesTitle: "Trova il tuo ruolo",
      apply: "Candidati",
      noRolesTitle: "Nessuna posizione aperta al momento",
      noRolesBody:
        "Incontriamo sempre persone valide. Inviaci il tuo CV e ti contatteremo quando ci sarà l'occasione giusta.",
      getInTouch: "Mettiti in contatto",
      ctaEyebrow: "Non vedi il tuo ruolo?",
      ctaTitle: "Cerchiamo sempre persone valide",
      ctaSubtitle:
        "Raccontaci come renderesti CasaClean migliore e troveremo un modo per parlarne.",
      sendCv: "Invia il tuo CV",
      learnAbout: "Scopri di più su di noi",
    },
    blog: {
      heroEyebrow: "Il blog di CasaClean",
      heroTitle: "Guide pratiche per una casa e un ufficio più puliti",
      heroSubtitle:
        "Checklist, guide stanza per stanza e consigli onesti da addetti alle pulizie professionisti.",
      searchPlaceholder: "Cerca articoli…",
      noResultsTitle: "Nessun articolo trovato",
      noResultsBody: "Prova una categoria o un termine di ricerca diverso.",
      minRead: "min di lettura",
      allArticles: "Tutti gli articoli",
      relatedEyebrow: "Continua a leggere",
      relatedTitle: "Articoli correlati",
      notFoundTitle: "Articolo non trovato",
      notFoundBody: "Questo articolo potrebbe essere stato spostato o rimosso.",
      backToBlog: "Torna al blog",
      ctaEyebrow: "Mettilo in pratica",
      ctaTitle: "Smetti di leggere di case impeccabili. Prenotane una.",
      ctaSubtitle: "Scopri lo standard CasaClean nel tuo spazio.",
    },
    notFound: {
      code: "404",
      title: "Questa pagina è stata spazzata via",
      subtitle:
        "La pagina che cerchi non esiste o è stata spostata. Torniamo a uno spazio pulito.",
      home: "Torna alla home",
      services: "Sfoglia i servizi",
      goBack: "Torna indietro",
    },
  },

  pricingPlans: {
    payg: {
      name: "Pulizia Singola",
      description: "Perfetta per un riordino una tantum, un'occasione speciale o una prova.",
      cadence: "Fatturata a visita",
      cta: "Prenota una pulizia",
      features: [
        "Pulizia standard della casa",
        "Prodotti professionali inclusi",
        "Professionista selezionato e assicurato",
        "Pagamento online sicuro",
        "Garanzia Impeccabile",
      ],
    },
    host: {
      name: "Pulizia Regolare",
      description: "Per case pulite ogni settimana o ogni due — il nostro piano più popolare.",
      cadence: "Fatturato mensile · risparmia 20%",
      badge: "Più popolare",
      cta: "Inizia un piano regolare",
      features: [
        "Tutto quanto incluso in Pulizia Singola",
        "Lo stesso addetto di fiducia ad ogni visita",
        "Priorità e pianificazione in giornata",
        "Salta o riprogramma quando vuoi",
        "Sconto sull'extra lavanderia e stiratura",
        "Linea di supporto dedicata",
      ],
    },
    portfolio: {
      name: "Aziende e Uffici",
      description: "Pulizie su misura per uffici, studi, negozi e proprietari.",
      cadence: "Su misura per i tuoi spazi",
      unit: "Personalizzato",
      cta: "Contatta le vendite",
      features: [
        "Tutto quanto incluso in Pulizia Regolare",
        "Pianificazione fuori orario",
        "Un'unica fattura mensile",
        "Account manager dedicato",
        "Più sedi, un solo referente",
        "SLA e reportistica personalizzati",
      ],
    },
  },

  pricingAddons: {
    deep: { label: "Pulizia profonda", note: "Reset intensivo dall'alto in basso" },
    linen: { label: "Lavanderia e stiratura", note: "Lavato, stirato e piegato" },
    restock: { label: "Interno frigo e forno", note: "Sgrassati e decalcificati, dentro e fuori" },
    staging: { label: "Vetri interni", note: "Vetri, infissi e davanzali" },
  },

  values: {
    hospitality: {
      title: "Cura in ogni angolo",
      description:
        "Puliamo ogni casa come se il proprietario ci stesse guardando — perché la fiducia si guadagna nei dettagli.",
    },
    accountability: {
      title: "Responsabilità radicale",
      description:
        "Checklist chiare e feedback onesti. Se ci sfugge qualcosa, ce ne assumiamo la responsabilità e la sistemiamo, in fretta.",
    },
    craft: {
      title: "Orgoglio del mestiere",
      description:
        "Pulire è un'abilità. Formiamo, certifichiamo e premiamo i professionisti che lo fanno in modo eccellente.",
    },
    scale: {
      title: "Creato per crescere con te",
      description:
        "Da un monolocale a una catena di uffici, il nostro team e i nostri strumenti crescono senza saltare una visita.",
    },
  },

  milestones: {
    m1: { title: "Fondata a Roma", description: "Iniziata con tre addetti e una promessa: pulizie su cui contare." },
    m2: { title: "Millesima prenotazione", description: "Il passaparola ci ha portati a Firenze e Milano nel primo anno." },
    m3: { title: "La Garanzia Impeccabile", description: "Lanciati il nostro standard di 50 punti e la garanzia di ripulitura gratuita." },
    m4: { title: "12 città, 48k+ pulizie", description: "Diventati il partner di pulizie di riferimento per case e uffici." },
  },

  leadership: {
    founder: { role: "Co-fondatrice e CEO", bio: "Ex direttrice housekeeping d'albergo, ha guidato squadre di pulizia su oltre 200 camere e suite." },
    ops: { role: "Co-fondatore e COO", bio: "Ha costruito e gestito operazioni sul campo multi-città per un'azienda di logistica on-demand." },
    product: { role: "Head of Product", bio: "Leader di prodotto focalizzato su strumenti che rendono semplice prenotare e gestire una pulizia." },
    quality: { role: "Head of Quality", bio: "Ha definito lo standard di 50 punti con cui viene misurata ogni visita CasaClean." },
  },

  perks: {
    p1: { title: "Retribuzione sopra la media", description: "Base competitiva, bonus sulle prestazioni e tempo di viaggio retribuito." },
    p2: { title: "Orari flessibili", description: "Scegli i turni adatti alla tua vita — tempo pieno o parziale." },
    p3: { title: "Formazione retribuita", description: "Ottieni la certificazione sul nostro standard di pulizia di 50 punti, interamente pagata." },
    p4: { title: "Salute e assicurazione", description: "Copertura e assicurazione completa ad ogni visita." },
    p5: { title: "Veri percorsi di crescita", description: "Ruoli di caposquadra, formatore e ops regionali, promossi dall'interno." },
    p6: { title: "Un team che ti sostiene", description: "Colleghi di supporto e assistenza operativa reattiva, sempre." },
  },

  roleTypes: { "Full-time": "Tempo pieno", "Part-time": "Tempo parziale" },

  teams: {
    Operations: "Operazioni",
    Quality: "Qualità",
    Engineering: "Ingegneria",
    "Customer Success": "Customer Success",
  },

  booking: {
    backToSite: "Torna al sito",
    title: "Prenota la tua pulizia",
    subtitle:
      "Uno spazio impeccabile in pochi rapidi passaggi. Paga in modo sicuro per confermare — la carta viene addebitata alla prenotazione e rimborsata per intero se annulli.",
    continue: "Continua",
    back: "Indietro",
    confirm: "Conferma prenotazione",
    steps: {
      property: { title: "Dettagli proprietà", subtitle: "Dove dobbiamo pulire?" },
      preferences: { title: "Preferenze di pulizia", subtitle: "Personalizza la tua pulizia" },
      schedule: { title: "Calendario", subtitle: "Scegli data e ora" },
      contact: { title: "I tuoi dati", subtitle: "Come contattarti" },
      review: { title: "Riepilogo", subtitle: "Conferma che sia tutto corretto" },
      payment: { title: "Pagamento", subtitle: "Checkout sicuro per confermare la prenotazione" },
    },
    payment: {
      heading: "Paga per confermare la prenotazione",
      newCard: "Paga con una nuova carta",
      savedCards: "Le tue carte salvate",
      saveCard: "Salva questa carta per prenotazioni future più rapide",
      pay: "Paga {amount}",
      processing: "Pagamento in corso…",
      securedByStripe: "I pagamenti sono protetti da Stripe. La carta viene addebitata ora e rimborsata per intero se annulli.",
      unavailable: "I pagamenti online non sono al momento disponibili. Riprova più tardi.",
      error: "Non siamo riusciti a completare il pagamento. Controlla i dati della carta e riprova.",
      continueToPayment: "Continua al pagamento sicuro",
    },
    quote: {
      title: "Il tuo preventivo",
      subtitle: "Si aggiorna mentre componi la prenotazione.",
      empty: "Seleziona un servizio per vedere la stima.",
      total: "Totale stimato",
      guarantee:
        "Coperta dalla Garanzia Impeccabile. Cancellazione gratuita fino a 24h prima.",
    },
    confirmation: {
      title: "Prenotazione confermata!",
      body:
        "la tua pulizia è prenotata. Ti abbiamo inviato la conferma via email e ti contatteremo con la finestra di arrivo del tuo addetto.",
      reference: "Riferimento prenotazione",
      total: "totale",
      home: "Torna alla home",
      profile: "Vai al mio profilo",
      more: "Esplora altri servizi",
    },
  },

  // ----- Admin panel -----
  admin: {
    manage: "Gestione",
    backToSite: "Torna al sito",
    login: {
      badge: "Area riservata",
      title: "Console Admin",
      subtitle: "Accedi con il tuo account amministratore per continuare.",
      email: "Email",
      emailPlaceholder: "tu@casaclean.com",
      password: "Password",
      passwordPlaceholder: "••••••••",
      submit: "Accedi come admin",
      notAdmin: "Questo account non ha accesso amministratore.",
      backToSite: "Torna al sito",
    },
    topbar: {
      console: "Console admin",
      administrator: "Amministratore",
      signOut: "Esci",
      openNav: "Apri navigazione",
      adminFallback: "Admin",
      viewLive: "Vedi il sito online",
    },
    table: {
      actions: "Azioni",
      search: "Cerca…",
      noMatches: "Nessun risultato",
      tryDifferent: "Prova un altro termine di ricerca.",
      result: "risultato",
      results: "risultati",
      empty: "Ancora niente qui",
    },
    action: {
      edit: "Modifica",
      view: "Visualizza",
      delete: "Elimina",
    },
    form: {
      cancel: "Annulla",
      create: "Crea",
      saveChanges: "Salva modifiche",
      noOptions: "Nessuna opzione disponibile.",
      selectOption: "Seleziona un'opzione…",
      required: "Il campo «{label}» è obbligatorio",
      translationsFallback: "Le traduzioni mancanti usano l'inglese.",
      deleteConfirm: "Eliminare «{name}»? L'azione è irreversibile.",
      imageUpload: "Carica immagine",
      imageReplace: "Sostituisci",
      imageRemove: "Rimuovi immagine",
      imageProcessing: "Elaborazione…",
      listAdd: "Aggiungi voce",
      listRemove: "Rimuovi",
    },
    confirm: {
      title: "Sei sicuro?",
      confirm: "Conferma",
      cancel: "Annulla",
      body: "Questa azione è irreversibile.",
    },
    status: {
      pending: "In attesa",
      confirmed: "Confermata",
      in_progress: "In corso",
      completed: "Completata",
      cancelled: "Annullata",
    },
    payment: {
      paid: "Pagato",
      refunded: "Rimborsato",
      manual: "Manuale / contanti",
      unpaid: "Non pagato",
    },
    dashboard: {
      welcome: "Bentornato, {name}",
      subtitle: "Ecco cosa sta succedendo oggi in CasaClean.",
      bookings: "Prenotazioni",
      pendingHint: "{count} in attesa",
      revenue: "Ricavi",
      revenueHint: "Confermate + completate",
      services: "Servizi",
      servicesHint: "{count} attivi",
      cities: "Città",
      citiesHint: "{count} attive",
      pipeline: "Pipeline prenotazioni",
      pipelineSub: "Per stato attuale",
      recent: "Prenotazioni recenti",
    },
    bookings: {
      title: "Prenotazioni",
      description: "Monitora e gestisci ogni prenotazione, dalla richiesta al completamento.",
      add: "Aggiungi prenotazione",
      search: "Cerca prenotazioni…",
      emptyTitle: "Nessuna prenotazione",
      emptyDescription: "Le prenotazioni dal sito appariranno qui.",
      allStatuses: "Tutti gli stati",
      noAccount: "— Nessun account collegato —",
      addTitle: "Aggiungi prenotazione",
      editTitle: "Modifica prenotazione",
      deleteTitle: "Elimina prenotazione",
      detailsTitle: "Dettagli prenotazione",
      col: {
        customer: "Cliente",
        serviceCity: "Servizio / città",
        schedule: "Programmazione",
        total: "Totale",
        payment: "Pagamento",
        status: "Stato",
      },
      detail: {
        customer: "Cliente",
        email: "Email",
        phone: "Telefono",
        service: "Servizio",
        city: "Città",
        address: "Indirizzo",
        dateTime: "Data e ora",
        hoursCleaners: "Ore / addetti",
        propertySize: "Dimensione immobile",
        workers: "Addetti assegnati",
        notes: "Note",
      },
      field: {
        linkAccount: "Collega a un account (facoltativo)",
        customerName: "Nome cliente",
        email: "Email",
        phone: "Telefono",
        service: "Servizio",
        city: "Città",
        serviceId: "ID servizio",
        serviceIdHint: "Riferimento numerico del servizio (id di catalogo).",
        cityId: "ID città",
        date: "Data",
        time: "Ora",
        street: "Via",
        houseNo: "Civico",
        doorbell: "Nome sul citofono",
        hours: "Ore",
        cleaners: "Addetti",
        total: "Totale (€)",
        status: "Stato",
        workers: "Addetti assegnati",
        workersHint: "Personale di pulizia assegnato a questa prenotazione.",
        notes: "Note",
      },
    },
    services: {
      title: "Servizi",
      description: "Gestisci i servizi di pulizia, i prezzi e le traduzioni mostrati sul sito.",
      add: "Aggiungi servizio",
      search: "Cerca servizi…",
      emptyTitle: "Nessun servizio",
      emptyDescription: "Aggiungi il tuo primo servizio per iniziare.",
      addTitle: "Aggiungi servizio",
      editTitle: "Modifica servizio",
      deleteTitle: "Elimina servizio",
      popular: "Popolare",
      allCitiesBadge: "Tutte le città",
      col: {
        service: "Servizio",
        pricePerHr: "Prezzo / ora",
        cities: "Città",
        popular: "Popolare",
        status: "Stato",
      },
      field: {
        name: "Nome (inglese)",
        image: "Immagine del servizio",
        imageHint: "Mostrata sulla scheda del servizio. Ideale una foto panoramica (16:10).",
        subtitle: "Sottotitolo",
        subtitleHint: "Un breve slogan mostrato sotto il nome.",
        subtitlePlaceholder: "es. La tua pulizia di routine, senza pensieri",
        includes: "Cosa è incluso",
        includesHint: "Punti elenco che descrivono cosa copre questo servizio.",
        includesPlaceholder: "es. Sanificazione completa di cucina e bagno",
        includesAdd: "Aggiungi voce",
        pricePerHour: "Prezzo orario (€)",
        description: "Descrizione (inglese)",
        nameIt: "Nome (italiano)",
        nameKa: "Nome (georgiano)",
        descriptionIt: "Descrizione (italiano)",
        descriptionKa: "Descrizione (georgiano)",
        allCities: "Disponibile in tutte le città",
        allCitiesHint: "Se attivo, il servizio è offerto ovunque e l'elenco delle città qui sotto viene ignorato.",
        cities: "Disponibile nelle città",
        citiesHint: "Seleziona le città in cui è offerto questo servizio.",
        allSpecialRequests: "Abilita tutte le richieste speciali",
        allSpecialRequestsHint: "Se attivo, ogni richiesta speciale è disponibile per questo servizio e l'elenco qui sotto viene ignorato.",
        specialRequests: "Richieste speciali abilitate per questo servizio",
        specialRequestsHint: "Seleziona quali extra i clienti possono aggiungere prenotando questo servizio.",
        popular: "Segna come popolare",
        enabled: "Attivo (visibile sul sito)",
      },
    },
    specialRequests: {
      title: "Richieste speciali",
      description: "Gestisci gli extra che i clienti possono aggiungere a una prenotazione.",
      add: "Aggiungi richiesta speciale",
      search: "Cerca richieste speciali…",
      emptyTitle: "Nessuna richiesta speciale",
      emptyDescription: "Aggiungi il tuo primo extra così i clienti potranno selezionarlo al checkout.",
      addTitle: "Aggiungi richiesta speciale",
      editTitle: "Modifica richiesta speciale",
      deleteTitle: "Elimina richiesta speciale",
      col: {
        name: "Extra",
        price: "Prezzo",
        status: "Stato",
      },
      field: {
        name: "Nome",
        price: "Sovrapprezzo (€)",
        description: "Descrizione",
        enabled: "Disponibile per prenotazioni",
      },
    },
    cities: {
      title: "Città",
      description: "Controlla dove opera CasaClean e gli orari in cui si accettano prenotazioni.",
      add: "Aggiungi città",
      search: "Cerca città…",
      emptyTitle: "Nessuna città",
      emptyDescription: "Aggiungi una città per aprirla alle prenotazioni.",
      addTitle: "Aggiungi città",
      editTitle: "Modifica città",
      deleteTitle: "Elimina città",
      col: {
        city: "Città",
        workingDays: "Giorni lavorativi",
        hours: "Orari",
        status: "Stato",
      },
      field: {
        name: "Nome (inglese)",
        nameIt: "Nome (italiano)",
        nameKa: "Nome (georgiano)",
        workingDays: "Giorni lavorativi",
        workingDaysHint: "Separati da virgola, 1 = lunedì … 7 = domenica",
        opensAt: "Apre alle",
        closesAt: "Chiude alle",
        enabled: "Disponibile per prenotazioni",
      },
      days: { 1: "Lun", 2: "Mar", 3: "Mer", 4: "Gio", 5: "Ven", 6: "Sab", 7: "Dom" },
    },
    users: {
      title: "Utenti",
      description: "Gestisci account, ruoli e stato di verifica.",
      add: "Aggiungi utente",
      search: "Cerca utenti…",
      emptyTitle: "Nessun utente",
      emptyDescription: "Aggiungi un account utente per gestirlo qui.",
      addTitle: "Aggiungi utente",
      editTitle: "Modifica utente",
      deleteTitle: "Elimina utente",
      role: { user: "Utente", admin: "Amministratore" },
      col: {
        user: "Utente",
        phone: "Telefono",
        role: "Ruolo",
        verified: "Verificato",
        joined: "Iscritto il",
      },
      field: {
        fullname: "Nome completo",
        email: "Email",
        phone: "Telefono",
        role: "Ruolo",
        verified: "Email verificata",
      },
    },
    workers: {
      title: "Addetti",
      description: "Gestisci il personale di pulizia da assegnare alle prenotazioni.",
      add: "Aggiungi addetto",
      search: "Cerca addetti…",
      emptyTitle: "Nessun addetto",
      emptyDescription: "Aggiungi un addetto per poterlo assegnare alle prenotazioni.",
      addTitle: "Aggiungi addetto",
      editTitle: "Modifica addetto",
      deleteTitle: "Elimina addetto",
      col: {
        worker: "Addetto",
        contact: "Contatto",
        status: "Stato",
      },
      field: {
        fullname: "Nome completo",
        email: "Email (facoltativa)",
        phone: "Telefono (facoltativo)",
        enabled: "Disponibile per assegnazione",
      },
    },
    quality: {
      title: "Qualità e recensioni",
      description:
        "Punteggi e commenti dei clienti. Le recensioni possono essere lasciate solo dai clienti dopo una prenotazione completata.",
      search: "Cerca recensioni…",
      emptyTitle: "Nessuna recensione",
      emptyDescription:
        "Le recensioni appaiono qui quando i clienti valutano le prenotazioni completate.",
      deleteTitle: "Elimina recensione",
      deleteConfirm: "Eliminare questa recensione di {name}? L'azione è irreversibile.",
      distribution: "Distribuzione delle valutazioni",
      distributionSub: "Come si distribuiscono i punteggi",
      stat: {
        avg: "Valutazione media",
        avgHint: "Su {count} recensioni",
        total: "Recensioni totali",
        totalHint: "Da sempre",
        positive: "Positive (4–5★)",
        positiveHint: "{count} su {total}",
      },
      col: {
        customer: "Cliente",
        service: "Servizio",
        booking: "Prenotazione",
        rating: "Valutazione",
        comment: "Commento",
        date: "Data",
      },
      detail: {
        title: "Dettaglio recensione",
        booking: "Prenotazione valutata",
        date: "Data e ora",
        location: "Luogo",
        property: "Dimensione immobile",
        duration: "Durata",
        durationValue: "{hours} h · {cleaners} addetto/i",
        total: "Totale",
      },
    },
    nav: {
      dashboard: "Dashboard",
      bookings: "Prenotazioni",
      calendar: "Calendario",
      services: "Servizi",
      specialRequests: "Richieste speciali",
      cities: "Città",
      coverage: "Mappa prenotazioni",
      workers: "Addetti",
      quality: "Qualità",
      users: "Utenti",
    },
    calendar: {
      title: "Calendario",
      description:
        "Ogni prenotazione collocata alla sua data programmata. Clicca una voce per aprire i dettagli della prenotazione.",
      today: "Oggi",
      prevMonth: "Mese precedente",
      nextMonth: "Mese successivo",
      monthCount: "{count} prenotazione/i questo mese",
      more: "+{count} altre",
      dayCount: "{count} prenotazione/i",
    },
    coverage: {
      title: "Mappa prenotazioni",
      description:
        "Ogni prenotazione segnata al suo indirizzo esatto. Clicca un segnaposto per aprire la scheda della prenotazione.",
      statBookings: "Prenotazioni sulla mappa",
      statCities: "Città",
      statRevenue: "Valore prenotato",
      listTitle: "Posizioni delle prenotazioni",
      empty:
        "Ancora nessuna prenotazione. Le nuove prenotazioni appaiono qui al loro indirizzo esatto.",
      locating: "Localizzazione degli indirizzi…",
      approx: "posizione approssimativa",
      noKeyTitle: "La mappa richiede una chiave API Google Maps",
      noKeyBody:
        "Imposta VITE_GOOGLE_MAPS_API_KEY nell'ambiente del client per abilitare la mappa interattiva. Il riepilogo delle città qui sotto funziona comunque.",
      errorTitle: "Caricamento mappa non riuscito",
      errorBody:
        "Impossibile caricare lo script di Google Maps. Controlla la chiave API e la connessione, poi aggiorna.",
    },
  },
};
