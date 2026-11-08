"""
bonus.py  -  Bonus / Extension routes for the Weather Dashboard

Adds JSON routes to the Flask app:
    /api/current   -> current weather (the dashboard cards use this, so the key stays private)
    /api/forecast  -> real 24-hour forecast, 5-day summary and weather alerts
    /api/compare   -> OpenWeatherMap vs Open-Meteo side by side

The OpenWeatherMap key is read from an environment variable, so it never
appears in the page or in the source code.
"""

import os
import time
from datetime import datetime, timezone, timedelta

import requests
from flask import Blueprint, jsonify, request

bonus_bp = Blueprint('bonus', __name__)

OWM_URL = 'https://api.openweathermap.org/data/2.5'
METEO_URL = 'https://api.open-meteo.com/v1/forecast'

MSG_NO_KEY = 'The server has no API key. Open http://127.0.0.1:5000/api/debug to see why.'
MSG_BAD_LOC = 'Invalid location.'
MSG_NO_PLACE = 'Send a city name or a location.'

CACHE_SECONDS = 600          # weather data changes about every 10 minutes
_cache = {}                  # simple in-memory cache: {key: (time_saved, data)}


# ---------------------------------------------------------------- helpers

def get_key():
    """Read the private API key from the environment."""
    return os.environ.get('OPENWEATHER_API_KEY', '')


def local_time(timestamp, tz_offset):
    """World-time timestamp + city's time difference = city clock time."""
    return datetime.fromtimestamp(timestamp, tz=timezone.utc) + timedelta(seconds=tz_offset)


def owm_params(args):
    """
    Build the request parameters from what the browser sent.
    Returns (params, None) when fine, or (None, error_response) when not.
    """
    key = get_key()
    if not key:
        return None, (jsonify({'error': MSG_NO_KEY, 'message': MSG_NO_KEY}), 500)

    params = {'appid': key, 'units': 'metric'}
    lat = args.get('lat')
    lon = args.get('lon')
    city = args.get('city', '').strip()

    if lat and lon:
        try:
            lat_f, lon_f = float(lat), float(lon)
        except ValueError:
            return None, (jsonify({'error': MSG_BAD_LOC, 'message': MSG_BAD_LOC}), 400)
        if not (-90 <= lat_f <= 90 and -180 <= lon_f <= 180):
            return None, (jsonify({'error': MSG_BAD_LOC, 'message': MSG_BAD_LOC}), 400)
        params['lat'] = lat_f
        params['lon'] = lon_f
    elif city:
        params['q'] = city
    else:
        return None, (jsonify({'error': MSG_NO_PLACE, 'message': MSG_NO_PLACE}), 400)

    return params, None


def owm_get(path, params):
    """
    Ask OpenWeatherMap. Answers are saved for 10 minutes, so many users
    asking about the same place cost only one API call.
    Returns (data, status_code).
    """
    cache_key = (path, tuple(sorted((k, str(v)) for k, v in params.items() if k != 'appid')))
    saved = _cache.get(cache_key)
    if saved and time.time() - saved[0] < CACHE_SECONDS:
        return saved[1], 200

    try:
        response = requests.get(f'{OWM_URL}/{path}', params=params, timeout=8)
        data = response.json()
    except requests.exceptions.RequestException:
        return {'message': 'Could not reach the weather service.'}, 502
    except ValueError:
        return {'message': 'The weather service sent an unreadable answer.'}, 502

    if response.status_code == 200:
        _cache[cache_key] = (time.time(), data)
    return data, response.status_code


# ------------------------------------------------------ current weather

@bonus_bp.route('/api/current')
def api_current():
    """Passes OpenWeatherMap's current-weather answer to the page unchanged."""
    params, error = owm_params(request.args)
    if error:
        return error
    data, status = owm_get('weather', params)
    return jsonify(data), status


# ----------------------------------------------------- forecast + alerts

def build_days(items, tz):
    """Group the 3-hour forecast into days with a min, a max and one icon."""
    days = {}
    for item in items:
        t = local_time(item['dt'], tz)
        day = days.setdefault(t.date(), {'name': t.strftime('%a'), 'min': 100, 'max': -100, 'icon': None, 'gap': 99})
        day['min'] = min(day['min'], item['main']['temp_min'])
        day['max'] = max(day['max'], item['main']['temp_max'])
        gap = abs(t.hour - 12)                 # keep the icon closest to midday
        if gap < day['gap']:
            day['gap'] = gap
            day['icon'] = item['weather'][0]['icon']
    result = []
    for date in sorted(days)[:5]:
        d = days[date]
        result.append({'day': d['name'], 'min': round(d['min']), 'max': round(d['max']), 'icon': d['icon']})
    return result


def build_alerts(items, tz):
    """
    Rule-based weather alerts. We look at the whole 5-day forecast and warn
    about heat, cold, strong wind, thunderstorms and a high chance of rain.
    """
    def when(item):
        return local_time(item['dt'], tz).strftime('%a %I %p').replace(' 0', ' ')

    alerts = []

    hottest = max(items, key=lambda i: i['main']['temp_max'])
    temp = hottest['main']['temp_max']
    if temp >= 40:
        alerts.append({'level': 'danger', 'title': 'Extreme heat',
                       'detail': f'Up to {round(temp)}°C around {when(hottest)}. Stay indoors and drink water.'})
    elif temp >= 35:
        alerts.append({'level': 'warning', 'title': 'Hot weather',
                       'detail': f'Up to {round(temp)}°C around {when(hottest)}.'})

    coldest = min(items, key=lambda i: i['main']['temp_min'])
    temp = coldest['main']['temp_min']
    if temp <= 0:
        alerts.append({'level': 'danger', 'title': 'Freezing cold',
                       'detail': f'Down to {round(temp)}°C around {when(coldest)}.'})
    elif temp <= 5:
        alerts.append({'level': 'warning', 'title': 'Very cold',
                       'detail': f'Down to {round(temp)}°C around {when(coldest)}.'})

    windiest = max(items, key=lambda i: i['wind']['speed'])
    speed = windiest['wind']['speed']
    if speed >= 17:
        alerts.append({'level': 'danger', 'title': 'Very strong wind',
                       'detail': f'Up to {speed:.0f} m/s around {when(windiest)}.'})
    elif speed >= 10:
        alerts.append({'level': 'warning', 'title': 'Strong wind',
                       'detail': f'Up to {speed:.0f} m/s around {when(windiest)}.'})

    for item in items:
        if item['weather'][0]['main'] == 'Thunderstorm':
            alerts.append({'level': 'danger', 'title': 'Thunderstorm possible',
                           'detail': f'Expected around {when(item)}.'})
            break

    rainiest = max(items, key=lambda i: i.get('pop', 0))
    if rainiest.get('pop', 0) >= 0.7:
        alerts.append({'level': 'warning', 'title': 'High chance of rain or snow',
                       'detail': f'{round(rainiest["pop"] * 100)}% chance around {when(rainiest)}.'})

    return alerts


@bonus_bp.route('/api/forecast')
def api_forecast():
    params, error = owm_params(request.args)
    if error:
        return error

    data, status = owm_get('forecast', params)
    if status != 200:
        return jsonify({'error': data.get('message', 'Forecast not available.')}), status

    tz = data['city'].get('timezone', 0)
    items = data['list']

    points = []
    for item in items[:8]:                      # 8 steps x 3 hours = next 24 hours
        points.append({
            'label': local_time(item['dt'], tz).strftime('%I %p').lstrip('0'),
            'temp': round(item['main']['temp'], 1),
            'feels_like': round(item['main']['feels_like'], 1),
            'icon': item['weather'][0]['icon'],
            'pop': round(item.get('pop', 0) * 100)
        })

    return jsonify({
        'city': data['city']['name'],
        'country': data['city'].get('country', ''),
        'lat': data['city']['coord']['lat'],
        'lon': data['city']['coord']['lon'],
        'points': points,
        'days': build_days(items, tz),
        'alerts': build_alerts(items, tz)
    })


# ------------------------------------------------------ API comparison

@bonus_bp.route('/api/compare')
def api_compare():
    params, error = owm_params(request.args)
    if error:
        return error

    data, status = owm_get('weather', params)
    if status != 200:
        return jsonify({'error': data.get('message', 'City not found.')}), status

    lat = data['coord']['lat']
    lon = data['coord']['lon']
    owm = {
        'temp': round(data['main']['temp'], 1),
        'feels_like': round(data['main']['feels_like'], 1),
        'humidity': data['main']['humidity'],
        'wind': round(data['wind']['speed'], 1)
    }

    try:
        response = requests.get(METEO_URL, params={
            'latitude': lat,
            'longitude': lon,
            'current': 'temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m',
            'wind_speed_unit': 'ms'
        }, timeout=8)
        current = response.json()['current']
        meteo = {
            'temp': round(current['temperature_2m'], 1),
            'feels_like': round(current['apparent_temperature'], 1),
            'humidity': current['relative_humidity_2m'],
            'wind': round(current['wind_speed_10m'], 1)
        }
    except (requests.exceptions.RequestException, KeyError, ValueError):
        return jsonify({'error': 'Open-Meteo could not be reached.'}), 502

    return jsonify({
        'city': data['name'],
        'country': data['sys'].get('country', ''),
        'lat': lat,
        'lon': lon,
        'owm': owm,
        'meteo': meteo
    })
