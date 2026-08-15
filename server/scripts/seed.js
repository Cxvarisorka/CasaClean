/*
 * Catalogue seed — cities, services and add-ons.
 * ---------------------------------------------------------------------------
 * Populates a fresh database with a realistic catalogue so the booking wizard,
 * the marketing pages and the local landing pages have something to render.
 *
 *   node scripts/seed.js            # create/refresh the catalogue (safe to re-run)
 *   node scripts/seed.js --reset    # delete the catalogue first, then seed
 *   node scripts/seed.js --force    # allow running against a production NODE_ENV
 *
 * IDEMPOTENT BY DESIGN. Records are matched by `name` and upserted, so re-running
 * updates the seeded rows and never duplicates them. Anything an admin has
 * created by hand is left alone entirely.
 *
 * WHAT IT DOES NOT TOUCH: users, bookings, subscriptions, invoices, reviews and
 * contact messages. Seeding is for the catalogue; the rest is real business data.
 * `--reset` therefore only clears the three catalogue collections — and it still
 * refuses to run if any booking references them, because deleting a service that
 * a paid booking points at would leave that booking unreadable.
 *
 * CITY NAMES ARE LOAD-BEARING. They must match the entries in
 * `client/src/data/cityContent.js` (and `cityGeo.js`) exactly, or the
 * `/cleaning/:city` landing pages will not resolve and will be dropped from the
 * sitemap. The English name is the key that joins the two.
 */

const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

const connectDB = require("../config/db.config");
const City = require("../models/city.model");
const Service = require("../models/service.model");
const SpecialRequest = require("../models/specialRequest.model");
const Booking = require("../models/booking.model");
const { isProduction } = require("../utils/env.util");

const RESET = process.argv.includes("--reset");
const FORCE = process.argv.includes("--force");

/*
 * The twelve cities CasaClean serves. `name` is the default-locale (English)
 * value and the join key; `translations` carries the per-language overrides,
 * which is what makes the Italian site say "Roma" rather than "Rome".
 *
 * Working hours are per city and are enforced by the server on every booking
 * (assertBookingWindow), so these are real operating constraints, not decoration.
 */
const CITIES = [
    {
        name: "Rome",
        workingHourStarts: "08:00",
        workingHourEnds: "20:00",
        translations: { it: { name: "Roma" }, ka: { name: "რომი" }, ru: { name: "Рим" }, el: { name: "Ρώμη" } }
    },
    {
        name: "Milan",
        workingHourStarts: "08:00",
        workingHourEnds: "20:00",
        translations: { it: { name: "Milano" }, ka: { name: "მილანი" }, ru: { name: "Милан" }, el: { name: "Μιλάνο" } }
    },
    {
        name: "Florence",
        workingHourStarts: "08:30",
        workingHourEnds: "19:00",
        translations: { it: { name: "Firenze" }, ka: { name: "ფლორენცია" }, ru: { name: "Флоренция" }, el: { name: "Φλωρεντία" } }
    },
    {
        name: "Naples",
        workingHourStarts: "08:00",
        workingHourEnds: "19:30",
        translations: { it: { name: "Napoli" }, ka: { name: "ნეაპოლი" }, ru: { name: "Неаполь" }, el: { name: "Νάπολη" } }
    },
    {
        // Everything moves on foot and by boat, so the day starts and ends earlier.
        name: "Venice",
        workingHourStarts: "08:30",
        workingHourEnds: "18:30",
        translations: { it: { name: "Venezia" }, ka: { name: "ვენეცია" }, ru: { name: "Венеция" }, el: { name: "Βενετία" } }
    },
    {
        name: "Bologna",
        workingHourStarts: "08:30",
        workingHourEnds: "19:00",
        translations: { it: { name: "Bologna" }, ka: { name: "ბოლონია" }, ru: { name: "Болонья" }, el: { name: "Μπολόνια" } }
    },
    {
        name: "Turin",
        workingHourStarts: "08:00",
        workingHourEnds: "19:30",
        translations: { it: { name: "Torino" }, ka: { name: "ტურინი" }, ru: { name: "Турин" }, el: { name: "Τορίνο" } }
    },
    {
        name: "Verona",
        workingHourStarts: "08:30",
        workingHourEnds: "19:00",
        translations: { it: { name: "Verona" }, ka: { name: "ვერონა" }, ru: { name: "Верона" }, el: { name: "Βερόνα" } }
    },
    {
        name: "Genoa",
        workingHourStarts: "08:30",
        workingHourEnds: "19:00",
        translations: { it: { name: "Genova" }, ka: { name: "გენუა" }, ru: { name: "Генуя" }, el: { name: "Γένοβα" } }
    },
    {
        // Summer afternoons are unworkable, hence the early start.
        name: "Palermo",
        workingHourStarts: "07:30",
        workingHourEnds: "19:00",
        translations: { it: { name: "Palermo" }, ka: { name: "პალერმო" }, ru: { name: "Палермо" }, el: { name: "Παλέρμο" } }
    },
    {
        name: "Bari",
        workingHourStarts: "08:00",
        workingHourEnds: "19:00",
        translations: { it: { name: "Bari" }, ka: { name: "ბარი" }, ru: { name: "Бари" }, el: { name: "Μπάρι" } }
    },
    {
        name: "Catania",
        workingHourStarts: "07:30",
        workingHourEnds: "19:00",
        translations: { it: { name: "Catania" }, ka: { name: "კატანია" }, ru: { name: "Катания" }, el: { name: "Κατάνια" } }
    }
];

/*
 * Optional add-ons. Priced as a flat surcharge on the booking total.
 * `allSpecialRequests: true` on a service offers all of these.
 */
const SPECIAL_REQUESTS = [
    {
        name: "Inside Oven",
        description: "Degreasing and cleaning of the oven interior, racks and door glass.",
        price: 25,
        translations: {
            it: { name: "Interno forno", description: "Sgrassaggio e pulizia dell'interno del forno, delle griglie e del vetro." },
            ru: { name: "Внутри духовки", description: "Обезжиривание и чистка внутренней части духовки, решёток и стекла дверцы." }
        }
    },
    {
        name: "Inside Fridge",
        description: "Emptying, cleaning and sanitising the fridge interior, shelves and drawers.",
        price: 20,
        translations: {
            it: { name: "Interno frigorifero", description: "Svuotamento, pulizia e sanificazione dell'interno del frigorifero, dei ripiani e dei cassetti." },
            ru: { name: "Внутри холодильника", description: "Освобождение, чистка и дезинфекция холодильника, полок и ящиков." }
        }
    },
    {
        name: "Interior Windows",
        description: "Interior glass, frames and sills throughout the property.",
        price: 30,
        translations: {
            it: { name: "Vetri interni", description: "Vetri, telai e davanzali interni in tutta la proprietà." },
            ru: { name: "Окна изнутри", description: "Внутренние стёкла, рамы и подоконники по всей квартире." }
        }
    },
    {
        name: "Balcony & Terrace",
        description: "Sweeping, washing and tidying of balconies, terraces and outdoor railings.",
        price: 22,
        translations: {
            it: { name: "Balcone e terrazzo", description: "Spazzatura, lavaggio e riordino di balconi, terrazzi e ringhiere esterne." },
            ru: { name: "Балкон и терраса", description: "Подметание, мытьё и уборка балконов, террас и наружных перил." }
        }
    },
    {
        name: "Laundry & Ironing",
        description: "One machine load washed, dried and ironed during the visit.",
        price: 18,
        translations: {
            it: { name: "Lavaggio e stiratura", description: "Un carico di lavatrice lavato, asciugato e stirato durante l'intervento." },
            ru: { name: "Стирка и глажка", description: "Одна загрузка стирки, сушки и глажки во время визита." }
        }
    },
    {
        name: "Bed Linen Change",
        description: "Stripping and remaking every bed with fresh linen you provide.",
        price: 15,
        translations: {
            it: { name: "Cambio biancheria letto", description: "Rifacimento di tutti i letti con la biancheria pulita che fornisci." },
            ru: { name: "Смена постельного белья", description: "Перестилание всех кроватей свежим бельём, которое вы предоставляете." }
        }
    }
];

/*
 * The six services. Mirrors `client/src/data/services.js`, which the marketing
 * pages used before the catalogue moved into the database.
 *
 * `image` is left empty on purpose: the client rotates through curated stock
 * photography when a service has none (see normalizeDbService in
 * useServices.js), so seeded rows look right without shipping binary assets, and
 * an admin can upload a real cover at any point.
 */
const SERVICES = [
    {
        name: "Regular Cleaning",
        subtitle: "Your routine clean, made effortless",
        description:
            "A thorough clean of your whole home — kitchen, bathrooms, bedrooms and living areas — as a one-time visit or on a schedule that suits you.",
        pricePerHour: 19.9,
        includes: [
            "Kitchen & bathroom sanitation",
            "Dusting, vacuuming & mopping",
            "Beds made & rooms reset",
            "Bins emptied & replaced"
        ],
        allCities: true,
        allSpecialRequests: true,
        recurringEnabled: true,
        recurringIntervalDays: [7, 14],
        translations: {
            it: {
                name: "Pulizie ordinarie",
                subtitle: "La tua pulizia di routine, senza pensieri",
                description:
                    "Una pulizia accurata di tutta la casa — cucina, bagni, camere e zona giorno — una tantum o con la frequenza che preferisci.",
                includes: [
                    "Sanificazione di cucina e bagni",
                    "Spolvero, aspirazione e lavaggio pavimenti",
                    "Letti rifatti e stanze riordinate",
                    "Cestini svuotati e sacchetti sostituiti"
                ]
            }
        }
    },
    {
        name: "Deep Cleaning",
        subtitle: "A top-to-bottom reset",
        description:
            "The clean you book when routine isn't enough: limescale, grease, skirting boards, inside appliances and the places a weekly visit never reaches.",
        pricePerHour: 24,
        includes: [
            "Limescale removal in bathrooms",
            "Degreasing of kitchen surfaces",
            "Skirting boards, doors & switches",
            "Behind and under movable furniture"
        ],
        allCities: true,
        allSpecialRequests: true,
        recurringEnabled: false,
        translations: {
            it: {
                name: "Pulizie profonde",
                subtitle: "Un reset da cima a fondo",
                description:
                    "La pulizia da prenotare quando l'ordinaria non basta: calcare, grasso, battiscopa, interno elettrodomestici e tutti i punti che una visita settimanale non raggiunge.",
                includes: [
                    "Rimozione del calcare nei bagni",
                    "Sgrassaggio delle superfici della cucina",
                    "Battiscopa, porte e interruttori",
                    "Dietro e sotto i mobili spostabili"
                ]
            }
        }
    },
    {
        name: "Move-In / Move-Out Cleaning",
        subtitle: "Hand the keys over with confidence",
        description:
            "An empty-property deep clean to the standard a landlord, agency or incoming tenant expects — including inside every cupboard and appliance.",
        pricePerHour: 24,
        includes: [
            "Inside all cupboards and wardrobes",
            "Appliances cleaned inside and out",
            "Full bathroom and kitchen descale",
            "Floors, windows and frames throughout"
        ],
        allCities: true,
        allSpecialRequests: true,
        recurringEnabled: false,
        translations: {
            it: {
                name: "Pulizie fine locazione",
                subtitle: "Riconsegna le chiavi senza pensieri",
                description:
                    "Pulizia profonda a immobile vuoto, allo standard richiesto da proprietari, agenzie e nuovi inquilini — inclusi interni di mobili ed elettrodomestici.",
                includes: [
                    "Interno di tutti i mobili e armadi",
                    "Elettrodomestici puliti dentro e fuori",
                    "Decalcificazione completa di bagno e cucina",
                    "Pavimenti, vetri e infissi in tutta la casa"
                ]
            }
        }
    },
    {
        name: "Office & Commercial Cleaning",
        subtitle: "Out of hours, out of the way",
        description:
            "Scheduled cleaning for offices, studios and showrooms, carried out before or after business hours so nothing interrupts the working day.",
        pricePerHour: 22,
        includes: [
            "Desks, meeting rooms & common areas",
            "Kitchens, bathrooms & restocking",
            "Waste and recycling handling",
            "Early-morning or evening slots"
        ],
        allCities: true,
        allSpecialRequests: false,
        recurringEnabled: true,
        recurringIntervalDays: [1, 7, 14],
        translations: {
            it: {
                name: "Pulizie uffici e spazi commerciali",
                subtitle: "Fuori orario, senza interruzioni",
                description:
                    "Pulizie programmate per uffici, studi e showroom, svolte prima o dopo l'orario di lavoro per non interrompere mai la giornata.",
                includes: [
                    "Scrivanie, sale riunioni e aree comuni",
                    "Cucine, bagni e rifornimento materiali",
                    "Gestione di rifiuti e raccolta differenziata",
                    "Fasce orarie mattutine o serali"
                ]
            }
        }
    },
    {
        name: "Holiday Home, Airbnb & Hotel Cleaning",
        subtitle: "Guest-ready between every stay",
        description:
            "Turnover cleaning built around check-out and check-in times, with linen changes, restocking and a final inspection before the next guest arrives.",
        pricePerHour: 22,
        includes: [
            "Full turnover between guests",
            "Bed linen and towel changes",
            "Consumables restocked",
            "Damage and inventory check"
        ],
        allCities: true,
        allSpecialRequests: true,
        recurringEnabled: true,
        recurringIntervalDays: [1, 2, 3, 7],
        translations: {
            it: {
                name: "Pulizie case vacanza, Airbnb e hotel",
                subtitle: "Pronta per gli ospiti, ogni volta",
                description:
                    "Pulizia di cambio ospite organizzata sugli orari di check-out e check-in, con cambio biancheria, rifornimento e controllo finale prima del prossimo arrivo.",
                includes: [
                    "Cambio completo tra un ospite e l'altro",
                    "Cambio di lenzuola e asciugamani",
                    "Rifornimento dei materiali di consumo",
                    "Controllo inventario e danni"
                ]
            }
        }
    },
    {
        name: "Emergency Cleaning",
        subtitle: "When it has to be today",
        description:
            "Same-day cleaning for the situations that can't wait — a last-minute viewing, an unexpected guest, or the morning after an event.",
        pricePerHour: 28,
        includes: [
            "Same-day availability",
            "Priority scheduling",
            "Full team where needed",
            "Post-event and after-party clean-up"
        ],
        // Rapid response needs depth of staffing, so this one is limited to the
        // cities with the largest teams — and it exercises the coverage rule,
        // which "all cities everywhere" would leave untested.
        cityNames: ["Rome", "Milan", "Naples", "Turin"],
        allSpecialRequests: true,
        recurringEnabled: false,
        translations: {
            it: {
                name: "Pulizie urgenti",
                subtitle: "Quando serve oggi",
                description:
                    "Pulizie in giornata per le situazioni che non possono aspettare: una visita dell'ultimo minuto, un ospite inatteso o la mattina dopo un evento.",
                includes: [
                    "Disponibilità in giornata",
                    "Programmazione prioritaria",
                    "Squadra completa dove serve",
                    "Pulizia post-evento"
                ]
            }
        }
    }
];

/** Upsert by name and report whether it was created or updated. */
const upsert = async (Model, filter, doc) => {
    const existing = await Model.findOne(filter);
    if (existing) {
        Object.assign(existing, doc);
        await existing.save();
        return { record: existing, created: false };
    }
    return { record: await Model.create(doc), created: true };
};

const seedCollection = async (label, Model, rows, toDoc) => {
    let created = 0;
    let updated = 0;
    const byName = new Map();

    for (const row of rows) {
        const doc = await toDoc(row);
        const result = await upsert(Model, { name: row.name }, doc);
        byName.set(row.name, result.record);
        result.created ? created++ : updated++;
    }

    console.log(`  ${label}: ${created} created, ${updated} updated`);
    return byName;
};

const reset = async () => {
    /*
     * Bookings snapshot some data but still REFERENCE the service and city they
     * were made for. Deleting those out from under a paid booking would leave it
     * unreadable in the admin panel and in the customer's history, so refuse
     * rather than corrupt — the same fail-closed posture the delete endpoints
     * take via assertNotReferenced.
     */
    const bookings = await Booking.countDocuments();
    if (bookings > 0) {
        throw new Error(
            `--reset refused: ${bookings} booking(s) reference the catalogue. ` +
            "Deleting services or cities they point at would corrupt them. " +
            "Seed without --reset (it upserts), or clear the bookings first if this is a scratch database."
        );
    }

    const [s, c, sr] = await Promise.all([
        Service.deleteMany({}),
        City.deleteMany({}),
        SpecialRequest.deleteMany({})
    ]);
    console.log(
        `  reset: removed ${s.deletedCount} service(s), ${c.deletedCount} city(ies), ${sr.deletedCount} add-on(s)`
    );
};

const run = async () => {
    // Seeding writes to whatever MONGO_URI points at. Against production that is
    // very hard to undo, so it takes an explicit --force.
    if (isProduction && !FORCE) {
        throw new Error(
            "Refusing to seed with a production NODE_ENV. " +
            "Check MONGO_URI points where you think it does, then re-run with --force."
        );
    }

    await connectDB();
    console.log(`Seeding catalogue${RESET ? " (--reset)" : ""}…`);

    if (RESET) await reset();

    // Cities first: services reference them by id.
    const cities = await seedCollection("cities", City, CITIES, (row) => ({
        name: row.name,
        workingHourStarts: row.workingHourStarts,
        workingHourEnds: row.workingHourEnds,
        translations: row.translations,
        enabled: true
    }));

    const addons = await seedCollection("add-ons", SpecialRequest, SPECIAL_REQUESTS, (row) => ({
        name: row.name,
        description: row.description,
        price: row.price,
        translations: row.translations,
        enabled: true
    }));

    await seedCollection("services", Service, SERVICES, (row) => {
        // A service is either offered everywhere, or in the named subset —
        // resolved to real ObjectIds, exactly as the controller would.
        const coverage = row.cityNames
            ? { allCities: false, cities: row.cityNames.map((name) => cities.get(name)._id) }
            : { allCities: true, cities: [] };

        return {
            name: row.name,
            subtitle: row.subtitle,
            description: row.description,
            image: "",
            includes: row.includes,
            translations: row.translations,
            pricePerHour: row.pricePerHour,
            ...coverage,
            allSpecialRequests: Boolean(row.allSpecialRequests),
            specialRequests: row.allSpecialRequests ? [] : [...addons.values()].slice(0, 3).map((a) => a._id),
            recurringEnabled: Boolean(row.recurringEnabled),
            recurringIntervalDays: row.recurringIntervalDays || [],
            enabled: true
        };
    });

    console.log(
        "\nDone. Next: sign up in the app, verify the email, then set that user's " +
        'role to "admin" in MongoDB to reach the admin panel.'
    );
};

run()
    .catch((err) => {
        console.error(`\nSeed failed: ${err.message}`);
        process.exitCode = 1;
    })
    .finally(() => mongoose.connection.close());
