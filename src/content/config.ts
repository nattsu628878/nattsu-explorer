import { defineCollection, z } from 'astro:content';

const spots = defineCollection({
  type: 'content',
  schema: z.object({
    lat: z.number(),
    lng: z.number(),
    date: z.coerce.date(),
    photo: z.string(),
    notes: z.string().optional()
  })
});

export const collections = { spots };
