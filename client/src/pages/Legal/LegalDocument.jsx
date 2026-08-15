import { Info } from "lucide-react";
import { Page } from "@/components/shared/Page";
import { Container } from "@/components/ui/Container";
import { PageHero } from "@/components/sections";
import { Seo } from "@/seo";
import { PAGE_META } from "@/constants/metadata";
import { getLegalDocument } from "@/data/legal";
import { LANGUAGES, useTranslation } from "@/i18n";

/*
 * LegalDocument
 * -------------
 * One renderer for every legal page. The documents themselves are data
 * (`data/legal/{en,it}.js`), so Privacy and Terms are the same component with a
 * different `kind` — and a new document (cookie policy, DPA) is a data change.
 *
 * Two things it does that an ordinary marketing page doesn't:
 *   • the table of contents is DERIVED from the document's sections, so it can
 *     never fall out of step with the headings it links to;
 *   • when the reader's language isn't one the documents are published in, it
 *     says so explicitly instead of silently serving English (see data/legal).
 *
 * Section ids are shared across languages, so a deep link like /terms#pricing
 * survives a language switch.
 */

/** Render one content block. The block vocabulary is deliberately small. */
function Block({ block }) {
  if (block.type === "ul") {
    return (
      <ul className="mt-4 space-y-2.5">
        {block.items.map((item) => (
          <li key={item} className="flex gap-3 text-body-md text-ink-600">
            <span
              aria-hidden="true"
              className="mt-2.5 size-1.5 shrink-0 rounded-full bg-brand-500"
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    );
  }

  if (block.type === "table") {
    const hasHead = block.head.some(Boolean);
    return (
      // Legal tables are two or three dense columns; on a phone they scroll
      // horizontally inside their own frame rather than squeezing the page.
      <div className="mt-5 overflow-x-auto rounded-2xl border border-ink-100">
        <table className="w-full min-w-lg border-collapse text-left">
          {hasHead && (
            <thead className="bg-sand-50">
              <tr>
                {block.head.map((cell, i) => (
                  <th
                    key={i}
                    scope="col"
                    className="px-5 py-3 text-caption font-semibold uppercase tracking-wider text-ink-500"
                  >
                    {cell}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {block.rows.map((row, i) => (
              <tr key={i} className="border-t border-ink-100 align-top">
                {row.map((cell, j) => (
                  <td
                    key={j}
                    className={
                      j === 0
                        ? "px-5 py-4 text-body-sm font-semibold text-ink-900"
                        : "px-5 py-4 text-body-sm text-ink-600"
                    }
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return <p className="mt-4 text-body-md text-ink-600">{block.text}</p>;
}

export function LegalDocument({ kind }) {
  const { t, locale } = useTranslation();
  // `doc`, not `document` — shadowing the global inside a component is a trap.
  const { document: doc, documentLocale, isFallback } = getLegalDocument(kind, locale);

  const documentLanguage =
    LANGUAGES.find((l) => l.code === documentLocale)?.native || documentLocale;

  // Dates are part of the document's meaning, so they follow the document's
  // language rather than the interface's.
  const updated = new Intl.DateTimeFormat(documentLocale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(doc.updated));

  return (
    <Page>
      <Seo {...PAGE_META[kind]} />

      <PageHero
        eyebrow={t("pages.legal.eyebrow")}
        title={doc.title}
        subtitle={t("pages.legal.updated", { date: updated })}
      />

      <section className="pb-20 lg:pb-28">
        <Container size="lg">
          <div className="grid gap-12 lg:grid-cols-[16rem_1fr] lg:gap-16">
            {/* Table of contents — sticky beside the text on desktop. */}
            <nav
              aria-label={t("pages.legal.contents")}
              className="lg:sticky lg:top-28 lg:self-start"
            >
              <h2 className="text-caption font-semibold uppercase tracking-wider text-ink-500">
                {t("pages.legal.contents")}
              </h2>
              <ul className="mt-4 space-y-2 border-l border-ink-100 ps-4">
                {doc.sections.map((section) => (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      className="block text-body-sm text-ink-500 transition-colors hover:text-brand-600"
                    >
                      {section.heading}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            <div>
              {/* The document isn't published in this reader's language. Say so. */}
              {isFallback && (
                <div
                  role="note"
                  className="mb-10 flex gap-3 rounded-2xl border border-ink-100 bg-sand-50 p-5"
                >
                  <Info className="mt-0.5 size-5 shrink-0 text-brand-600" aria-hidden="true" />
                  <p className="text-body-sm text-ink-600">
                    {t("pages.legal.fallbackNotice", { language: documentLanguage })}
                  </p>
                </div>
              )}

              {doc.intro.map((paragraph) => (
                <p key={paragraph} className="mt-4 text-body-lg text-ink-600 first:mt-0">
                  {paragraph}
                </p>
              ))}

              {/*
               * No scroll-reveal here, deliberately. The site's `whileInView`
               * pattern needs 25% of the animated element on screen, which a
               * document this tall can never reach — the sections would sit at
               * opacity 0 forever. Beyond that bug, legal text has to be
               * readable unconditionally: findable with Ctrl+F, printable, and
               * present for a screen reader without waiting on the viewport.
               */}
              <div className="mt-12 space-y-12">
                {doc.sections.map((section) => (
                  <section
                    key={section.id}
                    id={section.id}
                    // Offset the anchor so a linked heading clears the fixed navbar.
                    className="scroll-mt-28"
                  >
                    <h2 className="text-heading-sm text-ink-900">{section.heading}</h2>
                    {section.blocks.map((block, i) => (
                      <Block key={i} block={block} />
                    ))}
                  </section>
                ))}
              </div>
            </div>
          </div>
        </Container>
      </section>
    </Page>
  );
}

export default LegalDocument;
