# HERO UI/UX Audit and Redesign Plan

## Audit Summary

HERO sudah punya arah visual yang kuat di `Design.md`, tetapi implementasi sebelumnya masih bercampur antara command-center system dan pola template admin umum. Masalah paling terlihat:

- Radius terlalu besar pada banyak card, tab, modal, dan panel sehingga terasa consumer SaaS, bukan industrial command center.
- Banyak class `tracking-*`, `tracking-tight`, dan arbitrary negative tracking yang membuat tipografi kurang stabil lintas viewport.
- Beberapa halaman masih memakai header polos, border solid, dan kartu generik sehingga tidak mengikuti layer hierarchy `surface -> surface_container_low -> surface_container_lowest`.
- Elemen navigasi dan kontrol belum semuanya punya target sentuh minimum yang konsisten.
- Halaman settings dan security belum punya framing operasional seperti halaman dashboard lain.

## Design Direction

Rombakan mengikuti `Design.md` dengan interpretasi profesional:

- Tactical Command Center sebagai gaya utama.
- Tonal layering sebagai pemisah visual, bukan garis keras.
- Primary gradient hanya untuk command surface dan aksi utama.
- Tertiary/orange dipakai sebagai energi operasional agar palette tidak terasa satu nada.
- Typography memakai Manrope untuk judul dan KPI, Inter untuk body, Geist Mono untuk data teknis.
- Radius komponen utama distabilkan di 8px agar lebih tegas dan enterprise.

## Implemented Pass

- Global token radius, focus state, reduced-motion, layer utility, dan normalizer legacy class.
- Shared primitives: Button, Card, Badge, Alert, Dialog, Table, Tabs, Select, Textarea.
- Command surfaces: AdminPageShell, SiteHeader, AuthShell, Sidebar.
- Operational pages: Security layout, Security Overview, Audit Logs, Settings layout, Email Log, Navbar Setting.

## Next Pass

- Convert remaining module-specific cards in Activity Hub, Approval, Timesheet, HC, HSE, and Points to the same `surface-module-card` rhythm.
- Replace remaining hardcoded `slate`, `bg-white`, and arbitrary border colors with semantic tokens.
- Review table-heavy pages for row spacing, empty states, and keyboard focus order.
- Verify responsive states at 375px, 768px, 1024px, and desktop wide.
