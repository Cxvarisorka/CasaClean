const { z } = require('zod');

const updateSubscriptionCardSchema = z
  .object({
    paymentMethodId: z.string().trim().min(1, { message: "paymentMethodId is required!" })
  })
  .strict({ message: 'Unknown fields are not allowed!' });

// Pause/resume/cancel actions intentionally take no client-controlled fields.
// Keeping this strict prevents a body from smuggling schedule/payment state.
const emptySubscriptionActionSchema = z
  .object({})
  .strict({ message: 'This action does not accept a request body.' });

module.exports = { updateSubscriptionCardSchema, emptySubscriptionActionSchema };
