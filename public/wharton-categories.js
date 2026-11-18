export const whartonCategories = [
  { key:'water-bottles', name:'Water bottles', singular:'water bottle', match:/water bottle/i, subtitle:'Your everyday carry' },
  { key:'lip-balm', name:'Lip balm', singular:'lip balm', match:/lip balm/i, subtitle:'Your everyday lip care' },
  { key:'carry-on', name:'Carry-on luggage', singular:'carry-on', match:/carry[ -]?on/i, subtitle:'Your go-to travel companion' }
];

export function whartonChoices(experiments) {
  return whartonCategories.map(group=>({...group,experiment:experiments.find(e=>group.match.test(e.category))}));
}
