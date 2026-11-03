import os
import re
from pathlib import Path
from typing import List, Dict, Any, Optional
import logging
from pydantic import BaseModel
from app.config import EVIDENCE_DIR

logger = logging.getLogger("aayam.documents")

try:
    import pypdf
    PYPDF_AVAILABLE = True
except ImportError:
    PYPDF_AVAILABLE = False


class DocumentEvidenceChunk(BaseModel):
    chunk_id: str
    document_name: str
    file_type: str
    page_number: Optional[int] = None
    section_title: Optional[str] = None
    asset_id: Optional[str] = None
    asset_name_hint: Optional[str] = None
    timestamp: Optional[str] = None
    source_agency: str
    excerpt: str
    needs_review: bool = False
    review_reason: Optional[str] = None
    relevance_score: float = 0.0
    source_file: Optional[str] = None


class DocumentStore:
    """
    Ingests, parses, validates, and indexes engineering evidence documents
    (PDF and TXT) linking them reliably to verified assets in SQLite.
    """

    def __init__(self, evidence_dir: Optional[Path] = None):
        self.evidence_dir = evidence_dir or EVIDENCE_DIR
        self.chunks: List[DocumentEvidenceChunk] = []
        self._load_documents()

    def _load_documents(self):
        self.chunks = []
        if not self.evidence_dir.exists():
            logger.warning(f"Evidence directory {self.evidence_dir} does not exist. Creating it.")
            self.evidence_dir.mkdir(parents=True, exist_ok=True)
            return

        for filepath in self.evidence_dir.iterdir():
            if filepath.suffix.lower() == ".pdf":
                self._ingest_pdf(filepath)
            elif filepath.suffix.lower() in [".txt", ".md"]:
                self._ingest_txt(filepath)

        logger.info(f"Loaded and indexed {len(self.chunks)} evidence chunks from {self.evidence_dir}.")

    def _extract_asset_id(self, text: str) -> Optional[str]:
        """Finds primary key pattern like ASSET-BRG-001 in text."""
        match = re.search(r"\b(ASSET-[A-Z]{3}-\d{3})\b", text)
        if match:
            return match.group(1)
        return None

    def _extract_date(self, text: str) -> Optional[str]:
        """Finds date in YYYY-MM-DD or standard format."""
        match = re.search(r"\b(20\d{2}-\d{2}-\d{2})\b", text)
        if match:
            return match.group(1)
        return None

    def _ingest_pdf(self, filepath: Path):
        if not PYPDF_AVAILABLE:
            logger.warning("pypdf is not available. Skipping PDF ingestion.")
            return

        try:
            reader = pypdf.PdfReader(str(filepath))
            doc_name = filepath.stem.replace("_", " ")

            for page_idx, page in enumerate(reader.pages, start=1):
                text = page.extract_text() or ""
                if not text.strip():
                    continue

                asset_id = self._extract_asset_id(text)
                timestamp = self._extract_date(text)

                needs_review = asset_id is None
                review_reason = "Uncertain asset relationship: No validated asset primary key found in document." if needs_review else None

                source = "Certified Structural Audit Bureau"
                if "PWD" in text:
                    source = "Public Works Dept (PWD) Engineering Wing"
                elif "RUIDP" in text:
                    source = "Urban Infrastructure Development Project (RUIDP)"

                # Split text into paragraphs
                paragraphs = [p.strip() for p in text.split("\n\n") if len(p.strip()) > 30]
                if not paragraphs:
                    paragraphs = [text.strip()]

                for p_idx, para in enumerate(paragraphs, start=1):
                    chunk = DocumentEvidenceChunk(
                        chunk_id=f"{filepath.stem}-p{page_idx}-c{p_idx}",
                        document_name=doc_name,
                        file_type="PDF",
                        page_number=page_idx,
                        section_title=f"Page {page_idx}",
                        asset_id=asset_id,
                        timestamp=timestamp,
                        source_agency=source,
                        excerpt=para,
                        needs_review=needs_review,
                        review_reason=review_reason,
                        source_file=filepath.name,
                    )
                    self.chunks.append(chunk)
        except Exception as e:
            logger.error(f"Error parsing PDF {filepath}: {e}")

    def _ingest_txt(self, filepath: Path):
        try:
            content = filepath.read_text(encoding="utf-8")
            doc_name = filepath.stem.replace("_", " ")

            asset_id = self._extract_asset_id(content)
            timestamp = self._extract_date(content)

            # Check for review flags
            needs_review = asset_id is None or "FLAGGED_FOR_REVIEW" in content or asset_id == "UNASSIGNED"
            review_reason = (
                "Uncertain asset relationship: General regional memo without specific individual asset binding."
                if needs_review
                else None
            )

            # Extract source agency
            source = "Government Public Works Directorate"
            source_match = re.search(r"Author / Source:\s*(.+)", content)
            if source_match:
                source = source_match.group(1).strip()

            doc_name_match = re.search(r"Document Name:\s*(.+)", content)
            if doc_name_match:
                doc_name = doc_name_match.group(1).strip()

            # Split by SECTION headers or double newlines
            sections = re.split(r"(SECTION\s+\d+:?[^\n]*)", content)
            
            if len(sections) > 1:
                current_title = "Overview"
                for part in sections:
                    if part.startswith("SECTION"):
                        current_title = part.strip()
                    elif len(part.strip()) > 40:
                        chunk = DocumentEvidenceChunk(
                            chunk_id=f"{filepath.stem}-sec{len(self.chunks)+1}",
                            document_name=doc_name,
                            file_type="TXT",
                            page_number=1,
                            section_title=current_title,
                            asset_id=None if needs_review else asset_id,
                            timestamp=timestamp,
                            source_agency=source,
                            excerpt=part.strip()[:600],
                            needs_review=needs_review,
                            review_reason=review_reason,
                            source_file=filepath.name,
                        )
                        self.chunks.append(chunk)
            else:
                chunk = DocumentEvidenceChunk(
                    chunk_id=f"{filepath.stem}-all",
                    document_name=doc_name,
                    file_type="TXT",
                    page_number=1,
                    section_title="Full Document",
                    asset_id=None if needs_review else asset_id,
                    timestamp=timestamp,
                    source_agency=source,
                    excerpt=content.strip()[:600],
                    needs_review=needs_review,
                    review_reason=review_reason,
                    source_file=filepath.name,
                )
                self.chunks.append(chunk)
        except Exception as e:
            logger.error(f"Error parsing TXT document {filepath}: {e}")

    def search_evidence(
        self,
        query: str,
        target_asset_id: Optional[str] = None,
        top_k: int = 4,
        min_score: float = 25.0,
        expanded_terms: Optional[List[str]] = None,
    ) -> List[DocumentEvidenceChunk]:
        """
        Retrieves evidence chunks relevant to query and target asset.
        Enforces a minimum relevance score threshold and prevents false cross-asset attribution.
        Supports optional expanded_terms for multilingual and concept normalization.
        """
        clean_q = query.lower()
        q_tokens = set(re.sub(r"[^\w\s-]", " ", clean_q).split())
        # Filter trivial stopwords from query tokens
        q_tokens = {t for t in q_tokens if len(t) > 2 and t not in {
            "what", "did", "the", "and", "for", "with", "from", "how", "why", "who", "where",
            "is", "are", "was", "were", "this", "that", "about", "find", "report", "show", "tell"
        }}
        if expanded_terms:
            for term in expanded_terms:
                clean_term = term.lower().strip()
                if len(clean_term) > 2:
                    q_tokens.add(clean_term)

        scored: List[Tuple[float, DocumentEvidenceChunk]] = []

        for chunk in self.chunks:
            # 1. Strict asset scoping: If a target asset is specified, exclude chunks of other assets
            if target_asset_id:
                if chunk.asset_id != target_asset_id:
                    continue
            else:
                # If no target asset is specified, exclude chunks flagged as unassigned/needs_review
                # unless the user explicitly searched for regional policy, dredging, or catchment
                if chunk.needs_review and not any(k in clean_q for k in ["dredging", "catchment", "circular", "policy", "cwc", "unindexed"]):
                    continue

            score = 0.0
            excerpt_lower = chunk.excerpt.lower()
            doc_lower = chunk.document_name.lower()
            sec_lower = (chunk.section_title or "").lower()

            # Direct asset ID match in query
            if chunk.asset_id and chunk.asset_id.lower() in clean_q:
                score += 50.0

            # Token overlap in excerpt, document name, and section title
            # Exclude alphanumeric asset identifier tokens when evaluating topical relevance
            topical_tokens = {t for t in q_tokens if not re.match(r"^(?:asset|test|mvp)-[a-z0-9-]+$", t)}
            matched_tokens = 0
            for token in topical_tokens:
                if token in doc_lower:
                    score += 15.0
                    matched_tokens += 1
                if token in sec_lower:
                    score += 15.0
                    matched_tokens += 1
                if token in excerpt_lower:
                    score += 10.0
                    matched_tokens += 1

            # Domain-specific technical keywords (give extra weight if both query and doc contain it)
            domain_terms = [
                "scour", "vibration", "monsoon", "silt", "bearing", "fissure",
                "seizure", "turbidity", "cavitation", "audit", "sonar", "overtopping",
                "inclinometer", "shear", "culvert", "pier", "clarifier", "hoist"
            ]
            domain_matched = False
            for term in domain_terms:
                term_in_query = (term in clean_q) or (expanded_terms and any(term == et.lower() or term in et.lower() for et in expanded_terms))
                if term_in_query and (term in excerpt_lower or term in sec_lower or term in doc_lower):
                    score += 25.0
                    domain_matched = True

            # Fix 1: Enforce genuine topical relevance requirement.
            # A target asset match must not, by itself, make an unrelated document eligible.
            has_topical_relevance = (matched_tokens >= 1) or domain_matched

            # Preserve asset scoping as a ranking bonus AFTER topical relevance has been established
            if has_topical_relevance and target_asset_id and chunk.asset_id == target_asset_id:
                score += 35.0

            # Only retain chunks meeting the minimum relevance threshold and possessing verified topical relevance
            if has_topical_relevance and score >= min_score:
                chunk_copy = chunk.model_copy()
                chunk_copy.relevance_score = score
                scored.append((score, chunk_copy))

        scored.sort(key=lambda x: x[0], reverse=True)
        return [item[1] for item in scored[:top_k]]

    def get_document_content(self, document_identifier: str) -> Optional[Dict[str, Any]]:
        """
        Safely retrieves the full verified content and metadata of an engineering source document.
        Immune to path traversal attacks. Returns None if document does not exist.
        """
        if not document_identifier or not str(document_identifier).strip():
            return None

        clean_id = str(document_identifier).strip().replace("\\", "/")
        if ".." in clean_id or clean_id.startswith("/") or clean_id.startswith("~"):
            return None

        resolved_evidence_dir = self.evidence_dir.resolve()
        target_path = (self.evidence_dir / clean_id).resolve()

        # Check path boundary to prevent directory traversal
        try:
            target_path.relative_to(resolved_evidence_dir)
        except ValueError:
            return None

        # If not exact match by filename, search by stem or document name
        if not target_path.exists() or not target_path.is_file():
            clean_search = clean_id.lower().replace("_", " ").replace("-", " ")
            if clean_search.endswith(".pdf"):
                clean_search = clean_search[:-4].strip()
            elif clean_search.endswith(".txt"):
                clean_search = clean_search[:-4].strip()

            matched_file = None
            for f in self.evidence_dir.iterdir():
                if f.is_file() and not f.name.startswith("."):
                    f_stem_clean = f.stem.lower().replace("_", " ").replace("-", " ")
                    if f.name.lower() == clean_id.lower() or f_stem_clean == clean_search or clean_search in f_stem_clean:
                        matched_file = f
                        break
            if not matched_file:
                # Also check matching against document_name recorded in self.chunks
                for chunk in self.chunks:
                    if chunk.document_name and chunk.source_file:
                        c_name = chunk.document_name.lower().replace("_", " ").replace("-", " ")
                        if c_name == clean_search or clean_search in c_name:
                            candidate = self.evidence_dir / chunk.source_file
                            if candidate.exists():
                                matched_file = candidate
                                break
            if not matched_file:
                return None
            target_path = matched_file

        # Verify boundary again on resolved matched file
        try:
            target_path.relative_to(resolved_evidence_dir)
        except ValueError:
            return None

        suffix = target_path.suffix.lower()
        if suffix == ".pdf":
            if not PYPDF_AVAILABLE:
                logger.warning("pypdf is not available to read PDF.")
                return None
            try:
                reader = pypdf.PdfReader(str(target_path))
                doc_name = target_path.stem.replace("_", " ")
                pages_data = []
                full_text_parts = []
                sample_text = ""
                for page_idx, page in enumerate(reader.pages, start=1):
                    p_text = (page.extract_text() or "").strip()
                    pages_data.append({"page_number": page_idx, "text": p_text})
                    if p_text:
                        full_text_parts.append(f"--- Page {page_idx} ---\n{p_text}")
                        if not sample_text:
                            sample_text = p_text

                source = "Certified Structural Audit Bureau"
                if "PWD" in sample_text:
                    source = "Public Works Dept (PWD) Engineering Wing"
                elif "RUIDP" in sample_text:
                    source = "Urban Infrastructure Development Project (RUIDP)"

                asset_id = self._extract_asset_id(sample_text)
                timestamp = self._extract_date(sample_text)

                return {
                    "document_name": doc_name,
                    "filename": target_path.name,
                    "file_type": "PDF",
                    "total_pages": len(reader.pages),
                    "source_agency": source,
                    "timestamp": timestamp,
                    "asset_id": asset_id,
                    "content": "\n\n".join(full_text_parts),
                    "pages": pages_data,
                    "status": "available",
                }
            except Exception as e:
                logger.error(f"Failed to read PDF document {target_path}: {e}")
                return None
        elif suffix in [".txt", ".md"]:
            try:
                content = target_path.read_text(encoding="utf-8")
                doc_name = target_path.stem.replace("_", " ")
                doc_name_match = re.search(r"Document Name:\s*(.+)", content)
                if doc_name_match:
                    doc_name = doc_name_match.group(1).strip()

                source = "Government Public Works Directorate"
                source_match = re.search(r"Author / Source:\s*(.+)", content)
                if source_match:
                    source = source_match.group(1).strip()

                asset_id = self._extract_asset_id(content)
                timestamp = self._extract_date(content)

                return {
                    "document_name": doc_name,
                    "filename": target_path.name,
                    "file_type": "TXT",
                    "total_pages": 1,
                    "source_agency": source,
                    "timestamp": timestamp,
                    "asset_id": asset_id,
                    "content": content,
                    "pages": [{"page_number": 1, "text": content}],
                    "status": "available",
                }
            except Exception as e:
                logger.error(f"Failed to read TXT document {target_path}: {e}")
                return None

        return None


# Global singleton instance
evidence_store = DocumentStore()

