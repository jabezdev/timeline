# Timeline Monorepo - Local-First Architecture

We've converted the Timeline project into a Monorepo containing:
- `apps/web`: The Vite React application bundled with [Tauri](https://tauri.app/) for native Linux Desktop support.
- `packages/*`: Space for future shared libraries.

## 1. Running the Local Backend (Convex)
You run the backend from the web workspace just like before:
```bash
bun convex:dev
```
Or manually: `cd apps/web && bun convex dev`

## 2. Running on the Web
```bash
bun dev
```

## 3. Running as a Native Linux Desktop App (Tauri)
To launch the Tauri wrapper (which renders the Vite app locally in a native window):
```bash
cd apps/web
bunx tauri dev
```

To build a standalone `.deb` or `AppImage` for your Linux machine:
```bash
cd apps/web
bunx tauri build
```
The compiled binaries will be located in `apps/web/src-tauri/target/release/bundle/`.

## 4. Replicache Implementation
We have scaffolded Replicache to intercept standard HTTP sync requests and redirect them securely through the active Convex websocket connection.

To complete the data migration for offline persistence:
1. Obtain a license key from Replicache and add it to `ReplicacheProvider.tsx`.
2. Define your application Mutators inside `ReplicacheProvider.tsx`'s `mutators` object.
3. Map those exact mutator names to actual database mutations in `apps/web/convex/replicache.ts` (`push` function).
4. Replace `useQuery(api.table.get)` with `useSubscribe(rep, tx => tx.scan({prefix: "table/"}).toArray())`.
