import { defineCollection, z } from 'astro:content';

const spots = defineCollection({
  type: 'content',
  schema: z.object({
    city: z.string(),
    name: z.string(),
    lat: z.number(),
    lng: z.number(),
    date: z.coerce.date(),
    photos: z.array(z.string()).default([]),
    notes: z.string().optional()
  })
});

export const collections = { spots };
