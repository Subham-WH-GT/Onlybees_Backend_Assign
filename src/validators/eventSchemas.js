
const { z } = require("zod");

const createEventSchema = z.object({
  name: z.string().min(1),
  sections: z
    .array(
      z.object({
        name: z.string().min(1),
        price: z.number().nonnegative(),
        capacity: z.number().int().nonnegative(),
      })
    )
    .min(1),
});

module.exports = { createEventSchema };
