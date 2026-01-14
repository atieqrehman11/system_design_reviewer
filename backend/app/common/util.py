
def load_prompt(filename: str) -> str:
    path = f"prompts/{filename}" # Assuming you store them in a 'prompts' folder
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()
    
def log_task_metrics(output):
    try:
        # Extract only simple data types (strings, ints)
        agent_role = str(output.agent) 
        task_desc = output.description[:50]
        
        print(f"--- TASK COMPLETED ---")
        print(f"Task: {task_desc}...")
        print(f"Agent: {agent_role}")
        print(f"-----------------------")
    except Exception as e:
        # If printing fails, don't crash the whole Crew!
        print(f"Logging error: {e}")

def audit_logging_callback(output):
    log_task_metrics(output)
    if not output.raw:
        print("Architect skipped: No audit data received.")
