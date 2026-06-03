import { MetaTags } from "./MetaTags";
import { SchemaMarkup } from "./SchemaMarkup";

/**
 * Seo — the page-level convenience wrapper combining meta tags and optional
 * JSON-LD structured data. One import per page handles the entire <head>.
 *
 * @param {object} props - all MetaTags props, plus:
 * @param {object|object[]} [props.schema] - JSON-LD schema(s) to inject
 */
export function Seo({ schema, ...meta }) {
  return (
    <>
      <MetaTags {...meta} />
      {schema && <SchemaMarkup schema={schema} />}
    </>
  );
}

export default Seo;
