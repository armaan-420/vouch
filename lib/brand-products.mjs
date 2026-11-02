// A fixed lineup takes priority over community additions. Unknown brands stay distinct.
export const brandKey = brand => String(brand || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
export function oneProductPerBrand(products, existing = []) {
  const seen = new Set(existing.map(p => brandKey(p.brand)).filter(Boolean));
  return products.filter(product => {
    const key = brandKey(product.brand);
    if (!key) return true;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
