const { z } = require('zod');

// Resending an invoice takes no client-controlled fields: the recipient, the
// content and the numbering all come from the stored snapshot. Keeping this
// strict stops a body from smuggling an arbitrary "to" address and turning the
// endpoint into an open relay for a branded, attachment-carrying email.
const sendInvoiceSchema = z
  .object({})
  .strict({ message: 'This action does not accept a request body.' });

// Issuing accepts one optional flag: whether to email the newly created invoice
// straight away (default true). Useful for backfilling historical bookings
// without mailing every past customer.
const issueInvoiceSchema = z
  .object({
    send: z.boolean().optional()
  })
  .strict({ message: 'Unknown fields are not allowed!' });

module.exports = { sendInvoiceSchema, issueInvoiceSchema };
