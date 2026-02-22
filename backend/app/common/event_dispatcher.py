from queue import Queue

class EventDispatcher:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls.active_queues = {}  # {session_id: Queue}
        return cls._instance

    def register_session(self, session_id: str, queue: Queue):
        print(f"Registering session_id: {session_id}, with queue: {queue}")
        self.active_queues[session_id] = queue

    def unregister_session(self, session_id: str):
        print(f"Unregistering session_id: {session_id}")
        self.active_queues.pop(session_id, None)

    def dispatch(self, session_id: str, data: any):
        print(f"Dispatching event to session_id: {session_id}")
        queue = self.active_queues.get(session_id)
        if queue:
            print(f"Found queue: {queue} for session_id: {session_id}")
            queue.put(data)

__all__ = ['EventDispatcher']