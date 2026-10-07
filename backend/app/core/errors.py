class GameError(Exception):

    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code        # for the frontend. Example: "NOT_YOUR_TURN"
        self.message = message  # for users