from typing import Annotated, Literal
from pydantic import BaseModel, ConfigDict, Field, TypeAdapter

# Client -> Server
class HitMsg(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type: Literal["hit"]

class StandMsg(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type: Literal["stand"]

class ScoreUpdateMsg(BaseModel):
    model_config = ConfigDict(extra="ignore")
    type: Literal["score_update"]
    username: str
    result: Literal["win", "loss", "tie"]
    chips_delta: int = 0

ClientMessage = Annotated[HitMsg | StandMsg | ScoreUpdateMsg, Field(discriminator="type")]
client_message_adapter = TypeAdapter(ClientMessage)


# Server -> Client
class ConnectedMsg(BaseModel):
    type: Literal["connected"] = "connected"
    username: str

class WaitingMsg(BaseModel):
    type: Literal["waiting"] = "waiting"

class GameStateMsg(BaseModel):
    type: Literal["game_state"] = "game_state"
    state: dict

class ErrorMsg(BaseModel):
    type: Literal["error"] = "error"
    code: str
    message: str

class LobbyStateMsg(BaseModel):
    type: str = "lobby_state"
    online_users: list[str]
    active_games: int = 0

class ChipsUpdatedMsg(BaseModel):
    type: Literal["chips_updated"] = "chips_updated"
    chips: int
    delta: int = 0

class InviteMsg(BaseModel):
    """Payload para enviar una invitación de partida."""
    type: str = "invite"
    sender: str
    target: str

class InviteResponseMsg(BaseModel):
    """Payload para responder a una invitación recibida."""
    type: str = "invite_response"
    sender: str
    target: str
    accepted: bool