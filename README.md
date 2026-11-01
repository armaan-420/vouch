# Vouch — The Wharton Sunscreen Edit

A browser-local clickable prototype: welcome → eight product cards → score-only leaderboard → name-only nomination → next-round confirmation.

Run `node server.mjs` to preview. Prototype info explains sample data and provides reset.

Votes and a single nomination persist in localStorage. Rankings include explicitly labeled sample votes, not collected Wharton student data. Scores are 10 × positive / (positive + negative), one decimal; skips do not count. No verdict counts or /10 suffix appear.

The four-distinct-person nomination threshold is demonstrated with three seeded sample nominations for Isntree Hyaluronic Acid Watery Sun Gel. A matching local nomination queues it for the next round. Other free-text submissions remain pending lookup. No real multi-user collection, identity verification, product lookup, or cross-browser deduplication is implemented. Those require a shared backend before student testing.

Photos downloaded from official brand Shopify catalogs October 30, 2026. Catalogs now label Beauty of Joseon Relief Sun Rice + Niacinamide and Round Lab UVLock SPF 50; cards match these actual assets instead of mislabeling new formulas as earlier versions. US SKIN1004 UV formula is identified explicitly.
