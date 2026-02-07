"""
IPTV Server - Flask backend for IPTV application
"""
from flask import Flask, jsonify, request, send_file, Response
import json
import os
from datetime import datetime, timedelta
import re

app = Flask(__name__)

# Sample M3U playlist data
SAMPLE_CHANNELS = [
    {
        "name": "BBC News",
        "logo": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/77/BBC_News_2022_%28Alt%29_logo.svg/1200px-BBC_News_2022_%28Alt%29_logo.svg.png",
        "stream_url": "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
        "category": "News",
        "epg_id": "bbcnews.uk"
    },
    {
        "name": "Euronews",
        "logo": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/Euronews_2018_logo.svg/1200px-Euronews_2018_logo.svg.png",
        "stream_url": "https://evengh.live/hls/eng/index.m3u8",
        "category": "News",
        "epg_id": "euronews.com"
    },
    {
        "name": "NASA Live",
        "logo": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/NASA_logo.svg/1200px-NASA_logo.svg.png",
        "stream_url": "https://nasatv-lh.akamaihd.net/i/NASA_101@319270/index_1_av-p.m3u8?sd=10&rebase=on",
        "category": "Science",
        "epg_id": "nasa.gov"
    },
    {
        "name": "Test Stream",
        "logo": "",
        "stream_url": "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
        "category": "Test",
        "epg_id": "test.stream"
    }
]

def generate_epg_data():
    """Generate sample EPG data"""
    now = datetime.now()
    epg = {}
    
    for channel in SAMPLE_CHANNELS:
        channel_name = channel["name"]
        channel_id = channel.get("epg_id", channel_name.lower().replace(" ", "_"))
        
        epg[channel_id] = []
        
        # Generate programs for the current day and next day
        for day_offset in range(2):
            date = now + timedelta(days=day_offset)
            
            # Sample programs throughout the day
            programs = [
                {
                    "title": "Morning Show",
                    "start": date.replace(hour=6, minute=0, second=0).strftime("%Y%m%d%H%M%S"),
                    "end": date.replace(hour=9, minute=0, second=0).strftime("%Y%m%d%H%M%S"),
                    "description": "Start your day with our morning program"
                },
                {
                    "title": "News Hour",
                    "start": date.replace(hour=9, minute=0, second=0).strftime("%Y%m%d%H%M%S"),
                    "end": date.replace(hour=10, minute=0, second=0).strftime("%Y%m%d%H%M%S"),
                    "description": "Latest news and current events"
                },
                {
                    "title": "Documentary Series",
                    "start": date.replace(hour=10, minute=0, second=0).strftime("%Y%m%d%H%M%S"),
                    "end": date.replace(hour=12, minute=0, second=0).strftime("%Y%m%d%H%M%S"),
                    "description": "Educational documentaries"
                },
                {
                    "title": "Afternoon Programming",
                    "start": date.replace(hour=12, minute=0, second=0).strftime("%Y%m%d%H%M%S"),
                    "end": date.replace(hour=15, minute=0, second=0).strftime("%Y%m%d%H%M%S"),
                    "description": "Various programs throughout the afternoon"
                },
                {
                    "title": "Evening News",
                    "start": date.replace(hour=18, minute=0, second=0).strftime("%Y%m%d%H%M%S"),
                    "end": date.replace(hour=19, minute=0, second=0).strftime("%Y%m%d%H%M%S"),
                    "description": "Evening news broadcast"
                },
                {
                    "title": "Prime Time",
                    "start": date.replace(hour=20, minute=0, second=0).strftime("%Y%m%d%H%M%S"),
                    "end": date.replace(hour=23, minute=0, second=0).strftime("%Y%m%d%H%M%S"),
                    "description": "Prime time entertainment"
                }
            ]
            
            epg[channel_id].extend(programs)
    
    return epg

def parse_m3u_playlist(content):
    """Parse M3U playlist content"""
    channels = []
    lines = content.strip().split('\n')
    
    current_channel = None
    
    for line in lines:
        line = line.strip()
        
        if line.startswith('#EXTINF:'):
            # Parse channel info
            match = re.search(r'(-?\d+)\s*,?\s*(.+?)(?:\s*-\s*(.+))?$', line.replace('#EXTINF:', ''))
            if match:
                tvg_id = ""
                tvg_name = ""
                tvg_logo = ""
                group_title = ""
                stream_url = ""
                
                # Extract attributes
                attr_match = re.findall(r'([a-zA-Z-]+)="([^"]*)"', line)
                for attr in attr_match:
                    if attr[0] == 'tvg-id':
                        tvg_id = attr[1]
                    elif attr[0] == 'tvg-name':
                        tvg_name = attr[1]
                    elif attr[0] == 'tvg-logo':
                        tvg_logo = attr[1]
                    elif attr[0] == 'group-title':
                        group_title = attr[1]
                
                # Extract channel name
                name_match = re.search(r',(.+)$', line)
                if name_match:
                    name = name_match.group(1).strip()
                else:
                    name = "Unknown Channel"
                
                current_channel = {
                    "name": name,
                    "logo": tvg_logo,
                    "category": group_title if group_title else "Uncategorized",
                    "epg_id": tvg_id if tvg_id else name.lower().replace(" ", "_"),
                    "stream_url": ""
                }
                
        elif line and not line.startswith('#'):
            # This is the stream URL
            if current_channel:
                current_channel["stream_url"] = line
                channels.append(current_channel)
                current_channel = None
    
    return channels

@app.route('/')
def index():
    """Serve the main HTML page"""
    return send_file('templates/index.html')

@app.route('/api/channels')
def get_channels():
    """Get all channels"""
    return jsonify(SAMPLE_CHANNELS)

@app.route('/api/channels/<channel_name>')
def get_channel(channel_name):
    """Get a specific channel"""
    for channel in SAMPLE_CHANNELS:
        if channel['name'].lower() == channel_name.lower():
            return jsonify(channel)
    return jsonify({"error": "Channel not found"}), 404

@app.route('/api/epg')
def get_epg():
    """Get EPG data"""
    epg_data = generate_epg_data()
    return jsonify(epg_data)

@app.route('/api/epg/<channel_id>')
def get_channel_epg(channel_id):
    """Get EPG for a specific channel"""
    epg_data = generate_epg_data()
    if channel_id in epg_data:
        return jsonify(epg_data[channel_id])
    return jsonify([])

@app.route('/api/categories')
def get_categories():
    """Get all categories"""
    categories = list(set(channel['category'] for channel in SAMPLE_CHANNELS))
    return jsonify(categories)

@app.route('/api/playlist')
def get_playlist():
    """Generate and return M3U playlist"""
    playlist = "#EXTM3U\n"
    
    for channel in SAMPLE_CHANNELS:
        playlist += f'#EXTINF:-1 tvg-id="{channel["epg_id"]}" tvg-name="{channel["name"]}" tvg-logo="{channel["logo"]}" group-title="{channel["category"]}",{channel["name"]}\n'
        playlist += f'{channel["stream_url"]}\n'
    
    return Response(playlist, mimetype='text/plain')

@app.route('/api/upload_playlist', methods=['POST'])
def upload_playlist():
    """Upload and parse M3U playlist"""
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400
    
    if file:
        content = file.read().decode('utf-8')
        channels = parse_m3u_playlist(content)
        
        if channels:
            # Add new channels to existing ones
            SAMPLE_CHANNELS.clear()
            SAMPLE_CHANNELS.extend(channels)
            return jsonify({"success": True, "channels": channels})
        else:
            return jsonify({"error": "No valid channels found in playlist"}), 400

@app.route('/static/<path:filename>')
def serve_static(filename):
    """Serve static files"""
    return send_file(f'static/{filename}')

if __name__ == '__main__':
    # Create necessary directories
    os.makedirs('templates', exist_ok=True)
    os.makedirs('static', exist_ok=True)
    
    # Run the application
    print("Starting IPTV Server...")
    print("Open http://localhost:5000 in your browser")
    app.run(host='0.0.0.0', port=5000, debug=True)
