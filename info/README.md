# 🦎 Chaos Creature Rescue — Care & Husbandry Library

## v3.0 — Complete Rebuild

A modern, responsive Progressive Web App providing research-backed care guides for reptiles and feeder colonies. Built for new keepers, adopters, and rescue partners.

---

## ✨ Features

- **7 comprehensive species guides** with accurate, research-backed husbandry data
- **Fully responsive** — mobile-first design (320px → 1400px+)
- **Dark / Light theme** — auto-detects system preference, persistent toggle
- **Real-time search** — filter species, guides, and feeders instantly
- **Offline-capable** — Service Worker caches all assets for offline access
- **Installable PWA** — add to home screen on any device
- **WCAG 2.1 AA accessible** — skip link, ARIA labels, keyboard nav, reduced motion
- **Print-friendly** — professional print layouts
- **Generated species imagery** — no placeholder images

## 📦 Files

```
Z:\info\
├── index.html          Main app (52 KB) — all 7 species with detailed care guides
├── styles.css          Design system (31 KB) — CSS variables, responsive, dark/light, print
├── script.js           Interactivity (17 KB) — theme, search, PWA, keyboard shortcuts
├── manifest.json       PWA config (3 KB) — icons, shortcuts
├── sw.js               Service Worker (9 KB) — cache-first strategy, offline fallbacks
├── images/             Generated species photography
│   ├── hero-bg.png
│   ├── leopard-gecko.png
│   ├── crested-gecko.png
│   ├── ball-python.png
│   ├── blood-python.png
│   ├── feeder-rats.png
│   ├── dubia-roaches.png
│   └── crickets.png
├── README.md           This file
└── index.html.backup   Original v1 file (preserved)
```

## 🐾 Species Covered

### Reptiles
| Species | Scientific Name | Temp | Humidity | Lifespan |
|---------|----------------|------|----------|----------|
| Leopard Gecko | *Eublepharis macularius* | 88–92°F | 30–40% | 15–20 yrs |
| Crested Gecko | *Correlophus ciliatus* | 72–78°F | 60–75% | 15–20 yrs |
| Ball Python | *Python regius* | 88–92°F | 60–70% | 20–30 yrs |
| Blood Python | *Python brongersmai* | 82–88°F | 60–75% | 20–25 yrs |

### Feeders
| Species | Scientific Name | Colony Temp | Protein |
|---------|----------------|-------------|---------|
| Dubia Roaches | *Blaptica dubia* | 85–95°F | ~22% |
| Crickets | *Acheta domesticus* | 75–85°F | ~20% |
| Feeder Rats | *Rattus norvegicus* | 65–79°F | ~58% |

## 🚀 Usage

1. Open `index.html` in any modern browser
2. For PWA features (install, offline), serve over HTTPS
3. Toggle dark/light theme with 🌙 button
4. Search species by name or care topic
5. Print with 🖨️ button or Ctrl+P

## 🎨 Customization

Edit CSS variables in `:root` of `styles.css`:
```css
--accent: #22c55e;     /* Change accent color */
--font-display: 'Outfit';  /* Change heading font */
--font-body: 'Inter';      /* Change body font */
```

---

**Built with ❤️ for Chaos Creature Rescue**
