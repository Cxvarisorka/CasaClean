import { LegalDocument } from "./LegalDocument";

/*
 * PrivacyPage
 * -----------
 * The privacy policy. All of the layout lives in LegalDocument; the content
 * lives in `data/legal`. This file exists so the route table can lazy-load one
 * chunk per document, exactly like every other page.
 */

const PrivacyPage = () => <LegalDocument kind="privacy" />;

export default PrivacyPage;
