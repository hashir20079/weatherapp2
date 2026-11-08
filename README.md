# Weather Dashboard & Analytics (with Bonus / Extension)

## Run it
1. Install the tools:      pip install -r requirements.txt
2. Copy `.env.example` to `.env` and paste your NEW OpenWeatherMap key in it.
3. Start the app:          python app.py
4. Open:                   http://127.0.0.1:5000

## What the bonus adds (panel below the city cards)
- Real 24-hour forecast chart and 5-day summary
- "Use my location" button (asks permission first)
- Weather alerts (heat, cold, wind, thunderstorm, heavy rain)
- Map view (Leaflet + OpenStreetMap)
- OpenWeatherMap vs Open-Meteo comparison

## Files
- app.py              Flask app (registers the bonus routes)
- bonus.py            Bonus routes: /api/current, /api/forecast, /api/compare
- templates/index.html  The page
- static/bonus.js       The bonus panel script
- manifest.json, sw.js  Phone-app files (unchanged)
