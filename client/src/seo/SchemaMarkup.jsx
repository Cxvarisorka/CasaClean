import { Helmet } from "react-helmet-async";

/**
 * SchemaMarkup — injects one or more JSON-LD blocks into <head>.
 * Accepts a single schema object or an array. Rendering through Helmet keeps
 * structured data colocated with the page that owns it.
 *
 * @param {{ schema: object | object[] }} props
 */
export function SchemaMarkup({ schema }) {
  const blocks = Array.isArray(schema) ? schema : [schema];

  return (
    <Helmet>
      {blocks.filter(Boolean).map((block, index) => (
        <script key={index} type="application/ld+json">
          {JSON.stringify(block)}
        </script>
      ))}
    </Helmet>
  );
}

export default SchemaMarkup;
