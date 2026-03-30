# DEPRECATED: This script is superseded by the OpenPlanter agentic pipeline.
# See .openplanter/prompts/seimas_pipeline.md for the current orchestration logic.
# This file is retained for local debugging and fallback use.

import subprocess
import sys
import time
import os
import logging

# Configure Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger("ORCHESTRA")

STEPS = [
    # (Display Name, Script Filename, Is_Critical)
    ("1. Ingest MPs", "ingest_seimas.py", True),
    ("2. Link VRK Identity", "link_vrk.py", True),
    ("3. Ingest Votes (Term 10)", "ingest_votes_v2.py", True),
    ("4. Sync Law Metadata", "ingest_legislation.py", False),
    ("5. Repair Regex Errors", "repair_project_ids.py", False),
    ("6. Ingest MP Assets", "ingest_assets.py", False)
]

def main():
    logger.info("=== STARTING TRANSPARENCY PIPELINE ===")
    total_start = time.time()
    
    pipeline_failed = False
    
    for name, script, critical in STEPS:
        if not os.path.exists(script):
            logger.error(f"Missing script: {script}")
            if critical: sys.exit(1)
            continue
            
        logger.info(f">>> Running: {name}...")
        step_start = time.time()
        
        try:
            # Run the script and wait for it to finish
            subprocess.run([sys.executable, script], check=True)
            duration = time.time() - step_start
            logger.info(f"[OK] {name} completed in {duration:.2f}s")
            
        except subprocess.CalledProcessError as e:
            logger.error(f"[FAIL] {name} encountered an error: {e}")
            if critical:
                logger.critical("!!! Critical Failure. Pipeline Aborted. !!!")
                sys.exit(1)
            else:
                logger.warning("...Warning: Non-critical step failed. Continuing.")
                pipeline_failed = True

    total_duration = time.time() - total_start
    logger.info(f"=== CHECKPOINT REACHED in {total_duration:.2f}s ===")
    
    # Automated Planner Sync
    logger.info(">>> Finalizing Session: Syncing with Taskade...")
    try:
        subprocess.run([sys.executable, "sync_planner.py"], check=True)
    except subprocess.CalledProcessError:
        logger.warning("Taskade sync failed. Check API status.")

    logger.info("=== THE ORCHESTRA HAS FINISHED ITS PERFORMANCE ===")
    
    if pipeline_failed:
        logger.warning("Pipeline finished with non-critical warnings.")
    else:
        logger.info("System is fully synchronized.")

if __name__ == "__main__":
    main()
