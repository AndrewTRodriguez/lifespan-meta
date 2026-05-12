# scripts/fetch_ncbi.py
import csv
import json
import time
import pprint
from pathlib import Path
from Bio import Entrez

Entrez.email = "andrewthomasrodriguez@gmail.com"
Entrez.api_key = "c1428c7aeeae426263eed63baa4425775408"

GENAGE_CSV = Path("data/raw/genage_models.csv")
OUTPUT = Path("data/raw/ncbi_genes.jsonl")
BATCH_SIZE = 100
RATE_DELAY = 0.11  # ~9 req/s with API key

def parse_genage(path):
    """Returns list of dicts: {genage_id, symbol, organism, entrez_id, ...}"""
    rows = []
    with path.open(encoding="utf-8") as f:
        reader = csv.DictReader(f, delimiter=",")
        for r in reader:
            entrez = r["entrez gene id"].strip()
            if entrez:
                rows.append({
                    "genage_id": r["GenAge ID"],
                    "symbol": r["symbol"],
                    "organism": r["organism"],
                    "entrez_id": entrez,
                    "lifespan_effect": r["lifespan effect"],
                    "longevity_influence": r["longevity influence"],
                })
    return rows

def fetch_batch(entrez_ids):
    """Returns list of parsed Entrezgene records."""
    handle = Entrez.efetch(db="gene", id=",".join(entrez_ids), retmode="xml")
    records = Entrez.read(handle)
    handle.close()
    return records

def extract_go_mf_terms(record):
    """Walk GeneOntology block -> Function -> individual terms.
    Checks both Entrezgene_properties and Entrezgene_comments since
    location varies by organism. Uses _heading (not _label) for GO block."""
    terms = []
    blocks = list(record.get("Entrezgene_properties", [])) + \
             list(record.get("Entrezgene_comments", []))

    for prop in blocks:
        if prop.get("Gene-commentary_heading") != "GeneOntology":
            continue
        for category in prop.get("Gene-commentary_comment", []):
            if category.get("Gene-commentary_label") != "Function":
                continue
            for term_block in category.get("Gene-commentary_comment", []):
                for source in term_block.get("Gene-commentary_source", []):
                    anchor = source.get("Other-source_anchor")
                    if anchor:
                        terms.append(anchor)
    # Deduplicate while preserving order
    seen = dict.fromkeys(terms)
    return list(seen)

def extract_record(record, genage_row):
    gene_ref = record.get("Entrezgene_gene", {}).get("Gene-ref", {})
    symbol = gene_ref.get("Gene-ref_locus", "")

    # Name is nested under formal-name, not a direct Gene-ref_desc field
    formal_name = gene_ref.get("Gene-ref_formal-name", {})
    full_name = formal_name.get("Gene-nomenclature", {}).get("Gene-nomenclature_name", "")

    # Prot-ref uses _desc (a string) not _name (a list)
    prot_ref = record.get("Entrezgene_prot", {}).get("Prot-ref", {})
    prot_desc = prot_ref.get("Prot-ref_desc", "")
    prot_names = [prot_desc] if prot_desc else []

    go_mf = extract_go_mf_terms(record)

    return {
        "genage_id": genage_row["genage_id"],
        "entrez_id": genage_row["entrez_id"],
        "symbol": symbol,
        "organism": genage_row["organism"],
        "full_name": full_name,
        "protein_names": prot_names,
        "go_mf_terms": go_mf,
        "lifespan_effect": genage_row["lifespan_effect"],
        "longevity_influence": genage_row["longevity_influence"],
    }

def test_single():
    records = fetch_batch(["175410"])  # daf-2
    result = extract_record(records[0], {
        "genage_id": "test",
        "entrez_id": "175410",
        "organism": "Caenorhabditis elegans",
        "lifespan_effect": "",
        "longevity_influence": ""
    })
    pprint.pprint(result)

def main():
    rows = parse_genage(GENAGE_CSV)
    print(f"Loaded {len(rows)} GenAge entries")

    seen = set()
    if OUTPUT.exists():
        with OUTPUT.open(encoding="utf-8") as f:
            for line in f:
                seen.add(json.loads(line)["entrez_id"])
        print(f"Resuming: {len(seen)} entries already fetched")

    todo = [r for r in rows if r["entrez_id"] not in seen]
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)

    with OUTPUT.open("a", encoding="utf-8") as out:
        for i in range(0, len(todo), BATCH_SIZE):
            batch = todo[i : i + BATCH_SIZE]
            ids = [r["entrez_id"] for r in batch]
            try:
                records = fetch_batch(ids)
            except Exception as e:
                print(f"Batch {i} failed: {e} — sleeping 30s and retrying")
                time.sleep(30)
                records = fetch_batch(ids)

            for genage_row, record in zip(batch, records):
                extracted = extract_record(record, genage_row)
                out.write(json.dumps(extracted) + "\n")
            out.flush()
            print(f"Fetched {i + len(batch)} / {len(todo)}")
            time.sleep(RATE_DELAY)

if __name__ == "__main__":
    main()