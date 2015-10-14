import os
from flask import Flask, url_for, render_template, request, redirect
import json
import requests
from geopy.geocoders import Nominatim
from geopy.exc import GeocoderTimedOut
from urllib2 import urlopen
import sys
import codecs
sys.stdout = codecs.getwriter('utf8')(sys.stdout)
sys.stderr = codecs.getwriter('utf8')(sys.stderr)

app = Flask(__name__)

continents = ["Asia", "Europe", "Africa", "Antarctica", "South America", "North America"]

def get_country_name(address):
    return address[address.rfind(',')+2:]

def get_news_locations(fileSourceDict):
    newslocations = {}
    index = 0 #of article
    for fileName in fileSourceDict:
        #get news data
        data = {}
        with open('./static/data/'+fileName) as json_data:
            data = json.load(json_data)
            json_data.close()
        #get cache of location-coordinates
        locache = {}
        with open('./static/data/countrylocache.json') as json_data:
            locache = json.load(json_data)
            json_data.close()
        
        geolocator = Nominatim()
        for article in data['posts']:
            index+=1
            j = 0
            countries = {} #country to coordinates
            for loc in article['locations']:
                if (loc in continents):
                    continue
                j+=1
                if (j > 5):
                    break
                if (loc not in locache): #not cached
                    try:
                        coord = geolocator.geocode(loc) #get location coordinates
                        if (coord == None):
                            continue
                        address, (latitude, longitude) = geolocator.reverse([coord.latitude, coord.longitude], language = 'en')
                        country = get_country_name(address) #grab country from coordinates
                        coord = geolocator.geocode(country) #get coordinates of country
                        if (coord == None):
                            print ("weird, no coord found for it")
                            continue
                        countries[country] = [coord.latitude, coord.longitude]
                        locache[loc] = [country, [coord.latitude, coord.longitude]] #add to cache
                    except GeocoderTimedOut as e:
                        try:
                            print("Error: geocode failed on input %s with message %s"%(e.msg))
                            continue
                        except AttributeError as e:
                            print("Issue printing error message.")
                            continue
                else: #update countries with coords if new country
                    country, coords = locache[loc]
                    if country not in countries:
                        countries[country] = [coords[0], coords[1]]
            if len(countries) <= 1:
                continue #no locations to mark
            countrylist = []
            for key in countries:
                countrylist.append(countries[key])
            if (len(article['text']) > 1000):
                article['text'] = article['text'][:1000]+"..."
            newspiece = {
                'id' : index,
                'source' : fileSourceDict[fileName],
                'date' : article['published'],
                'title' : article['title'],
                'summary' : article['text'],
                'countries' : countries.keys(),
                'countrycoords' : countries.values(),
                'url' : article['url']
            }
            #now to update the newslocations
            for country in countries:
                if country in newslocations:
                    newslocations[country].append(newspiece)
                else:
                    newslocations[country] = [countries[country], newspiece] #index 0 is country coords
        #store the cache
        with open('./static/data/countrylocache.json', 'w') as f:
            json.dump(locache, f)
    return newslocations

# Route for main page. 
@app.route('/')
def root():
    return render_template('index.html')
    
@app.route("/borders", methods=["GET"])
def get_border_data():
    data = {}
    with open('./static/data/countryborders.json') as json_data:
        data = json.load(json_data)
        json_data.close()
    return json.dumps(data)
    
@app.route("/country-news", methods=["POST"])
def get_country_news():
    if (request.form['filter'] == None or request.form['filter'] == 'none'):
        filters = {'nytnews.json':'NYTimes', 'cnnnews.json':'CNN', 'wsjnews.json':'WSJ'}
        return json.dumps(get_news_locations(filters))
    elif (request.form['filter'] == 'political'):
        filters = {'nytpoli.json':'NYTimes', 'cnnpoli.json':'CNN', 'wsjpoli.json':'WSJ'}
        return json.dumps(get_news_locations(filters))
    elif (request.form['filter'] == 'economic'):
        filters = {'nyteco.json':'NYTimes', 'cnneco.json':'CNN', 'wsjeco.json':'WSJ'}
        return json.dumps(get_news_locations(filters))

# Route for static files.
@app.route('/<path:path>')
def static_proxy(path):
    return app.send_static_file(path)
    
if __name__ == "__main__":
    app.debug = True
    app.run()