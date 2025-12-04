## Code & Conquer – Ad System Overview

This project is a full‑stack web app (React + Node/Express). The changes below describe the **ad system** that was added to help understand and modify it.

### What the Ad System Does

- **Shows an ad periodically** while a user is on the site (interval is configurable).
- **Picks a random YouTube video** from a simple CSV file.
- **Displays the ad in a full‑screen modal**, auto‑playing the video.
- **Forces at least 30 seconds of watch time** before the user can close/skip the ad.

---

### Backend Pieces

- **`backend/data/ads.csv`**
  - Simple CSV file that stores the ads.
  - Columns: `youtube_url,title`
  - Example:

    ```csv
    youtube_url,title
    https://www.youtube.com/watch?v=dQw4w9WgXcQ,Ad 1
    https://www.youtube.com/watch?v=jNQXAC9IVRw,Ad 2
    ```

  - To add/remove ads, just edit this file and restart the backend if needed.

- **`backend/src/controllers/adController.js`**
  - Reads `ads.csv`, parses it, and returns **one random ad**.
  - Handles basic CSV quirks (e.g., quoted fields with commas).
  - Response shape:

    ```json
    {
      "youtube_url": "https://www.youtube.com/watch?v=...",
      "title": "Some Ad Title"
    }
    ```

- **`backend/src/routes/adRoutes.js`**
  - Express router for the ad API.
  - Endpoint:
    - `GET /api/ads/random` → returns a random ad (as above).

- **`backend/src/index.js`** (modified)
  - Wires the routes into the main Express app:

    ```js
    import adRoutes from './routes/adRoutes.js';
    // ...
    app.use('/api/ads', adRoutes);
    ```

---

### Frontend Pieces

- **`frontend/src/services/api.js`** (modified)
  - Adds a small helper for fetching ads:

    ```js
    export const getRandomAd = () => api.get('/ads/random');
    ```

  - Uses the same `API_BASE_URL` as the rest of the app.

- **`frontend/src/hooks/useAdTimer.js`**
  - Custom React hook that **decides when to show an ad**.
  - Key pieces:
    - `AD_INTERVAL_MS` – how often to show an ad.
      - Currently:

        ```js
        const AD_INTERVAL_MS = 1 * 60 * 1000; // change this to 30 for 30 minutes
        ```

        Set to `30 * 60 * 1000` for “every 30 minutes”.
    - Checks every minute whether enough time has passed since the last ad.
    - When it’s time, calls `getRandomAd()`, stores the data, and toggles `showAd` to `true`.
  - Returns:
    - `showAd` – whether the ad modal should be visible.
    - `adData` – the current ad (`{ youtube_url, title }`).
    - `loading` – while fetching.
    - `closeAd` – function to hide the ad and clear state.

- **`frontend/src/components/AdModal.jsx`**
  - Full‑screen modal that **plays the YouTube ad**.
  - Behavior:
    - Uses the **YouTube IFrame API** to embed the video.
    - Attempts to **autoplay with sound** (subject to browser autoplay policies).
    - Forces a **30 second countdown** before the ad can be skipped:
      - Close/skip button is disabled and visually “locked” during the countdown.
      - After 30 seconds, the user can click “Skip Ad” or the close icon.
    - Cleans up the YouTube player instance when the modal closes.

- **`frontend/src/components/AdModal.css`**
  - Styles for the ad modal:
    - Dark, blurred backdrop overlay.
    - Centered card containing the YouTube player.
    - Simple typography for the ad label/title.
    - Styles for the skip timer text and skip button.

- **`frontend/src/App.jsx`** (modified)
  - Integrates the hook + modal at the app level so ads are global:

    ```jsx
    import AdModal from './components/AdModal';
    import { useAdTimer } from './hooks/useAdTimer';

    function AppRoutes() {
      const { showAd, adData, closeAd } = useAdTimer();

      return (
        <>
          <Routes>
            {/* existing routes */}
          </Routes>
          {showAd && <AdModal adData={adData} onClose={closeAd} />}
        </>
      );
    }
    ```

---

### How to Change Behavior

- **Change how often ads appear**
  - Edit `AD_INTERVAL_MS` in `frontend/src/hooks/useAdTimer.js`.
  - Formula: `minutes * 60 * 1000`.
  - Examples:
    - 10 minutes → `10 * 60 * 1000`
    - 30 minutes → `30 * 60 * 1000`
    - 1 hour → `60 * 60 * 1000`

- **Change how long the ad is unskippable**
  - Edit `REQUIRED_WATCH_TIME` in `frontend/src/components/AdModal.jsx`:

    ```js
    const REQUIRED_WATCH_TIME = 30; // seconds
    ```

- **Add / edit ads**
  - Open `backend/data/ads.csv`.
  - Add rows with `youtube_url,title`.
  - Make sure the first row is the header.

---

### Notes & Limitations

- **Autoplay with sound** is ultimately controlled by the browser:
  - The code uses the YouTube IFrame API to unmute on play, but some browsers will still start muted until the user has interacted with the page.
- The ad system is intentionally **simple**:
  - No per‑user tracking, no frequency capping beyond the global interval.
  - No admin UI – ads are managed directly through the CSV file.

This README is focused on the **ad feature** only. The rest of the Code & Conquer app (auth, problems, game, etc.) follows its own structure in `frontend/` and `backend/`, but can largely be treated as “existing app code” that the ad system plugs into.


