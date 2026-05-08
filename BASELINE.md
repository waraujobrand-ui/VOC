# VOC Clean Rebuild Baseline

This is the clean VOC rebuild baseline for `/home/user/VOC`.

## Current Working App Status

- Fresh standalone VOC app created at `/home/user/VOC`.
- App type: React + Vite.
- Required files exist:
  - `package.json`
  - `index.html`
  - `src/main.jsx`
  - `src/App.jsx`
  - `src/styles.css`
- App behavior has not been modified as part of this baseline lock.
- WPG/POGrammer folders are out of scope.

## File Tree

```text
/home/user/VOC
├── .gitignore
├── BASELINE.md
├── index.html
├── package.json
├── package-lock.json
├── vite.config.js
└── src
    ├── App.jsx
    ├── main.jsx
    └── styles.css
```

## npm install Result

```text
added 62 packages, and audited 63 packages in 13s
7 packages are looking for funding
2 moderate severity vulnerabilities
```

Status: success.

## npm run build Result

```text
vite v5.4.21 building for production...
✓ 31 modules transformed.
dist/index.html                   0.39 kB │ gzip:  0.26 kB
dist/assets/index-onASCZul.css    0.84 kB │ gzip:  0.49 kB
dist/assets/index-DyaBCouA.js   143.09 kB │ gzip: 46.00 kB
✓ built in 808ms
```

Status: success.
