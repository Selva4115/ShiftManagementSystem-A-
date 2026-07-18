import os
import sys
import re
import subprocess
import time
import socket
import threading

os.system('')

COLOR_GREEN  = "\033[92m"
COLOR_YELLOW = "\033[93m"
COLOR_RED    = "\033[91m"
COLOR_CYAN   = "\033[96m"
COLOR_RESET  = "\033[0m"
COLOR_BOLD   = "\033[1m"

def log_info(msg):    print(f"{COLOR_CYAN}[INFO]{COLOR_RESET} {msg}")
def log_success(msg): print(f"{COLOR_GREEN}[SUCCESS]{COLOR_RESET} {msg}")
def log_warn(msg):    print(f"{COLOR_YELLOW}[WARN]{COLOR_RESET} {msg}")
def log_err(msg):     print(f"{COLOR_RED}[ERROR]{COLOR_RESET} {msg}")

def port_open(port, timeout=1):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(timeout)
        return s.connect_ex(('localhost', port)) == 0

def wait_for_port(port, label, max_wait=30):
    log_info(f"Waiting for {label} on port {port}...")
    for _ in range(max_wait):
        if port_open(port):
            log_success(f"{label} is ready on port {port}")
            return True
        time.sleep(1)
    log_warn(f"{label} did not start in time on port {port}")
    return False

def check_ssh_key():
    ssh_dir = os.path.expanduser("~/.ssh")
    key_path = os.path.join(ssh_dir, "id_rsa")
    if not os.path.exists(key_path):
        log_warn("No SSH key found. Generating one...")
        os.makedirs(ssh_dir, exist_ok=True)
        try:
            subprocess.run(["ssh-keygen", "-t", "rsa", "-b", "2048", "-N", "", "-f", key_path],
                           check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            log_success(f"SSH key generated at {key_path}")
        except Exception as e:
            log_err(f"Could not generate SSH key: {e}")
    else:
        log_info(f"SSH key found at {key_path}")

def tunnel_port(port, label, result_store, key):
    """Open a Serveo tunnel for a given port and store the URL."""
    tunnels = [
        {
            "name": "Pinggy",
            "cmd": ["ssh", "-tt", "-o", "StrictHostKeyChecking=no", "-p", "443",
                    "-R", f"80:localhost:{port}", "free.pinggy.io"],
            "pattern": r"https://[a-zA-Z0-9.-]+\.pinggy\.link"
        },
        {
            "name": "Serveo",
            "cmd": ["ssh", "-o", "StrictHostKeyChecking=no",
                    "-R", f"80:localhost:{port}", "serveo.net"],
            "pattern": r"https://[a-zA-Z0-9.-]+\.(?:serveo\.net|serveousercontent\.com)"
        }
    ]

    for t in tunnels:
        log_info(f"Tunneling {label} (port {port}) via {t['name']}...")
        try:
            proc = subprocess.Popen(
                t["cmd"],
                stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                text=True, bufsize=1, encoding='utf-8', errors='ignore'
            )
            buf = ""
            start = time.time()
            while True:
                if proc.poll() is not None:
                    break
                if time.time() - start > 20:
                    proc.terminate()
                    break
                ch = proc.stdout.read(1)
                if not ch:
                    time.sleep(0.05)
                    continue
                buf += ch
                if len(buf) > 5000:
                    buf = buf[-2500:]
                m = re.search(t["pattern"], buf)
                if m:
                    url = m.group(0)
                    result_store[key] = (url, proc)
                    log_success(f"{label} public URL: {COLOR_BOLD}{url}{COLOR_RESET}")
                    # Keep consuming so pipe doesn't block
                    def drain(p):
                        while p.poll() is None:
                            p.stdout.read(1)
                    threading.Thread(target=drain, args=(proc,), daemon=True).start()
                    return
            proc.terminate()
        except Exception as e:
            log_err(f"Tunnel error for {label}: {e}")
    log_err(f"All tunnels failed for {label} port {port}")

def run_tunnel():
    # Wait for both servers
    wait_for_port(5000, "Flask Backend")
    wait_for_port(3000, "Vite Frontend")

    results = {}

    # Tunnel both ports in parallel threads
    t1 = threading.Thread(target=tunnel_port, args=(3000, "Frontend", results, "frontend"), daemon=True)
    t2 = threading.Thread(target=tunnel_port, args=(5000, "Backend API", results, "backend"), daemon=True)
    t1.start()
    t2.start()
    t1.join(timeout=25)
    t2.join(timeout=25)

    frontend_url = results.get("frontend", (None,))[0]
    backend_url  = results.get("backend",  (None,))[0]

    if not frontend_url:
        log_err("Could not get a public URL for the frontend.")
        log_info("Try opening http://localhost:3000 locally.")
    else:
        # No need to patch the client file because we use a relative proxy (baseURL: '')
        # if backend_url:
        #     _patch_api_client(backend_url)

        # Save link
        with open("public_link.txt", "w") as f:
            f.write(frontend_url)

        print("\n" + "="*70)
        print(f" {COLOR_GREEN}{COLOR_BOLD}*  SHIFTFLOW PUBLIC ACCESS ONLINE  *{COLOR_RESET}")
        print("="*70)
        print(f"  Local Frontend :  {COLOR_BOLD}http://localhost:3000{COLOR_RESET}")
        print(f"  Local Backend  :  {COLOR_BOLD}http://localhost:5000{COLOR_RESET}")
        print(f"  Public Link    :  {COLOR_GREEN}{COLOR_BOLD}{frontend_url}{COLOR_RESET}")
        if backend_url:
            print(f"  Public API     :  {COLOR_CYAN}{backend_url}{COLOR_RESET}")
        print("-"*70)
        print("  Share the Public Link above with anyone on any device.")
        print("  Keep this terminal open to maintain the connection.")
        print("="*70 + "\n")

    # Keep alive
    try:
        while True:
            time.sleep(10)
    except KeyboardInterrupt:
        _restore_api_client()
        log_info("Sharing stopped. API client restored to local proxy.")

def _patch_api_client(backend_url):
    """Temporarily point the API client at the public backend URL."""
    client_path = os.path.join("app", "frontend", "src", "api", "client.js")
    try:
        with open(client_path, "r") as f:
            content = f.read()
        # Replace baseURL
        patched = re.sub(
            r"baseURL:\s*['\"].*?['\"]",
            f"baseURL: '{backend_url}'",
            content
        )
        with open(client_path, "w") as f:
            f.write(patched)
        log_success(f"API client patched to use: {backend_url}")
        # Save original for restore
        with open(".api_client_backup", "w") as f:
            f.write(content)
    except Exception as e:
        log_warn(f"Could not patch API client: {e}")

def _restore_api_client():
    """Restore original API client after sharing stops."""
    client_path = os.path.join("app", "frontend", "src", "api", "client.js")
    backup_path = ".api_client_backup"
    try:
        if os.path.exists(backup_path):
            with open(backup_path, "r") as f:
                content = f.read()
            with open(client_path, "w") as f:
                f.write(content)
            os.remove(backup_path)
            log_success("API client restored to original (localhost proxy).")
    except Exception as e:
        log_warn(f"Could not restore API client: {e}")

if __name__ == "__main__":
    check_ssh_key()
    run_tunnel()
