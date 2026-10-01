# Mise Kitchen Orders

Responsive kitchen order board built with Angular 21, standalone components, strict TypeScript, and `json-server`.

## Run

Requires Node.js 20.19+ and npm.

```bash
npm install
npm run api
```

In a second terminal:

```bash
npm start
```

Open `http://localhost:4200/orders`. The API runs at `http://localhost:3000`.

## GitHub Pages demo

The Pages build uses a browser-based mock API seeded from `db.json`; changes persist in that browser's local storage. Local development continues to use `json-server`.

Push to `main` or `master` to deploy with GitHub Actions. In the repository settings, enable **Pages → GitHub Actions**. The app will be available at `https://<owner>.github.io/<repository>/`.

## Features

- Four order-status columns, elapsed timers, late indicators, subtotals, and optimistic status updates with rollback.
- Debounced search and type filters synchronized with URL query parameters.
- Lazy-loaded order details and creation form.
- Reactive item form with quantity, table, and Egyptian mobile validation; live price total.
- Subtotal, dine-in service (12%), and VAT (14%) calculations.
- Non-overlapping 15-second polling that pauses when the browser tab is hidden.
- Arabic/English runtime translations through Transloco, with saved language choice and RTL/LTR layout.
- Responsive layout and loading, empty, and error states.

## Implementation notes

- Signals manage UI state; RxJS handles HTTP, debouncing, and polling.
- Order/menu API calls are in `OrdersApi`; shared models, pricing, and validators are in `src/app/core/`.
- Search and filtering run client-side. Order numbers use the highest existing number plus one; this is not atomic for concurrent users.
- Order data is stored in the root `db.json` by json-server.

## Checks and follow-up

`npm run build` succeeds, with CSS-size warnings for the board and order form. Automated test files are not included. Concurrent-safe order numbering is not implemented.

The mock API persists changes to `db.json`; restore the seed from version control when a clean dataset is needed.
