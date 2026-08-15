import { describe, it, expect } from "vitest";
import en from "./en";
import itDoc from "./it";
import { getLegalDocument, resolveLegalLocale, LEGAL_LOCALES } from "./index";

/*
 * The legal documents are two parallel translations of the same operative text,
 * and the Italian one is the version that prevails. The failure mode that
 * matters is therefore DRIFT: someone adds a clause, a table row or a bullet to
 * one language and forgets the other, and the two documents quietly stop saying
 * the same thing. These tests make that a red build instead of a legal problem.
 *
 * They deliberately check structure, not wording — only a human can verify the
 * translation, but structure is exactly what a human reviewer skims past.
 */

const KINDS = ["privacy", "terms"];
const shape = (doc) => ({ en: en[doc], it: itDoc[doc] });

describe("legal documents", () => {
  it.each(KINDS)("%s is published in every declared locale", (kind) => {
    for (const locale of LEGAL_LOCALES) {
      const { document } = getLegalDocument(kind, locale);
      expect(document, `${kind} missing for ${locale}`).toBeTruthy();
      expect(document.id).toBe(kind);
      expect(document.intro.length).toBeGreaterThan(0);
      expect(document.sections.length).toBeGreaterThan(0);
    }
  });

  it.each(KINDS)("%s has the same sections, in the same order, in both languages", (kind) => {
    const { en: english, it: italian } = shape(kind);
    // Section ids are what deep links (/terms#pricing) resolve against, so they
    // must be identical across languages — a link has to survive a switch.
    expect(italian.sections.map((s) => s.id)).toEqual(english.sections.map((s) => s.id));
  });

  it.each(KINDS)("%s has matching content structure in both languages", (kind) => {
    const { en: english, it: italian } = shape(kind);

    english.sections.forEach((section, i) => {
      const counterpart = italian.sections[i];
      const where = `${kind} §${section.id}`;

      expect(
        counterpart.blocks.map((b) => b.type),
        `${where}: block types differ between languages`
      ).toEqual(section.blocks.map((b) => b.type));

      section.blocks.forEach((block, j) => {
        const other = counterpart.blocks[j];
        if (block.type === "ul") {
          expect(other.items, `${where}: bullet count differs`).toHaveLength(block.items.length);
        }
        if (block.type === "table") {
          expect(other.rows, `${where}: table row count differs`).toHaveLength(block.rows.length);
          expect(other.head, `${where}: table column count differs`).toHaveLength(
            block.head.length
          );
        }
      });
    });
  });

  it.each(KINDS)("%s carries no empty text in either language", (kind) => {
    for (const doc of Object.values(shape(kind))) {
      for (const section of doc.sections) {
        expect(section.heading.trim()).not.toBe("");
        for (const block of section.blocks) {
          if (block.type === "p") expect(block.text.trim()).not.toBe("");
          if (block.type === "ul") block.items.forEach((i) => expect(i.trim()).not.toBe(""));
          if (block.type === "table")
            block.rows.forEach((row) => row.forEach((c) => expect(c.trim()).not.toBe("")));
        }
      }
    }
  });

  it.each(KINDS)("%s states a parseable last-updated date", (kind) => {
    for (const doc of Object.values(shape(kind))) {
      expect(Number.isNaN(new Date(doc.updated).getTime())).toBe(false);
    }
  });
});

describe("resolveLegalLocale", () => {
  it("serves Italian to Italian readers", () => {
    expect(resolveLegalLocale("it")).toBe("it");
  });

  it("falls back to English for the locales the documents aren't published in", () => {
    for (const locale of ["ka", "el", "ru", "de", undefined]) {
      expect(resolveLegalLocale(locale)).toBe("en");
    }
  });

  it("flags the fallback so the page can disclose it", () => {
    expect(getLegalDocument("privacy", "ru").isFallback).toBe(true);
    expect(getLegalDocument("privacy", "en").isFallback).toBe(false);
    expect(getLegalDocument("privacy", "it").isFallback).toBe(false);
  });
});
