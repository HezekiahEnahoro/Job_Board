# app/core/skills.py
from typing import List
import re

SKILL_VARIANTS = {
    r"\breact(\.js)?\b": "react",
    r"\bnode(\.js)?\b": "node",
    r"\btypescript\b": "typescript",
    r"\bjavascript\b": "javascript",
    r"\bpython\b": "python",
    r"\b(java)\b": "java",
    r"\bpostgres(ql)?\b": "postgres",
    r"\bmysql\b": "mysql",
    r"\bmongo(db)?\b": "mongodb",
    r"\baws\b": "aws",
    r"\bgcp\b": "gcp",
    r"\bazure\b": "azure",
    r"\bdocker\b": "docker",
    r"\bkubernetes\b": "kubernetes",
    r"\bpandas\b": "pandas",
    r"\bnumpy\b": "numpy",
    r"\bpytorch\b": "pytorch",
    r"\btensorflow\b": "tensorflow",
    r"\bspark\b": "spark",
    r"\bairflow\b": "airflow",
    r"\bsql\b": "sql",
}

def extract_skills(*texts: str | None) -> List[str]:
    blob = " ".join([t or "" for t in texts]).lower()
    found = set()
    for pattern, norm in SKILL_VARIANTS.items():
        if re.search(pattern, blob):
            found.add(norm)
    return sorted(found)
