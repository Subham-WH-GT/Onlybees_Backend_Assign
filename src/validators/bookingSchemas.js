

const { z } = require("zod");

const createBookingSchema = z.object({
  eventId: z.string().min(1),
  sectionId: z.string().min(1),
  qty: z.number().int().positive(),
});

module.exports = { createBookingSchema };
