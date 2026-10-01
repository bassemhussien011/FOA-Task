# FOATask

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.1.3.

# Mise Kitchen Orders

A responsive kitchen order board built with Angular 21 standalone components and a local `json-server` API.

## Run locally

Requirements: Node.js 20.19+ and npm.

```bash
npm install
npm run api
```

In a second terminal:

```bash
npm start
```

Open `http://localhost:4200/orders`. The API is available at `http://localhost:3000`.

## Features

- Four status columns with live elapsed timers, late-order highlighting, order subtotals, and optimistic status changes with rollback.
- Search by order or table, plus type filters persisted in query parameters. Search is debounced.
- Lazy-loaded order detail and new-order routes, menu lookup, and service/VAT breakdown.
- Reactive order form with dynamic lines, quantity/table/mobile validation, a live tax-inclusive total, and guarded submission.
- Board refreshes every 15 seconds without overlapping requests or clearing existing cards; polling and timer subscriptions stop with the board.
- Responsive layout, keyboard-visible focus, and loading, empty, and error states.

## Decisions

- Signals hold component state and derived form totals; RxJS handles HTTP, debounce, and polling. `exhaustMap` prevents overlapping board refreshes, while `takeUntilDestroyed` owns subscriptions.
- API calls live in `OrdersApi`; price math and shared domain types live in `core`.
- Search and type are client-side filters over the board response, then mirrored into URL query parameters for shareable views.
- Order totals use menu prices, 12% service for dine-in only, and 14% VAT on subtotal plus service. The new-order total includes the same applicable taxes.
- `json-server` supplies IDs for newly posted orders. The next order number is determined from the existing orders immediately before submission.
- No Arabic/English toggle, visibility-based polling pause, deployment, or end-to-end test was added; those were optional or outside the local mock API scope.

## Checks

```bash
npm test
npm run build
```

## API seed data

The root `db.json` contains the supplied menu and seed orders. Start it with `npm run api` or directly with:

```bash
npx json-server@1.0.0-beta.3 db.json --port 3000
```

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
