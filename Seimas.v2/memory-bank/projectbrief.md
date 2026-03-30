# Project Brief: Seimas v.2 Transparency Project

## Overview
A data pipeline and monitoring platform for the Lithuanian Parliament (Seimas), aimed at increasing transparency through enhanced data ingestion, linking, and visualization. This is the "v.2" iteration, focusing on robust Python-based ingestion scripts and a clean database schema.

## Goals
- Ingest MP data from official Seimas APIs.
*   Link MP identities with VRK (Central Electoral Commission) data for deeper insights.
*   Scrape and process voting records (Term 10 and beyond).
*   Maintain a unified PostgreSQL database for all parliamentary data.
*   Provide a foundation for a transparency dashboard.

## Core Components
- **Ingestion Engine**: Python scripts for various data sources (Seimas, VRK, VMI).
*   **Orchestrator**: A management script to run the pipeline steps in order.
*   **Database**: PostgreSQL schema tracking politicians, votes, and assets.
