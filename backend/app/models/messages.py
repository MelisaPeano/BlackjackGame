from typing import Annotated, Literal
from pydantic import BaseModel, ConfigDict, Field, TypeAdapter


# Client -> Server
class HitMsg(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type: Literal["hit"]


class StandMsg(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type: Literal["stand"]


ClientMessage = Annotated[HitMsg | StandMsg, Field(discriminator="type")]
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