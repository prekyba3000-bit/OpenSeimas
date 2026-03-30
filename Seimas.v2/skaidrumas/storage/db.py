"""
storage/db.py

SQLAlchemy models for the Skaidrumas database.

Design principle: everything is append-only. We never UPDATE or DELETE rows —
we INSERT new snapshots with timestamps. This is what gives us the historical
depth that official sources don't have. A VMI debtor list entry from 2023 is
still in our DB even if the company paid up in 2024. That delta is the story.
"""

from datetime import datetime
from sqlalchemy import (
    create_engine, Column, Integer, String, Float, Date,
    DateTime, Boolean, Text, ForeignKey, Index, UniqueConstraint
)
from sqlalchemy.orm import DeclarativeBase, relationship, Session
from sqlalchemy.dialects.postgresql import JSONB
import os


DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://skaidrumas:skaidrumas@localhost/skaidrumas")
engine = create_engine(DATABASE_URL, echo=False)


class Base(DeclarativeBase):
    pass


# ─────────────────────────────────────────────
# SEIMAS ENTITIES
# ─────────────────────────────────────────────

class MP(Base):
    """
    One row per Seimas member per parliamentary term.
    We allow multiple rows for the same person across terms —
    their committee memberships and party affiliations change.
    """
    __tablename__ = "mps"

    id = Column(Integer, primary_key=True)
    seimas_id = Column(String, nullable=False)          # Internal Seimas system ID
    term = Column(Integer, nullable=False)              # Parliamentary term (e.g. 2020, 2024)
    first_name = Column(String)
    last_name = Column(String)
    full_name = Column(String, index=True)
    party = Column(String)
    fraction = Column(String)                           # Parliamentary fraction (can differ from party)
    committees = Column(JSONB)                          # List of committee memberships
    email = Column(String)
    phone = Column(String)
    fetched_at = Column(DateTime, default=datetime.utcnow)

    votes = relationship("Vote", back_populates="mp")
    declarations = relationship(
        "WealthDeclaration",
        back_populates="mp",
        foreign_keys="WealthDeclaration.mp_id",
    )
    business_links = relationship("BusinessLink", back_populates="mp")

    __table_args__ = (
        UniqueConstraint("seimas_id", "term", name="uq_mp_term"),
        Index("ix_mp_fullname", "full_name"),
    )


class Vote(Base):
    """
    One row per MP per bill vote.
    The 'conflict_flagged' column is set by our analysis engine AFTER ingestion —
    it's True when we detect a business link between the MP and the affected sector.
    """
    __tablename__ = "votes"

    id = Column(Integer, primary_key=True)
    mp_id = Column(Integer, ForeignKey("mps.id"))
    bill_id = Column(String, index=True)                # Seimas internal project ID
    bill_title = Column(Text)
    bill_number = Column(String)                        # e.g. XIV-2891
    vote_result = Column(String)                        # "for", "against", "abstain", "absent"
    voted_at = Column(DateTime, index=True)
    session_type = Column(String)                       # "plenary", "committee", "urgent"
    is_night_vote = Column(Boolean, default=False)      # True if voted after 22:00
    amendment_lead_time_minutes = Column(Integer)       # Minutes between amendment submission and vote
    affected_sectors = Column(JSONB)                    # Detected sectors from bill text analysis
    conflict_flagged = Column(Boolean, default=False)
    conflict_reason = Column(Text)
    fetched_at = Column(DateTime, default=datetime.utcnow)

    mp = relationship("MP", back_populates="votes")


class Amendment(Base):
    """
    Tracks amendments separately from votes — an amendment can be proposed
    by someone who isn't the bill's main sponsor, and the lag between
    submission and vote is itself a signal of transparency.
    """
    __tablename__ = "amendments"

    id = Column(Integer, primary_key=True)
    amendment_id = Column(String, unique=True)
    bill_id = Column(String, index=True)
    proposer_mp_id = Column(Integer, ForeignKey("mps.id"))
    proposed_at = Column(DateTime)
    voted_at = Column(DateTime)
    lead_time_minutes = Column(Integer)                 # Computed: voted_at - proposed_at
    amendment_text = Column(Text)
    result = Column(String)
    conflict_flagged = Column(Boolean, default=False)
    fetched_at = Column(DateTime, default=datetime.utcnow)


class Attendance(Base):
    """
    Per-session attendance records. Per diem is paid per session attended —
    cross-referencing this with declared income lets us spot MPs claiming
    attendance they didn't actually show up for.
    """
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True)
    mp_id = Column(Integer, ForeignKey("mps.id"))
    session_id = Column(String)
    session_date = Column(Date, index=True)
    attended = Column(Boolean)
    per_diem_eligible = Column(Boolean)
    fetched_at = Column(DateTime, default=datetime.utcnow)


# ─────────────────────────────────────────────
# FINANCIAL / WEALTH ENTITIES
# ─────────────────────────────────────────────

class WealthDeclaration(Base):
    """
    Annual wealth declarations from VMI + VRK.
    Each year produces a new row — the DELTA between years is computed
    by the analysis engine and stored in the 'year_over_year_delta' column.
    """
    __tablename__ = "wealth_declarations"

    id = Column(Integer, primary_key=True)
    mp_id = Column(Integer, ForeignKey("mps.id"), nullable=True)  # nullable: covers all residents
    declarant_name = Column(String, index=True)
    declarant_type = Column(String)                     # "mp", "candidate", "official", "family"
    related_mp_id = Column(Integer, ForeignKey("mps.id"), nullable=True)
    declaration_year = Column(Integer, index=True)
    source = Column(String)                             # "vmi" or "vrk"

    # Asset categories as declared
    real_estate_count = Column(Integer)
    real_estate_value = Column(Float)                   # Declared value in EUR
    vehicles_count = Column(Integer)
    vehicles_value = Column(Float)
    financial_assets = Column(Float)                    # Savings, investments, stocks
    business_stakes_value = Column(Float)
    total_declared_assets = Column(Float)

    # Income
    declared_income = Column(Float)
    salary_from_seimas = Column(Float)                  # Cross-filled from Seimas salary data

    # Computed fields (filled by analysis engine)
    implied_max_accumulation = Column(Float)            # Sum of all career public salaries
    unexplained_delta = Column(Float)                   # total_assets - implied_max_accumulation
    year_over_year_delta = Column(Float)                # Change in total assets from prior year

    raw_data = Column(JSONB)                            # Full original XML/JSON for audit trail
    fetched_at = Column(DateTime, default=datetime.utcnow)

    mp = relationship("MP", back_populates="declarations", foreign_keys=[mp_id])


class TaxDebtor(Base):
    """
    This table is the foundation of the daily diff engine.
    Every day's VMI debtor list produces new rows with today's snapshot_date.
    We NEVER delete old rows. A company that paid up will have rows where
    'present_in_snapshot' = True for old dates and False for new ones.
    """
    __tablename__ = "tax_debtors"

    id = Column(Integer, primary_key=True)
    snapshot_date = Column(Date, index=True)            # The date of the VMI file we pulled
    entity_code = Column(String, index=True)            # Juridinio asmens kodas
    entity_name = Column(String)
    debt_amount = Column(Float)
    debt_type = Column(String)
    enforcement_type = Column(String)                   # Type of enforcement action
    present_in_snapshot = Column(Boolean, default=True)
    fetched_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("ix_debtor_entity_date", "entity_code", "snapshot_date"),
    )


class SubsidyRecord(Base):
    """NMA agricultural and business subsidy payments."""
    __tablename__ = "subsidy_records"

    id = Column(Integer, primary_key=True)
    year = Column(Integer, index=True)
    recipient_name = Column(String, index=True)
    recipient_code = Column(String, index=True)
    amount = Column(Float)
    program = Column(String)
    measure = Column(String)
    municipality = Column(String)
    fetched_at = Column(DateTime, default=datetime.utcnow)


# ─────────────────────────────────────────────
# CORPORATE REGISTRY ENTITIES
# ─────────────────────────────────────────────

class LegalEntity(Base):
    """
    Daily snapshot from Registrų Centras bulk export.
    Again — append only. A company that was dissolved yesterday still exists
    in rows with snapshot_date before dissolution.
    """
    __tablename__ = "legal_entities"

    id = Column(Integer, primary_key=True)
    snapshot_date = Column(Date, index=True)
    entity_code = Column(String, index=True)
    entity_name = Column(String, index=True)
    legal_form = Column(String)
    status = Column(String)                             # "active", "bankrupt", "liquidating", etc.
    registered_at = Column(Date)
    address = Column(String)
    municipality = Column(String)
    main_activity_code = Column(String)                 # NACE economic activity code
    main_activity_desc = Column(String)
    authorized_capital = Column(Float)
    fetched_at = Column(DateTime, default=datetime.utcnow)


class BusinessLink(Base):
    """
    Connects MPs (and their declared family members) to companies.
    Sources: Registrų Centras director/board data + VRK/VMI declarations.
    The 'link_type' captures whether this is a direct directorship,
    shareholder stake, or family member connection.
    """
    __tablename__ = "business_links"

    id = Column(Integer, primary_key=True)
    mp_id = Column(Integer, ForeignKey("mps.id"))
    entity_code = Column(String, index=True)
    entity_name = Column(String)
    link_type = Column(String)          # "director", "board_member", "shareholder", "family_director", "family_shareholder"
    linked_person_name = Column(String) # If family member, their name
    relationship_to_mp = Column(String) # "spouse", "child", "parent", "self"
    effective_from = Column(Date)
    effective_to = Column(Date)         # Null if still active
    nace_code = Column(String)          # Economic sector of the company
    source = Column(String)             # "registru_centras", "vrk_declaration", "vmi_declaration"
    snapshot_date = Column(Date)
    fetched_at = Column(DateTime, default=datetime.utcnow)

    mp = relationship("MP", back_populates="business_links")


# ─────────────────────────────────────────────
# PROCUREMENT
# ─────────────────────────────────────────────

class ProcurementAward(Base):
    """
    Public procurement contract awards from CVP IS (data.gov.lt).
    The cross-reference between this table and BusinessLinks is one of
    the core conflict detection queries.
    """
    __tablename__ = "procurement_awards"

    id = Column(Integer, primary_key=True)
    contract_id = Column(String, unique=True)
    contracting_authority = Column(String, index=True)  # Which ministry/municipality
    contracting_authority_code = Column(String)
    supplier_name = Column(String, index=True)
    supplier_code = Column(String, index=True)
    contract_value = Column(Float)
    contract_date = Column(Date, index=True)
    procedure_type = Column(String)
    subject = Column(String)
    nace_code = Column(String)
    fetched_at = Column(DateTime, default=datetime.utcnow)


# ─────────────────────────────────────────────
# ELECTORAL / CAMPAIGN FINANCE
# ─────────────────────────────────────────────

class CampaignDonation(Base):
    """
    Political campaign donations from VRK.
    Connecting donors to companies and companies to MPs is the
    campaign finance trail.
    """
    __tablename__ = "campaign_donations"

    id = Column(Integer, primary_key=True)
    election_year = Column(Integer, index=True)
    recipient_party = Column(String, index=True)
    recipient_candidate = Column(String, index=True)
    donor_name = Column(String, index=True)
    donor_type = Column(String)                         # "individual", "company", "party"
    donor_code = Column(String)                         # Person ID or company code
    amount = Column(Float)
    donation_date = Column(Date)
    fetched_at = Column(DateTime, default=datetime.utcnow)


# ─────────────────────────────────────────────
# ALERTS
# ─────────────────────────────────────────────

class ConflictAlert(Base):
    """
    Every time the analysis engine detects something, it writes here.
    This is what drives the live ticker on the frontend.
    """
    __tablename__ = "conflict_alerts"

    id = Column(Integer, primary_key=True)
    alert_type = Column(String, index=True)     # "vote_conflict", "wealth_anomaly", "nocturnal_amendment",
                                                #  "new_company", "procurement_link", "family_link"
    severity = Column(String)                   # "high", "medium", "low"
    mp_id = Column(Integer, ForeignKey("mps.id"), nullable=True)
    mp_name = Column(String)
    entity_code = Column(String, nullable=True)
    entity_name = Column(String, nullable=True)
    description = Column(Text)
    evidence = Column(JSONB)                    # Full structured evidence for the alert
    source_tables = Column(JSONB)               # Which tables + row IDs produced this alert
    detected_at = Column(DateTime, default=datetime.utcnow, index=True)
    published = Column(Boolean, default=False)


# ─────────────────────────────────────────────
# FORENSIC ENGINE TABLES
# ─────────────────────────────────────────────

class AmendmentProfile(Base):
    """Engine 01: Temporal fingerprint of each amendment — speed, complexity,
    and cluster membership for detecting externally-drafted text."""
    __tablename__ = "amendment_profiles"

    id = Column(Integer, primary_key=True)
    amendment_id = Column(String, ForeignKey("amendments.amendment_id"), unique=True)
    word_count = Column(Integer)
    legal_citation_count = Column(Integer)
    complexity_score = Column(Float)
    drafting_window_minutes = Column(Integer)
    speed_anomaly_zscore = Column(Float)
    cluster_id = Column(Integer)
    computed_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("ix_amp_speed", "speed_anomaly_zscore"),
    )


class BenfordAnalysis(Base):
    """Engine 02: Per-MP Benford's Law conformity test on wealth declarations."""
    __tablename__ = "benford_analyses"

    id = Column(Integer, primary_key=True)
    mp_id = Column(Integer, ForeignKey("mps.id"))
    sample_size = Column(Integer)
    chi_squared = Column(Float)
    p_value = Column(Float)
    mad = Column(Float)
    digit_distribution = Column(JSONB)
    conformity_label = Column(String)
    flagged_fields = Column(JSONB)
    computed_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("ix_benford_pvalue", "p_value"),
    )


class OwnershipEdge(Base):
    """Engine 04: Directed edge in the corporate ownership graph."""
    __tablename__ = "ownership_edges"

    id = Column(Integer, primary_key=True)
    source_entity_code = Column(String, index=True)
    target_entity_code = Column(String, index=True)
    edge_type = Column(String)
    person_name = Column(String)
    snapshot_date = Column(Date)

    __table_args__ = (
        Index("ix_ownership_source_target", "source_entity_code", "target_entity_code"),
    )


class IndirectLink(Base):
    """Engine 04: Multi-hop corporate chain linking an MP to a distant entity."""
    __tablename__ = "indirect_links"

    id = Column(Integer, primary_key=True)
    mp_id = Column(Integer, ForeignKey("mps.id"))
    target_entity_code = Column(String, index=True)
    target_entity_name = Column(String)
    hop_count = Column(Integer)
    path = Column(JSONB)
    has_procurement_hit = Column(Boolean, default=False)
    has_debtor_hit = Column(Boolean, default=False)
    detected_at = Column(DateTime, default=datetime.utcnow)


class VoteGeometry(Base):
    """Engine 05: Statistical impossibility detection for vote outcomes."""
    __tablename__ = "vote_geometry"

    id = Column(Integer, primary_key=True)
    vote_id = Column(Integer, index=True)
    expected_for = Column(Float)
    expected_against = Column(Float)
    expected_abstain = Column(Float)
    actual_for = Column(Integer)
    actual_against = Column(Integer)
    actual_abstain = Column(Integer)
    deviation_sigma = Column(Float)
    anomaly_type = Column(String)
    faction_deviations = Column(JSONB)
    computed_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("ix_vg_sigma", "deviation_sigma"),
    )


def init_db():
    Base.metadata.create_all(engine)


def get_session() -> Session:
    return Session(engine)
