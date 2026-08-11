import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { I18nProvider } from "@/i18n";
import { LegalDocument } from "./LegalDocument";
import en from "@/data/legal/en";
import itDoc from "@/data/legal/it";

/*
 * The legal pages have no interactivity to test — what can actually break is
 * the wiring: the wrong language served, the fallback notice missing (or shown
 * to someone who doesn't need it), or a table of contents that stops matching
 * the headings it links to.
 */

const renderIn = (locale, kind) => {
  window.localStorage.setItem("casaclean:locale", locale);
  return render(
    <HelmetProvider>
      <I18nProvider>
        <LegalDocument kind={kind} />
      </I18nProvider>
    </HelmetProvider>
  );
};

beforeEach(() => {
  window.localStorage.clear();
});

describe("LegalDocument", () => {
  it("renders the English document for an English reader, with no fallback notice", () => {
    renderIn("en", "privacy");

    expect(
      screen.getByRole("heading", { level: 1, name: en.privacy.title })
    ).toBeInTheDocument();
    expect(screen.queryByRole("note")).not.toBeInTheDocument();
  });

  it("renders the Italian document for an Italian reader", () => {
    renderIn("it", "terms");

    expect(
      screen.getByRole("heading", { level: 1, name: itDoc.terms.title })
    ).toBeInTheDocument();
    expect(screen.queryByRole("note")).not.toBeInTheDocument();
  });

  it("serves English to a locale the documents aren't published in, and says so", () => {
    renderIn("ru", "terms");

    expect(
      screen.getByRole("heading", { level: 1, name: en.terms.title })
    ).toBeInTheDocument();
    expect(screen.getByRole("note")).toHaveTextContent(/English and Italian only/i);
  });

  // Regression: the sections were once wrapped in a single `whileInView`
  // stagger container. The shared viewport config needs 25% of the animated
  // element on screen, which a document this tall never reaches, so every
  // section but the intro sat at opacity 0 — the page looked truncated.
  //
  // The assertion is on the section's OWN inline style: a hidden motion variant
  // writes `opacity: 0` there, which is what made the text unreadable. (The
  // page-level entrance animation puts a transient opacity on an ancestor, so
  // `toBeVisible()` — which walks ancestors — can't tell the two apart.)
  it.each(["privacy", "terms"])("renders every %s section unconditionally, not behind a scroll reveal", (kind) => {
    const { container } = renderIn("en", kind);

    for (const section of en[kind].sections) {
      const el = container.querySelector(`#${section.id}`);
      expect(el, `section #${section.id} is missing`).not.toBeNull();
      expect(el.style.opacity, `section #${section.id} renders but is hidden`).not.toBe("0");
      expect(el.querySelector("h2")).toHaveTextContent(section.heading);
    }
  });

  it("derives a table of contents that links to every section", () => {
    renderIn("en", "terms");

    const toc = screen.getByRole("navigation", { name: /contents/i });
    const links = within(toc).getAllByRole("link");

    expect(links).toHaveLength(en.terms.sections.length);
    links.forEach((link, i) => {
      expect(link).toHaveAttribute("href", `#${en.terms.sections[i].id}`);
      expect(link).toHaveTextContent(en.terms.sections[i].heading);
    });
  });
});
