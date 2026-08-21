"""Pydantic response models for the v2 heroes API."""
from pydantic import BaseModel, ConfigDict, Field
from typing import List, Dict, Optional, Any


class HeroMpResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    name: str
    party: Optional[str] = None
    photo: Optional[str] = None
    active: Optional[bool] = None
    seimas_id: Optional[int] = None
    # Declared explicitly because model_config sets extra="ignore": a field the
    # engine returns but the model does not name is dropped from the response
    # silently, with no error anywhere. These let a former member's profile say
    # when they served rather than only that they are inactive.
    mandate_start_date: Optional[str] = None
    mandate_end_date: Optional[str] = None


class HeroDimensionsResponse(BaseModel):
    """The three dimensions computed from maxima across the chamber.

    Named for what they measure. They were STR / WIS / CHA / INT / STA — an
    RPG stat block, with INT holding the composite verdict and STA a second
    aggregation nothing rendered. `extra="ignore"` on the profile means a
    field removed here silently stops being served, which is the intent.
    """

    legislative_activity: float
    experience: float
    visibility: float


class HeroProfileResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    mp: HeroMpResponse
    dimensions: HeroDimensionsResponse
    metrics: Dict[str, Any] = Field(default_factory=dict)
    metrics_provenance: Dict[str, str] = Field(default_factory=dict)
    forensic_breakdown: Dict[str, Any] = Field(default_factory=dict)


class HeroSearchResponse(BaseModel):
    query: str
    total: int
    results: List[HeroProfileResponse]

