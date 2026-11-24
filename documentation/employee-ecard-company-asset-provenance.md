# Employee e-card company asset provenance

The static assets in `public/brand/employee-ecard/` were supplied in the approved TKT-0004 design bundle at `/root/.hermes/cache/scratch/tkt0004-design/` and are served locally by the application. No live social-media CDN asset or employee-specific card URL is embedded in the image content.

## Operations photography

- `web-slide-1.webp`, `web-slide-2.webp`, `web-slide-3.webp`
- Source attribution: [Chitra Paratama company profile on MahaDasha](https://www.mahadasha.co.id/pt-chitra-paratama)
- UI attribution links to the source profile.

## Manufacturer example imagery

- `product-0.webp` — Michelin Earthmover Tires, XDR3. [Manufacturer reference](https://business.michelinman.com/tires/michelin-xdr3)
- `product-1.webp` — Jantsa industrial wheels. [Manufacturer reference](https://jantsa.com/industrial)
- `product-2.webp` — IMT TireHand®. [Manufacturer reference](https://imt.com/product/tire-manipulator/tirehand/)
- `product-3.webp` — Haltec tire tools and accessories. [Manufacturer reference](https://www.haltec.com/pc/Mining-Solutions-d8.htm)

These illustrate manufacturer product families only; the UI explicitly states that examples are not stock or availability promises.

## Third-party preview

Instagram is not loaded until the visitor activates the preview. The embedded official post and the independent profile/post links use `referrerPolicy="no-referrer"`; the iframe also uses lazy loading. Links remain available if embedding is blocked.
