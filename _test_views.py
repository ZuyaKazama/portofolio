import subprocess, time, http.server, threading, os

os.chdir('/home/zuya/Documents/Portofolio')

# Start server
server = http.server.HTTPServer(('127.0.0.1', 8777), http.server.SimpleHTTPRequestHandler)
t = threading.Thread(target=server.serve_forever, daemon=True)
t.start()
time.sleep(1)

SCRATCH = '/home/zuya/.gemini/antigravity-ide/brain/434c5936-2bc1-4e27-ab4d-81c5d711a53b/scratch'

views = ['viewProjects', 'viewSkills', 'viewAbout', 'viewContact']

for view in views:
    # Use --run-all-compositor-stages-before-draw to ensure rendering
    subprocess.run([
        'google-chrome', '--headless=new',
        f'--screenshot={SCRATCH}/fix_{view}.png',
        '--window-size=1440,900',
        '--virtual-time-budget=5000',
        f'http://127.0.0.1:8777/index.html#{view}'
    ], capture_output=True, timeout=15)
    time.sleep(1)
    print(f'{view} done')

server.shutdown()
print('All done')
