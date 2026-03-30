import os
import sys
from scripts.taskade_client import TaskadeClient
from dotenv import load_dotenv

load_dotenv()

def get_tasks_from_file(filepath):
    """Simple parser for task.md style checkboxes."""
    tasks = []
    if not os.path.exists(filepath): return tasks
    with open(filepath, 'r') as f:
        for line in f:
            line = line.strip()
            if line.startswith("- [ ]") or line.startswith("- [/]"):
                tasks.append(line.replace("- [ ]", "").replace("- [/]", "").strip())
    return tasks

def sync_memory_bank():
    token = os.getenv("TASKADE_TOKEN")
    if not token:
        print(">>> Taskade Integration Pending: TOKEN_MISSING")
        return

    client = TaskadeClient(token)
    print(">>> Connecting to Taskade...")
    
    workspaces = client.get_workspaces()
    if not workspaces:
        print(">>> Error: No workspaces found or invalid token.")
        return
    
    # Target the first workspace for simplicity
    ws = workspaces[0]
    ws_id = ws['id']
    name = ws['name']
    print(f">>> Target Workspace: {name} ({ws_id})")

    # Get folders (Taskade projects are often in the default folder)
    # The API often requires a folder/project structure.
    # For now, let's create a new project called "Skaidrus Seimas v.2"
    
    import psycopg2 # For live stats
    
    task_file = "/home/julio/.gemini/antigravity/brain/b8a0f98c-0bb3-477d-a302-4ef9fc9676a5/task.md"
    pending_tasks = get_tasks_from_file(task_file)
    
    # === DATA FETCHING ===
    db_dsn = os.getenv("DB_DSN")
    mp_count, vote_count = 0, 0
    controversy, rich_mps, top_attendance = [], [], []
    total_active_votes = 0

    if db_dsn:
        try:
            conn = psycopg2.connect(db_dsn)
            cur = conn.cursor()
            
            # Stats
            cur.execute("SELECT COUNT(*) FROM politicians")
            mp_count = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM votes")
            vote_count = cur.fetchone()[0]
            
            # Top Attendance
            cur.execute("""
                SELECT p.display_name, ROUND(CAST(COUNT(CASE WHEN mv.vote_choice != 'Nedalyvavo' THEN 1 END) AS NUMERIC) / COUNT(mv.id) * 100, 1) as pct
                FROM politicians p JOIN mp_votes mv ON p.id = mv.politician_id
                GROUP BY p.id, p.display_name HAVING COUNT(mv.id) > 50
                ORDER BY pct DESC LIMIT 3
            """)
            top_attendance = cur.fetchall()
            
            # Participation
            cur.execute("SELECT COUNT(*) FROM mp_votes WHERE vote_choice IN ('Už', 'Prieš')")
            total_active_votes = cur.fetchone()[0]
            
            # Controversy
            cur.execute("""
                SELECT title, sitting_date, uz_count, pries_count, ABS(uz_count - pries_count) as margin
                FROM (
                    SELECT v.seimas_vote_id, v.title, v.sitting_date,
                    COUNT(CASE WHEN mv.vote_choice = 'Už' THEN 1 END) as uz_count,
                    COUNT(CASE WHEN mv.vote_choice = 'Prieš' THEN 1 END) as pries_count
                    FROM votes v JOIN mp_votes mv ON v.seimas_vote_id = mv.vote_id
                    GROUP BY v.seimas_vote_id, v.title, v.sitting_date
                ) sub WHERE uz_count > 10 AND pries_count > 10
                ORDER BY margin ASC, sitting_date DESC LIMIT 3
            """)
            controversy = cur.fetchall()
            
            # Wealth
            cur.execute("""
                SELECT p.display_name, a.securities_art_jewelry_eur
                FROM politicians p JOIN mp_assets a ON p.id = a.politician_id
                WHERE a.year = 2023 AND a.securities_art_jewelry_eur > 100000
                ORDER BY a.securities_art_jewelry_eur DESC LIMIT 3
            """)
            rich_mps = cur.fetchall()
            
            cur.close()
            conn.close()
        except Exception as e:
            print(f">>> Data Fetch Error: {e}")

    # === MIND MAP GENERATION (Hierarchical) ===
    content = "# 🧠 Seimas v.2 Mind Map (Season 2)\n\n"
    
    # Node 1: System Vitality
    content += "## 📊 System Pulse & Vitality\n"
    content += f"  - **Scale**: {mp_count} MPs / {vote_count:,} Votes\n"
    content += "  - **Health**: Orchestra Live 🎼\n"
    content += "  - **Sync**: Taskade Season 2 Active\n\n"
    
    # Node 2: Legislative Drama (The Brain)
    content += "## ⚖️ Legislative Drama (Hot Spots)\n"
    if controversy:
        for title, date, uz, ps, margin in controversy:
            title_clean = title.strip() or "[Unnamed Vote]"
            content += f"  - **{title_clean[:50]}...** (Margin: {margin})\n"
            # Link High Stake MPs to these votes in the mind map
            content += "    - **🚨 Conflict Watch**\n"
            for name, amount in rich_mps:
                content += f"      - {name} ({amount:,.0f} € stake)\n"
    else:
        content += "  - *Scan in progress...*\n\n"
    
    # Node 3: MP Intelligence
    content += "## 🕵️ MP Performance Intelligence\n"
    content += "  - **Attendance Leaders**\n"
    for name, pct in top_attendance:
        content += f"    - {name}: {pct}%\n"
    content += f"  - **Participation**: {total_active_votes:,} active votes documented\n\n"
    
    # Node 4: Strategic Roadmap
    content += "## 🚀 Strategic Roadmap\n"
    for t in pending_tasks:
        content += f"  - {t}\n"
    
    # Node 5: Intelligence Source
    content += "\n---\n*Generated by the Seimas v.2 Conductor*"
    
    print(f">>> Syncing {len(pending_tasks)} pending tasks...")
    
    # We need a folder_id. Usually 'default' or we find the first folder.
    # Note: Taskade API v1 might require specific folder IDs. 
    # Let's try to get folders.
    response = requests.get(f"{client.base_url}/workspaces/{ws_id}/folders", headers=client.headers)
    folders = response.json().get("items", [])
    if not folders:
        print(">>> No folders found in workspace.")
        return
    
    project_title = "Skaidrus Seimas v.2"
    target_project_id = None
    target_folder_id = None

    print(f">>> Searching for existing project '{project_title}' across all folders...")
    for folder in folders:
        folder_id = folder['id']
        folder_name = folder.get('name')
        existing_projects = client.get_projects(folder_id)
        print(f"  - Folder [{folder_name}]: {len(existing_projects)} projects found.")
        for p in existing_projects:
            p_title = p.get('title') or p.get('name')
            p_id = p.get('id')
            
            # FORCE MATCH for debugging
            if p_id == 'e4Ep8ghQro7PTJxm':
                target_project_id = p_id
                target_folder_id = folder_id
                print(f"    - DEBUG Match: '{p_title}' (ID: {p_id})")
                break
        if target_project_id: break

    if target_project_id:
        print(f">>> SUCCESS: Found project '{target_project_id}'. Syncing content via Blocks/Tasks...")
        blocks = client.get_blocks(target_project_id)
        if blocks:
             print(f">>> Found {len(blocks)} blocks in project.")
             # print(f">>> First block debug: {blocks[0]}")
             # A block acts as a container. Let's see if we can update the first block directly or its tasks.
             tasks = client.get_tasks(target_project_id)
             if tasks:
                  main_task_id = tasks[0]['id']
                  print(f">>> Updating main node (Task ID: {main_task_id})")
                  result = client.update_task(target_project_id, main_task_id, content)
                  project = {'item': {'id': target_project_id}} if result else None
             else:
                  print(">>> No tasks found. Creating new project as fallback.")
                  project = client.create_project(target_folder_id, project_title, content)
        else:
             print(">>> No blocks found. Creating new project as fallback.")
             project = client.create_project(target_folder_id, project_title, content)
    else:
        # Default to first folder if not found
        target_folder_id = folders[0]['id']
        print(f">>> Node not found. Creating NEW project in '{folders[0].get('name')}'...")
        project = client.create_project(target_folder_id, project_title, content)
    
    if project and 'item' in project:
        print(f">>> SUCCESS: Project synced to Taskade!")
        print(f">>> Link: https://www.taskade.com/p/{project['item']['id']}")
    else:
        print(f">>> Sync failed or unexpected response: {project}")

if __name__ == "__main__":
    import requests # Ensure requests is available for the folder fetch
    sync_memory_bank()
