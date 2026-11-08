======================================================================
 WEATHER DASHBOARD & ANALYTICS
 Weather API Data Collection and Visualization System
======================================================================



----------------------------------------------------------------------
 1. WHAT THIS PROJECT IS
----------------------------------------------------------------------

A small web app, built with Python (Flask), that shows live weather
for up to three cities at the same time. Each city gets a card with
the temperature, wind, humidity, pressure, sunrise and sunset, the
correct LOCAL time of that city, and a small graph.

Below the cards there is a BONUS PANEL with five extra features:

  1. Forecast data         - real 24-hour chart and 5-day summary
  2. Location detection    - "Use my location" button (asks permission)
  3. Weather alerts        - heat, cold, wind, storm and rain warnings
  4. API comparison        - OpenWeatherMap vs Open-Meteo side by side
  5. Map view              - map with a marker on the city

The weather comes from OpenWeatherMap (free plan). The comparison
also uses Open-Meteo, which needs no key.


----------------------------------------------------------------------
 2. WHAT IS IN THE FOLDER
----------------------------------------------------------------------

  weather_project/
  |-- app.py              Main Flask app. Reads the API key and
  |                       connects the bonus routes.
  |-- bonus.py            Bonus routes: /api/current, /api/forecast,
  |                       /api/compare (plus a 10-minute cache).
  |-- templates/
  |   `-- index.html      The web page (cards, graphs, layout).
  |-- static/
  |   `-- bonus.js        The bonus panel (location, chart, alerts,
  |                       map, comparison table).
  |-- manifest.json       Phone-app settings (name, colours, icon).
  |-- sw.js               Service worker (saves the page for speed).
  |-- requirements.txt    Python tools that must be installed.
  |-- .env.example        Example of the private key file.
  `-- README.txt          This file.


----------------------------------------------------------------------
 3. WHAT YOU NEED
----------------------------------------------------------------------

  - Python 3.8 or newer
  - An internet connection
  - A free OpenWeatherMap account and API key
    (https://openweathermap.org  ->  sign up  ->  "API keys")
  - A modern browser (Chrome, Edge, Firefox, Safari)


----------------------------------------------------------------------
 4. HOW TO SET IT UP
----------------------------------------------------------------------

STEP 1 - Open a terminal in the project folder (the one that has
         app.py in it).

STEP 2 - Install the Python tools:

             pip install -r requirements.txt

STEP 3 - Put your API key in a file named  .env  (in the same folder
         as app.py):

           a) Copy the file  .env.example  and rename the copy to
              exactly  .env   (no ".example", no ".txt").
           b) Open .env in any text editor and write ONE line:

                  OPENWEATHER_API_KEY=paste_your_real_key_here

              No spaces around the = sign and no quotes are needed.

         If the .env file does not work for you, open app.py and
         paste the key between the quotes on this line near the top:

                  MY_API_KEY = ''

STEP 4 - Start the app:

             python app.py

         The terminal should print:  API key found.
         If it prints a WARNING instead, the key was not found
         (see the Troubleshooting section).

STEP 5 - Open your browser and go to:

             http://127.0.0.1:5000

IMPORTANT: If you change the key later, stop the app (Ctrl+C) and
start it again. The key is only read when the app starts.


----------------------------------------------------------------------
 5. HOW TO USE IT
----------------------------------------------------------------------

CITY CARDS (top of the page)
  1. Type 1 to 3 city names separated by commas, for example:
         Karachi, London, Tokyo
  2. Press the Load button.
  3. Each city shows a card with its weather and its own local time.
     A wrong city name shows a red error card; the other cities
     still work.

BONUS PANEL (below the cards)
  - Type one city and press "Show details", or
  - Press "Use my location". Your browser will ask for permission.
    If you say no, just type a city instead.

  You will see: alerts, a 24-hour chart, a 5-day summary, a map and
  a comparison table of the two weather services.

  Location detection works only on  http://127.0.0.1  (localhost)
  or on an https:// address. It does not work on a plain http:// web
  address.


----------------------------------------------------------------------
 6. THE ROUTES (for developers)
----------------------------------------------------------------------

  /                    The web page.
  /api/current         Current weather.     ?city=Karachi
  /api/forecast        24-hour forecast, 5-day summary and alerts.
                       ?city=Karachi   or   ?lat=24.86&lon=67.01
  /api/compare         OpenWeatherMap vs Open-Meteo readings.
                       ?city=Karachi   or   ?lat=24.86&lon=67.01
  /api/debug           Help page that shows where the app looks for
                       the key. Never shows the key itself. Works
                       only while the app runs in debug mode.

Answers from OpenWeatherMap are saved for 10 minutes, so many users
asking about the same city use only one request.


----------------------------------------------------------------------
 7. WEATHER ALERT RULES
----------------------------------------------------------------------

The alerts are simple rules written for this project. They are NOT
official warnings from a weather office.

  Extreme heat (red)            40 C or more
  Hot weather (yellow)          35 C or more
  Freezing cold (red)           0 C or less
  Very cold (yellow)            5 C or less
  Very strong wind (red)        17 m/s or more
  Strong wind (yellow)          10 m/s or more
  Thunderstorm possible (red)   forecast contains a thunderstorm
  High chance of rain/snow      70% or more


----------------------------------------------------------------------
 8. TECHNOLOGIES USED
----------------------------------------------------------------------

  Python + Flask ........ the web server and routes
  Flask Blueprint ....... keeps the bonus routes in their own file
  requests .............. lets Python ask the weather services
  .env file ............. keeps the API key private (not in the code)
  OpenWeatherMap API .... current weather and 5-day forecast
  Open-Meteo API ........ second weather source (no key needed)
  HTML, JavaScript ...... the page and the bonus panel
  Tailwind CSS .......... layout and colours
  Chart.js .............. the graphs
  Leaflet ............... the map library
  OpenStreetMap ......... the map pictures
  Browser Geolocation ... finds the user's position (with permission)
  Font Awesome .......... small icons
  manifest.json, sw.js .. phone-app files


----------------------------------------------------------------------
 9. TROUBLESHOOTING
----------------------------------------------------------------------

PROBLEM: "The server has no API key"
  - The key was not found. Check that the file is named exactly
    .env (not .env.txt) and sits next to app.py.
  - Check that the line is  OPENWEATHER_API_KEY=yourkey
  - Stop the app (Ctrl+C) and start it again.
  - Open  http://127.0.0.1:5000/api/debug  to see which folder the
    app runs from and whether a key was found.
  - Or paste the key into  MY_API_KEY = ''  near the top of app.py.

PROBLEM: "No module named flask" (or requests)
  - Run:  pip install -r requirements.txt

PROBLEM: "No module named bonus"
  - bonus.py must be in the same folder as app.py.

PROBLEM: the bonus panel does not appear
  - Make sure index.html is inside the  templates  folder and
    bonus.js is inside the  static  folder.
  - Press F12 in the browser and look at the Console tab for errors.

PROBLEM: error 401 or "Invalid API key"
  - A new OpenWeatherMap key can take up to a couple of hours to
    start working. Check that you copied all of it.

PROBLEM: error 429 or "account temporarily blocked"
  - The free plan limit was passed (60 calls per minute, 1,000,000
    calls per month). Wait a little and try again.

PROBLEM: "Use my location" does nothing or says denied
  - Allow location for the site in the browser, or type a city.
  - Use  http://127.0.0.1:5000  and not another http address.


----------------------------------------------------------------------
 10. SECURITY NOTES
----------------------------------------------------------------------

  - NEVER upload your .env file or your key to GitHub or share it.
  - If a key was ever shown in public (a chat, a screenshot, a
    shared file), delete it in your OpenWeatherMap account and
    create a new one.
  - Do not leave the app in debug mode on a public server.


----------------------------------------------------------------------
 11. KNOWN LIMITS
----------------------------------------------------------------------

  - The small graph inside each city card is an ILLUSTRATION made
    from the current temperature. The real forecast is in the bonus
    panel.
  - The pressure and "water" values in the city cards are
    placeholders, not real measurements.
  - manifest.json and sw.js are included, but Flask does not serve
    them from the right place yet, so the "install as phone app"
    feature is not active.
  - The free OpenWeatherMap plan is limited to 60 calls per minute
    and 1,000,000 calls per month. A public launch would need a paid
    plan or more caching.
  - Not included: cloud database and scheduled automatic collection.




======================================================================
