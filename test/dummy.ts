import type { CollectionConfig } from "../src/registry/types.js";

const ALL_COUNTRIES = [
  { label: 'Afghanistan', value: 'afghanistan' }
];

export const destinationsCollection: CollectionConfig = {
  slug: 'destinations',
  fields: [
    { name: 'badge', type: 'select', options: [{ label: 'Popular', value: 'popular' }] },
    { name: 'country', type: 'select', options: ({ data }: any) => {
      return ALL_COUNTRIES;
    } },
  ],
};
