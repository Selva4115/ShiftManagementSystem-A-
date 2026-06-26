import os
import sys
import re
import subprocess
import time
import socket

# Enable ANSI colors on Windows Command Prompt
os.system('')

COLOR_GREEN = "\033[92m"
COLOR_YELLOW = "\033[93m"
COLOR_RED = "\033[91m"
COLOR_CYAN = "\033[96m"
COLOR_RESET = "\033[0m"
COLOR_BOLD = "\033[1m"

def log_info(msg):
    print(f"{COLOR_CYAN}[INFO]{COLOR_RESET} {msg}")

def log_success(msg):
    print(f"{COLOR_GREEN}[SUCCESS]{COLOR_RESET} {msg}")

def log_warn(msg):
    print(f"{COLOR_YELLOW}[WARN]{COLOR_RESET} {msg}")

def log_err(msg):
    print(f"{COLOR_RED}[ERROR]{COLOR_RESET} {msg}")

def check_ssh_key():
    ssh_dir = os.path.expanduser("~/.ssh")
    key_path = os.path.join(ssh_dir, "id_rsa")
    if not os.path.exists(key_path):
        log_warn("No SSH key pair found. Generating one automatically...")
        os.makedirs(ssh_dir, exist_ok=True)
        try:
            # Generate SSH key pair
            # -t rsa -b 2048 -N "" (empty passphrase) -f key_path
            subprocess.run([
                "ssh-keygen", "-t", "rsa", "-b", "2048", "-N", "", "-f", key_path
            ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            log_success(f"SSH Key generated successfully at: {key_path}")
        except Exception as e:
            log_err(f"Failed to generate SSH key automatically: {e}")
            log_info("Please ensure OpenSSH is installed or run 'ssh-keygen' manually in command prompt.")
    else:
        log_info(f"Existing SSH key found at: {key_path}")

def get_frontend_port():
    # Detect which port the Vite React frontend is currently running on
    for port in [3000, 3001, 3002]:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(0.5)
            if s.connect_ex(('localhost', port)) == 0:
                return port
    # Fallback to 3000 if none detected active yet
    return 3000

def run_tunnel():
    # Detect active port
    port = get_frontend_port()
    log_info(f"Detected active React frontend port: {COLOR_BOLD}{port}{COLOR_RESET}")

    # Open default web browser automatically to the client
    try:
        import webbrowser
        log_info(f"Opening web browser on http://localhost:{port}...")
        webbrowser.open(f"http://localhost:{port}")
    except Exception as e:
        log_warn(f"Failed to open web browser automatically: {e}")

    # Tunnel configurations: Pinggy (Port 443), Serveo (Port 22)
    tunnels = [
        {
            "name": "Pinggy (Port 443 - Firewall Bypass)",
            "cmd": ["ssh", "-tt", "-o", "StrictHostKeyChecking=no", "-p", "443", "-R", f"80:localhost:{port}", "free.pinggy.io"],
            "url_pattern": r"https://[a-zA-Z0-9.-]+\.pinggy\.link"
        },
        {
            "name": "Serveo (Port 22 - Fallback)",
            "cmd": ["ssh", "-o", "StrictHostKeyChecking=no", "-R", f"80:localhost:{port}", "serveo.net"],
            "url_pattern": r"https://[a-zA-Z0-9.-]+\.(?:serveo\.net|serveousercontent\.com)"
        }
    ]

    for tunnel in tunnels:
        name = tunnel["name"]
        cmd = tunnel["cmd"]
        pattern = tunnel["url_pattern"]

        log_info(f"Attempting to establish public sharing link via {COLOR_BOLD}{name}{COLOR_RESET}...")
        
        try:
            # We redirect stderr to stdout to capture everything
            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1
            )
            
            # Read output stream in real-time to find the URL
            url_found = None
            start_time = time.time()
            buffer = ""
            
            # We read character by character because Pinggy uses carriage returns (\r)
            # which would block if we read line by line.
            while True:
                # Check if process has terminated
                if process.poll() is not None:
                    log_warn(f"Tunnel process for {name} terminated with exit status {process.returncode}")
                    break
                
                # Check for timeout (e.g. 12 seconds to get a link)
                if time.time() - start_time > 12:
                    log_warn(f"Timeout waiting for public URL from {name}.")
                    process.terminate()
                    break

                # Read one character
                char = process.stdout.read(1)
                if not char:
                    time.sleep(0.1)
                    continue
                
                buffer += char
                if len(buffer) > 5000:
                    buffer = buffer[-2500:] # Keep buffer size reasonable
                
                # Search for URL in buffer
                match = re.search(pattern, buffer)
                if match:
                    url_found = match.group(0)
                    break
            
            if url_found:
                log_success(f"Public Sharing Link Generated successfully!")
                
                # Write to public_link.txt in root
                with open("public_link.txt", "w") as f:
                    f.write(url_found)
                
                # Display beautiful high-contrast banner
                print("\n" + "="*70)
                print(f" {COLOR_GREEN}{COLOR_BOLD}★ SHIFTFLOW PUBLIC ACCESS ONLINE ★{COLOR_RESET}")
                print("="*70)
                print(f" Local Web Access:    {COLOR_BOLD}http://localhost:{port}{COLOR_RESET}")
                print(f" Backend REST API:    {COLOR_BOLD}http://localhost:5000{COLOR_RESET}")
                print(f" Public Share Link:   {COLOR_GREEN}{COLOR_BOLD}{url_found}{COLOR_RESET}")
                print("-"*70)
                print(" Share the Public Link above with team members or open it on mobile.")
                print(" Note: The tunnel will stay active as long as this terminal is open.")
                print("="*70 + "\n")
                
                # Keep running and consuming output so the pipe doesn't fill up
                while True:
                    if process.poll() is not None:
                        log_warn("Public sharing connection lost. Retrying fallback...")
                        break
                    # Read output to prevent blocking
                    char = process.stdout.read(1)
                    if not char:
                        time.sleep(0.5)
            else:
                # Terminate and try next fallback
                process.terminate()
                process.wait()
                
        except Exception as e:
            log_err(f"Error running tunnel {name}: {e}")
            continue
            
    log_err("All secure sharing tunnel methods failed. Please check your internet connection or run manually.")
    # Keep the script running to let the user see the error
    try:
        while True:
            time.sleep(10)
    except KeyboardInterrupt:
        pass

if __name__ == "__main__":
    check_ssh_key()
    run_tunnel()
