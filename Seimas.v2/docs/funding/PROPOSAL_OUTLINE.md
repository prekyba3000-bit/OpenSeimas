# NGI Zero Commons Fund: Full Grant Narrative

## 1. Project Title & Vision
**Skaidrus Seimas** (Transparent Parliament) — A high-integrity, full-stack transparency platform designed to reclaim the public nature of Lithuanian parliamentary data.

## 2. Problem Statement: The Transparency Gap
The digital ecosystem in Lithuania faces a "market failure" in the accessibility of legislative data. While data exists, it is siloed within fragmented institutional portals using legacy formats. This prevents civic tech developers from building monitoring tools and inhibits citizens from holding their representatives accountable. Skaidrus Seimas serves as a corrective mechanism to deliver a "technology commons" for democratic oversight.

## 3. Project Objectives
- **Data Sovereignty**: Provide a fully open-source (FOSS) pipeline to ingest, normalize, and link parliamentary data from Seimas, VRK (Electoral Commission), and VMI (Tax Inspectorate).
- **Inclusivity (WCAG 2.1 AA)**: Ensure that transparency data is accessible to all citizens, including those with disabilities, through semantic HTML and screen-reader optimized data structures.
- **Robust Security**: Implement defense-in-depth measures (like XXE protection via `defusedxml`) and undergo independent security verification.

## 4. Technical Approach
The project employs a modular, "full-stack" architecture:
- **Ingestion Layer**: Hardened Python scripts using `defusedxml` and parameterized SQL.
- **Persistence Layer**: PostgreSQL with a specialized schema supporting multilingual accessibility metadata (JSONB).
- **API Layer**: A type-safe tRPC/Next.js interface for data consumption.

## 5. Work Packages & Budget Justification (Total: 50,000 EUR)

### WP1: Infrastructure & Data Hardening (15,000 EUR)
- **Objective**: Finalize and push the core ingestion engine to a "production-ready" state.
- **Justification**: This covers the heavy-lifting of data normalization and identity linking across Seimas and VRK. It includes the removal of hardcoded credentials and implementation of secure environment-based configurations.

### WP2: Accessibility Hardening (15,000 EUR)
- **Objective**: Implementation of WCAG 2.1 AA compliance across the entire user-facing stack.
- **Justification**: Per NGI0 mandates, scaling beyond the 50k threshold requires verified accessibility. This work package funds the development of multilingual alt-text management (JSONB) and high-contrast, keyboard-navigable UI components. It includes the technical effort to map rich-text bios to plain-text alternatives for screen readers.

### WP3: Security Review & Verification (10,000 EUR)
- **Objective**: Internal and external security hardening.
- **Justification**: Ensures the system is resilient against cyber threats. Costs cover the implementation of defensive parsing, audit logging, and preparation for the mandatory independent security audit required by NGI Zero for high-impact software.

### WP4: Community & Documentation (10,000 EUR)
- **Objective**: Establishing "Internet Commons" standards.
- **Justification**: Financing the comprehensive documentation (Memory Bank) and the establishment of a contributor workflow (Beads/bd) to ensure the project remains sustainable and reusable by other institutional actors.

## 6. Commitment to Openness
In strict adherence to NGI Zero mandates, all outputs will be released under the MIT and GPL licenses, contributing directly to the global pool of digital public goods.
