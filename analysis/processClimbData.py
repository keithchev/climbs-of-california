# -*- coding: utf-8 -*-
"""
Created on Mon May 02 23:42:14 2016

@author: Keith
"""
import json
import urllib
import os, glob, pdb
import numpy as np
import scipy as sp
import pandas as pd

from datetime import datetime
from lxml import etree

   
def makeJSONfromCSVs(csvDir):

    csvs = glob.glob(csvDir + '\\*.csv')
    JSONFile = csvDir + '\\climbList.json'
    
    climbDictList = [];
    
    for csv in csvs:
        
        climbCSV = pd.read_csv(csv)
        
        print(csv)
        
        gain   = round(climbCSV.alt[-1:] - climbCSV.alt[0]) # meters
        length = round(climbCSV.dst[-1:])  # meters
        maxAlt = round(climbCSV.alt.max()) # meters
        
        fietsIndex = gain*gain/(10*length) + (gain > 1000)*(gain - 1000)/1000
        

        climbDict = {"type": "Feature", "properties": {}, "geometry": {"type": "LineString", "coordinates": []}}
        
        climbDict['properties']['fname'] = csv[csv.rfind('\\')+1:]
        climbDict['properties']['name']  = csv[csv.rfind('\\')+1:-4].replace('-', ' ')
        
        climbDict['properties']['maxAlt'] = maxAlt
        climbDict['properties']['gain']  = gain
        climbDict['properties']['len']   = length
        climbDict['properties']['fiets'] = round(fietsIndex,2)
        
        climbCoords = []
        for index, row in climbCSV.iterrows():  
            if not np.mod(index, 5):
                climbCoords.append( [round(row['lon'], 5), round(row['lat'], 5) ] )
            
        climbDict['geometry']['coordinates'] = climbCoords
        
        climbDictList.append(climbDict)
        
    with open(JSONFile, 'w') as outfile:
        json.dump(climbDictList, outfile)
        
        
        
        
def convertTCXtoCSV(TCXDir):
    
    TCXs = glob.glob(TCXDir + '\\*.tcx')
    for TCX in TCXs:
        if os.path.isfile(TCX.replace('.tcx', '.csv')):
            continue
        
        print(TCX)

        CSVData = {}
        
        CSVData['dst']  = []
        CSVData['lat']  = []
        CSVData['lon']  = []
        CSVData['alt']  = []
        CSVData['mdata'] = []
        
        CSVData['mdata'].append(TCX)
        
        tree = etree.parse(TCX)    
        root = tree.getroot()
    
        trackpoints = root[1][0][2][0:]
        for trackpoint in trackpoints:   
            
            lat = ''
            lon = ''
            alt = ''
            dst = ''
            for entry in trackpoint:
    
                if 'Position' in entry.tag:
                    lat = float(entry[0].text)     # lat degrees
                    lon = float(entry[1].text)     # lon degrees
                    
                if 'Altitude' in entry.tag:
                    alt = float(entry.text)        # altitude meters
            
                if 'Distance' in entry.tag:                
                    dst = float(entry.text)        # distance meters
                
            CSVData['lat'].append(lat)
            CSVData['lon'].append(lon)
            CSVData['alt'].append(alt)
            CSVData['dst'].append(dst)
            CSVData['mdata'].append('')
            
        CSVData['mdata'] = CSVData['mdata'][0:-1]

        CSVData = pd.DataFrame(CSVData)
        CSVData.to_csv(TCX.replace('.tcx', '.csv'), index=False, float_format='%0.6f')


def listClimbs(csvDir):
    
    climbs = glob.glob(csvDir + '\\*.csv')
    climbListFilename = csvDir + '\\climbList.csv'

    with open(climbListFilename, 'w') as climbListFile:
        climbListFile.write('filename,\n')

        for climb in climbs:
        	climbListFile.write(climb.split('\\')[-1] + ',\n')
        
        
        
def downloadTCXFromPJAMMList(TCXDir):
    
    # this function reads from a CSV which was downloaded from 
    # http://www.pjammcycling.com/california---top-ca-climbs.html
    # (see notes in text file in /climbing directory)
    
    ext = '.tcx'
    csv = pd.read_csv('pjamm_ca_climblist.csv', header=None)
    
    # urls are in column 14
    urls = csv[14]
    names = csv[4]
    
    for url, name in zip(urls, names):
        
        if not type(url) is str:
            continue
        
        s = url.find('?q=')
        e = url.find('&sa')
        
        url = url[s+3:e] + ext
        
        fname = name.replace(' ', '-').replace('*', '').replace('/', '-')
        
        print(fname)
        
        if not os.path.isfile(TCXDir + fname + ext):
            
            pdb.set_trace()
        
            urllib.urlretrieve(url, TCXDir + fname + ext)
            
            
            
def downloadTCXFromKCCList(TCXDir):
    
    ext = '.tcx'
    csv = pd.read_csv('kc_manual_climblist.csv', header=None)
    
    urls  = csv[1]
    names = csv[0]
    
    for url, name in zip(urls, names):
        
        if not type(url) is str:
            continue
        
        url = url + ext
        fname = name.replace(' ', '-').replace('*', '').replace('/', '-').replace(',', '')
        
        print(fname)
        
        if not os.path.isfile(TCXDir + fname + ext):
            urllib.urlretrieve(url, TCXDir + fname + ext)
            
        
    
 
        
        
        
        
        
    
    
    