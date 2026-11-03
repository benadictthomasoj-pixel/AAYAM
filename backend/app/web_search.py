"""
AAYAM Web Intelligence & External Standard Search Service
Retrieves, parses, and ranks external government guidelines, statutory engineering codes,
and official departmental publications to support infrastructure decision-making.
"""

import os
import re
import time
import logging
import urllib.parse
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional, Tuple
import httpx
from pydantic import BaseModel, Field

logger = logging.getLogger("aayam.web_search")

# Authoritative domain patterns prioritized for public infrastructure
AUTHORITATIVE_GOV_DOMAINS = [
    "cwc.gov.in",
    "cpwd.gov.in",
    "moef.gov.in",
    "moefcc.gov.in",
    "morth.nic.in",
    "bis.gov.in",
    "rdso.indianrailways.gov.in",
    "nhai.gov.in",
    "india.gov.in",
    "nic.in",
    "gov.in",
    "law.resource.org",  # Public repository of official Indian Standards (IS/IRC)
]

ACADEMIC_RESEARCH_DOMAINS = [
    "iitr.ac.in",
    "iitb.ac.in",
    "iitd.ac.in",
    "iitm.ac.in",
    "crridom.gov.in",
    "csir.res.in",
    "cbri.res.in",
    "ac.in",
    "edu",
]


class WebSearchResult(BaseModel):
    title: str
    url: str
    domain: str
    snippet: str
    published_date: Optional[str] = None
    accessed_date: str = Field(default_factory=lambda: datetime.now(timezone.utc).strftime("%Y-%m-%d"))
    authority_tier: str
    supports_topic: str


def clean_redirect_url(raw_url: str) -> str:
    """Extracts destination URL from DuckDuckGo or search redirect wrappers."""
    raw_url = urllib.parse.unquote(raw_url)
    if "uddg=" in raw_url:
        match = re.search(r"uddg=([^&]+)", raw_url)
        if match:
            return match.group(1)
    if raw_url.startswith("//"):
        return "https:" + raw_url
    return raw_url


def determine_authority_tier(domain: str, title: str, url: str) -> str:
    """Classifies domain and document into engineering authority tier."""
    d_lower = domain.lower()
    t_lower = (title + " " + url).lower()

    if any(std in t_lower for std in ["is ", "is-", "is:", "irc:", "irc ", "bis "]) or "bis.gov.in" in d_lower or "law.resource.org" in d_lower:
        return "Statutory Engineering Standard (IS / IRC / BIS)"
    if any(d in d_lower for d in ["cwc.gov.in", "cpwd.gov.in", "morth.nic.in", "rdso.indianrailways.gov.in", "nhai.gov.in"]):
        return "Official Government Department Standard"
    if any(d in d_lower for d in AUTHORITATIVE_GOV_DOMAINS):
        return "Official Government Authority (Govt of India)"
    if any(d in d_lower for d in ACADEMIC_RESEARCH_DOMAINS):
        return "National Research & Engineering Institute"
    return "Engineering Technical Reference"


class WebSearchService:
    """
    Modular External Search Engine for AAYAM Infrastructure Decision Copilot.
    Supports DuckDuckGo (primary live zero-config), Tavily (optional), and SerpAPI.
    """

    def __init__(self):
        self.enabled = os.getenv("WEB_SEARCH_ENABLED", "true").lower() in ("true", "1", "yes")
        self.provider = os.getenv("WEB_SEARCH_PROVIDER", "duckduckgo").lower()
        self.timeout = float(os.getenv("WEB_SEARCH_TIMEOUT_SECONDS", "8.0"))
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
        }

    @property
    def provider_name(self) -> str:
        return self.provider

    def should_search_external(
        self,
        question: str,
        matched_assets: Any = 0,
        doc_chunks: Any = 0,
    ) -> bool:
        """
        Determines whether the inquiry requires external web / standard intelligence.
        """
        if not self.enabled:
            return False

        q_lower = question.lower()

        # Keywords explicitly requiring external standards / guidance
        external_triggers = [
            "guideline", "guidelines", "standard", "standards", "code", "codes",
            "official guidance", "government", "cpwd", "cwc", "irc", "bis", "is code",
            "statutory", "regulations", "manual", "maintenance protocol",
            "similar failure", "case study", "best practice", "web", "online",
            "external", "compare", "industry benchmark", "official", "regulator"
        ]

        explicit_need = any(trig in q_lower for trig in external_triggers)

        # Count checks whether inputs are ints or lists
        m_count = len(matched_assets) if isinstance(matched_assets, (list, tuple)) else int(matched_assets or 0)
        d_count = len(doc_chunks) if isinstance(doc_chunks, (list, tuple)) else int(doc_chunks or 0)
        zero_local_evidence = (m_count == 0 and d_count == 0)

        # Do not trigger external web search for pure internal database inquiries unless explicit
        if explicit_need:
            return True

        # If zero local evidence was found, check if question looks like an engineering/infrastructure query
        # that could be answered by official guidelines rather than asking about an unindexed asset
        if zero_local_evidence:
            engineering_terms = ["sluice", "gate", "bridge", "pier", "scour", "pump", "culvert", "drainage", "water treatment"]
            if any(term in q_lower for term in engineering_terms):
                return True

        return False

    def build_search_query(
        self,
        question: str,
        matched_asset_names: Optional[List[str]] = None,
        category_filter: Optional[str] = None,
    ) -> str:
        """
        Formulates an authoritative Indian infrastructure engineering search query.
        """
        clean_q = re.sub(r"\b(ASSET-[A-Z]{3}-\d{3})\b", "", question, flags=re.IGNORECASE)
        clean_q = re.sub(r"[^\w\s\-/]", " ", clean_q).strip()
        q_lower = question.lower()

        search_terms = clean_q
        if "sluice" in q_lower or "drainage" in q_lower or "flood" in q_lower or "tidal" in q_lower:
            search_terms += " Central Water Commission CWC IS guidelines maintenance"
        elif "bridge" in q_lower or "pier" in q_lower or "scour" in q_lower:
            search_terms += " IRC CPWD bridge pier scour maintenance guidelines"
        elif "water treatment" in q_lower or "wtp" in q_lower or "pump" in q_lower:
            search_terms += " CPWD water treatment plant operation maintenance manual"
        elif "highway" in q_lower or "flyover" in q_lower or "bearing" in q_lower:
            search_terms += " MoRTH IRC bridge bearing expansion joint inspection"

        return search_terms.strip()

    async def search_duckduckgo(self, query: str, max_results: int = 4) -> List[WebSearchResult]:
        """
        Executes live DuckDuckGo HTML search and parses verified titles, URLs, and snippets.
        """
        url = "https://html.duckduckgo.com/html/"
        data = {"q": query}

        async with httpx.AsyncClient(timeout=self.timeout, headers=self.headers, follow_redirects=True) as client:
            resp = await client.post(url, data=data)
            if resp.status_code != 200:
                logger.warning(f"DuckDuckGo search returned HTTP {resp.status_code}")
                return []

            html_text = resp.text

        titles = re.findall(
            r'<h2 class="result__title">.*?<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>(.*?)</a>',
            html_text,
            re.DOTALL,
        )
        snippets = re.findall(r'<a class="result__snippet"[^>]*>(.*?)</a>', html_text, re.DOTALL)

        results: List[WebSearchResult] = []
        seen_domains = set()

        for i in range(min(len(titles), len(snippets))):
            raw_url, raw_title = titles[i]
            clean_url = clean_redirect_url(raw_url)
            parsed_domain = urllib.parse.urlparse(clean_url).netloc.lower()

            # Skip duplicate domains to ensure diverse perspective
            if parsed_domain in seen_domains and len(results) >= 2:
                continue

            title = re.sub(r"<[^>]+>", "", raw_title).strip()
            title = re.sub(r"\s+", " ", title)
            # Remove "PDF" badge prefix if present
            title = re.sub(r"^PDF\s+", "", title)

            snippet = re.sub(r"<[^>]+>", "", snippets[i]).strip()
            snippet = re.sub(r"\s+", " ", snippet)

            authority = determine_authority_tier(parsed_domain, title, clean_url)

            # Topic inference
            topic = "Statutory Infrastructure Engineering Guidance"
            if "sluice" in (title + snippet).lower():
                topic = "Drainage Sluice Gate Operation & Silt Clearance Protocol"
            elif "scour" in (title + snippet).lower():
                topic = "Pier Scour Protection & Bathymetric Inspection Standards"
            elif "vibration" in (title + snippet).lower() or "pump" in (title + snippet).lower():
                topic = "Pump Motor Vibration Limits (ISO 10816 / CPWD)"
            elif "bearing" in (title + snippet).lower():
                topic = "Elastomeric Bearing & Expansion Joint Maintenance"

            results.append(
                WebSearchResult(
                    title=title,
                    url=clean_url,
                    domain=parsed_domain,
                    snippet=snippet,
                    authority_tier=authority,
                    supports_topic=topic,
                )
            )
            seen_domains.add(parsed_domain)
            if len(results) >= max_results:
                break

        # Sort: official government and statutory standards first
        results.sort(
            key=lambda r: (
                0 if "Statutory" in r.authority_tier else 1 if "Government" in r.authority_tier else 2
            )
        )
        return results

    async def search_tavily(self, query: str, api_key: str, max_results: int = 4) -> List[WebSearchResult]:
        """Tavily search provider integration when configured with TAVILY_API_KEY."""
        url = "https://api.tavily.com/search"
        payload = {
            "api_key": api_key,
            "query": query,
            "search_depth": "basic",
            "include_domains": AUTHORITATIVE_GOV_DOMAINS + ACADEMIC_RESEARCH_DOMAINS,
            "max_results": max_results,
        }
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code != 200:
                return []
            data = resp.json()

        results = []
        for r in data.get("results", []):
            url_str = r.get("url", "")
            domain = urllib.parse.urlparse(url_str).netloc
            title = r.get("title", "Engineering Guidance Document")
            snippet = r.get("content", "")
            tier = determine_authority_tier(domain, title, url_str)
            results.append(
                WebSearchResult(
                    title=title,
                    url=url_str,
                    domain=domain,
                    snippet=snippet,
                    published_date=r.get("published_date"),
                    authority_tier=tier,
                    supports_topic="External Infrastructure Engineering Standard",
                )
            )
        return results

    async def search(self, query: str, max_results: int = 4) -> Tuple[List[WebSearchResult], str, bool]:
        """
        Executes web search according to the configured provider.
        Returns: (results_list, provider_name, was_executed)
        """
        if not self.enabled or not query or not query.strip():
            return [], "disabled", False

        clean_q = query.strip()
        tavily_key = os.getenv("TAVILY_API_KEY")

        try:
            if self.provider == "tavily" and tavily_key:
                res = await self.search_tavily(clean_q, tavily_key, max_results=max_results)
                return res, "tavily", True
            elif self.provider in ("duckduckgo", "ddg") or not tavily_key:
                res = await self.search_duckduckgo(clean_q, max_results=max_results)
                return res, "duckduckgo_html", True
            else:
                return [], "none", False
        except Exception as e:
            logger.warning(f"External web search failed gracefully: {e}")
            return [], self.provider, False


# Global singleton
web_search_service = WebSearchService()
