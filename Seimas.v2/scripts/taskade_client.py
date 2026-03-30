import os
import requests
import json

class TaskadeClient:
    def __init__(self, api_token=None):
        self.api_token = api_token or os.getenv("TASKADE_TOKEN")
        self.base_url = "https://www.taskade.com/api/v1"
        self.headers = {
            "Authorization": f"Bearer {self.api_token}",
            "Content-Type": "application/json"
        }

    def is_configured(self):
        return bool(self.api_token)

    def get_workspaces(self):
        if not self.is_configured(): return []
        response = requests.get(f"{self.base_url}/workspaces", headers=self.headers)
        if response.status_code == 200:
            items = response.json().get("items", [])
            if not items:
                print(f"DEBUG: No items in response. JSON: {response.json()}")
            return items
        else:
            print(f"DEBUG: Workspace fetch failed. Status: {response.status_code}, Response: {response.text}")
        return []

    def create_project(self, folder_id, title, content=""):
        if not self.is_configured(): return None
        payload = {
            "folderId": folder_id,
            "title": title,
            "content": content,
            "contentType": "text/markdown"
        }
        url = f"{self.base_url}/projects"
        response = requests.post(url, headers=self.headers, json=payload)
        if response.status_code in [200, 201]:
            return response.json()
        print(f"Error creating project: {response.text}")
        return None

    def get_projects(self, folder_id):
        if not self.is_configured(): return []
        url = f"{self.base_url}/folders/{folder_id}/projects"
        response = requests.get(url, headers=self.headers)
        if response.status_code == 200:
            return response.json().get("items", [])
        return []

    def get_tasks(self, project_id):
        if not self.is_configured(): return []
        url = f"{self.base_url}/projects/{project_id}/tasks"
        response = requests.get(url, headers=self.headers)
        if response.status_code == 200:
            return response.json().get("items", [])
        return []

    def get_blocks(self, project_id):
        if not self.is_configured(): return []
        url = f"{self.base_url}/projects/{project_id}/blocks"
        response = requests.get(url, headers=self.headers)
        if response.status_code == 200:
            return response.json().get("items", [])
        return []

    def update_task(self, project_id, task_id, content=""):
        if not self.is_configured(): return None
        payload = {
            "content": content,
            "contentType": "text/markdown"
        }
        url = f"{self.base_url}/projects/{project_id}/tasks/{task_id}"
        response = requests.put(url, headers=self.headers, json=payload)
        if response.status_code in [200, 201]:
            return response.json()
        print(f"Error updating task: {response.text}")
        return None

    def update_project(self, project_id, title, content=""):
        # This endpoint is reported 404 for metadata, but we might try a workaround if needed.
        # For now, we prefer updating tasks for content stability.
        return None

if __name__ == "__main__":
    client = TaskadeClient()
    if not client.is_configured():
        print("CRITICAL: TASKADE_TOKEN not set in environment.")
    else:
        print("Taskade Client initialized. Ready to sync.")
