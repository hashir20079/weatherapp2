/*
  bonus.js  -  Bonus / Extension panel for the Weather Dashboard

  Needs on the page (already there or added in the steps):
    - <div id="bonus-root"></div>
    - Chart.js (already used by the dashboard)
    - Leaflet (CSS + JS, added in the steps)
    - Tailwind CSS (already used by the dashboard)
*/
(function () {
  const root = document.getElementById('bonus-root');
  if (!root) return;

  let forecastChart = null;
  let map = null;
  let marker = null;

  // ------------------------------------------------------------ layout
  root.innerHTML = `
    <section class="max-w-6xl mx-auto mt-10 px-4 pb-10 text-white">
      <h2 class="text-xl font-bold mb-1">Forecast, alerts, map and comparison</h2>
      <p class="text-sm text-[#8fa3af] mb-4">Type one city, or let the browser find where you are.</p>

      <div class="flex flex-col sm:flex-row gap-2 mb-3">
        <input id="bx-city" type="text" placeholder="One city, for example Karachi"
               class="flex-1 rounded-xl px-4 py-2 bg-[#062c3b] border border-[#0f4c61] text-white placeholder-[#8fa3af] focus:outline-none focus:border-sky-400">
        <button id="bx-go" class="rounded-xl px-4 py-2 bg-sky-500 hover:bg-sky-400 text-[#062c3b] font-semibold">Show details</button>
        <button id="bx-loc" class="rounded-xl px-4 py-2 border border-sky-400 text-sky-300 hover:bg-sky-400/10 font-semibold">Use my location</button>
      </div>

      <p id="bx-status" class="text-sm text-[#8fa3af] mb-3" aria-live="polite"></p>
      <div id="bx-alerts" class="space-y-2 mb-4"></div>

      <div class="grid gap-4 lg:grid-cols-2">
        <div class="rounded-2xl p-4 bg-[#062c3b] border border-[#0f4c61]">
          <h3 class="font-semibold mb-2">Next 24 hours</h3>
          <div class="h-56"><canvas id="bx-chart"></canvas></div>
          <div id="bx-days" class="grid grid-cols-5 gap-2 mt-4 text-center text-sm"></div>
        </div>
        <div class="rounded-2xl p-4 bg-[#062c3b] border border-[#0f4c61]">
          <h3 class="font-semibold mb-2">Map</h3>
          <div id="bx-map" class="h-72 rounded-xl overflow-hidden bg-[#0f4c61]"></div>
        </div>
      </div>

      <div id="bx-compare" class="rounded-2xl p-4 bg-[#062c3b] border border-[#0f4c61] mt-4 hidden"></div>
    </section>
  `;

  const $ = (id) => document.getElementById(id);

  // ----------------------------------------------------------- helpers
  function esc(text) {
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
  }

  function setStatus(text) {
    $('bx-status').textContent = text;
  }

  async function getJson(url) {
    const response = await fetch(url);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Something went wrong.');
    return data;
  }

  function query(target) {
    return new URLSearchParams(target).toString();
  }

  // ---------------------------------------------------------- renderers
  function renderAlerts(alerts) {
    const box = $('bx-alerts');
    if (!alerts.length) {
      box.innerHTML = `<div class="rounded-xl px-4 py-3 border border-emerald-500/40 bg-emerald-500/10 text-emerald-200 text-sm">
        No weather alerts for the next 5 days.</div>`;
      return;
    }
    box.innerHTML = alerts.map((a) => {
      const style = a.level === 'danger'
        ? 'border-red-500/50 bg-red-500/10 text-red-200'
        : 'border-amber-400/50 bg-amber-400/10 text-amber-100';
      return `<div class="rounded-xl px-4 py-3 border text-sm ${style}">
        <strong>${esc(a.title)}.</strong> ${esc(a.detail)}</div>`;
    }).join('');
  }

  function renderForecast(data) {
    if (forecastChart) forecastChart.destroy();

    forecastChart = new Chart($('bx-chart').getContext('2d'), {
      type: 'line',
      data: {
        labels: data.points.map((p) => p.label),
        datasets: [
          { label: 'Temperature (°C)', data: data.points.map((p) => p.temp),
            borderColor: '#38bdf8', backgroundColor: '#38bdf8', tension: 0.4, borderWidth: 2.5, pointRadius: 3 },
          { label: 'Feels like (°C)', data: data.points.map((p) => p.feels_like),
            borderColor: 'rgba(148,163,184,0.7)', backgroundColor: 'rgba(148,163,184,0.7)',
            borderDash: [4, 3], tension: 0.4, borderWidth: 1.5, pointRadius: 0 }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: '#8fa3af', boxWidth: 12 } } },
        scales: {
          x: { ticks: { color: '#8fa3af' }, grid: { color: 'rgba(15,76,97,0.5)' } },
          y: { ticks: { color: '#8fa3af' }, grid: { color: 'rgba(15,76,97,0.5)' } }
        }
      }
    });

    $('bx-days').innerHTML = data.days.map((d) => `
      <div class="rounded-xl py-2 bg-[#0f4c61]/40">
        <div class="text-[#8fa3af]">${esc(d.day)}</div>
        <img class="mx-auto w-10 h-10" alt="" src="https://openweathermap.org/img/wn/${esc(d.icon)}.png">
        <div class="font-semibold">${d.max}°</div>
        <div class="text-[#8fa3af]">${d.min}°</div>
      </div>`).join('');
  }

  function renderMap(data) {
    if (typeof L === 'undefined') {
      $('bx-map').innerHTML = '<p class="p-4 text-sm text-[#8fa3af]">The map library could not load.</p>';
      return;
    }
    const first = data.points[0];
    const popup = `<strong>${esc(data.city)}, ${esc(data.country)}</strong><br>${first.temp}°C now`;

    if (!map) {
      map = L.map('bx-map').setView([data.lat, data.lon], 10);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);
      marker = L.marker([data.lat, data.lon]).addTo(map);
    } else {
      map.setView([data.lat, data.lon], 10);
      marker.setLatLng([data.lat, data.lon]);
    }
    marker.bindPopup(popup).openPopup();
    setTimeout(() => map.invalidateSize(), 100);
  }

  function renderCompare(c) {
    const diff = (a, b) => {
      const d = (a - b).toFixed(1);
      return (d > 0 ? '+' : '') + d;
    };
    const rows = [
      ['Temperature (°C)', 'temp'],
      ['Feels like (°C)', 'feels_like'],
      ['Humidity (%)', 'humidity'],
      ['Wind (m/s)', 'wind']
    ].map(([label, key]) => `
      <tr class="border-t border-[#0f4c61]">
        <td class="py-2 text-[#8fa3af]">${label}</td>
        <td class="py-2 text-right">${c.owm[key]}</td>
        <td class="py-2 text-right">${c.meteo[key]}</td>
        <td class="py-2 text-right text-sky-300">${diff(c.owm[key], c.meteo[key])}</td>
      </tr>`).join('');

    const box = $('bx-compare');
    box.classList.remove('hidden');
    box.innerHTML = `
      <h3 class="font-semibold mb-2">Two weather services compared for ${esc(c.city)}, ${esc(c.country)}</h3>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead><tr class="text-[#8fa3af]">
            <th class="text-left font-normal pb-2">Reading</th>
            <th class="text-right font-normal pb-2">OpenWeatherMap</th>
            <th class="text-right font-normal pb-2">Open-Meteo</th>
            <th class="text-right font-normal pb-2">Difference</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <p class="text-xs text-[#8fa3af] mt-3">Weather data: OpenWeather and Open-Meteo.com. Map: OpenStreetMap contributors.</p>`;
  }

  // -------------------------------------------------------- main action
  async function loadAll(target) {
    setStatus('Loading...');
    try {
      const q = query(target);
      const [forecast, compare] = await Promise.all([
        getJson('/api/forecast?' + q),
        getJson('/api/compare?' + q)
      ]);
      renderAlerts(forecast.alerts);
      renderForecast(forecast);
      renderMap(forecast);
      renderCompare(compare);
      setStatus(`Showing ${forecast.city}, ${forecast.country}`);
    } catch (error) {
      setStatus(error.message);
    }
  }

  function useMyLocation() {
    if (!('geolocation' in navigator)) {
      setStatus('This browser cannot share your location. Type a city instead.');
      return;
    }
    setStatus('Waiting for your permission...');
    navigator.geolocation.getCurrentPosition(
      (position) => loadAll({
        lat: position.coords.latitude.toFixed(4),
        lon: position.coords.longitude.toFixed(4)
      }),
      (error) => {
        setStatus(error.code === 1
          ? 'Location permission was denied. Type a city instead.'
          : 'Could not find your location. Type a city instead.');
      },
      { timeout: 10000 }
    );
  }

  function useCity() {
    const city = $('bx-city').value.trim();
    if (!city) {
      setStatus('Please type a city name.');
      return;
    }
    loadAll({ city });
  }

  $('bx-go').addEventListener('click', useCity);
  $('bx-loc').addEventListener('click', useMyLocation);
  $('bx-city').addEventListener('keydown', (e) => { if (e.key === 'Enter') useCity(); });
})();
