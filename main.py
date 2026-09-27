import subprocess
import sys
import os
from dotenv import load_dotenv

# Configuration
INSTAGRAM_USERNAME = "irhs_official"
DISCORD_WEBHOOK = load_dotenv()

def monitor_instagram():
    """
    Runs the instawebhooks CLI to monitor an Instagram account 
    and send new posts to a Discord webhook.
    """
    print("Starting Instagram monitor...")
    
    # Install the package if it's not already installed
    try:
        import instawebhooks
    except ImportError:
        print("Installing instawebhooks...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "instawebhooks"])
        print("Installation complete.")

    # Build the command arguments
    # --interval: How often to check for new posts (in seconds). 
    #             86400 = 24 hours (daily check).
    # --session-file: Path to your Instagram session file (if monitoring a private account).
    #                 If monitoring a public account, you can omit this.
    cmd = [
        "instawebhooks",
        INSTAGRAM_USERNAME,
        DISCORD_WEBHOOK,
        "--interval", "86400"  # Check once per day
        # "--session-file", "session.json",  # Uncomment if monitoring a private account
    ]

    print(f"Running command: {' '.join(cmd)}")
    
    try:
        # Run the command
        subprocess.run(cmd, check=True)
        print("Monitor completed successfully.")
    except subprocess.CalledProcessError as e:
        print(f"Error running instawebhooks: {e}")
        raise e

if __name__ == "__main__":
    monitor_instagram()
