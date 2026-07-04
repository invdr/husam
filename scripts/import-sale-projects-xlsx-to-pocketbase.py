#!/usr/bin/env python3
"""Update PocketBase sale_projects from the registry XLSX by external_id.

Dry-run is the default. To write to production, pass --apply and provide:
POCKETBASE_URL, POCKETBASE_SUPERUSER_EMAIL, POCKETBASE_SUPERUSER_PASSWORD.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
import zipfile


MAIN_NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
PKG_REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships"
NS = {"main": MAIN_NS, "rel": REL_NS, "pkg": PKG_REL_NS}

MANAGED_FIELDS = [
    "title",
    "description",
    "floors",
    "price",
    "old_price",
    "plot_area",
    "house_area",
    "usable_area",
    "house_dimensions",
    "style",
    "garage",
    "canopy",
    "basement",
    "terrace",
    "bedrooms",
    "total_built_area",
    "garage_area",
    "canopy_area",
    "note",
    "explication_basement",
    "explication_floor_1",
    "explication_floor_2",
    "material_foundation",
    "material_walls",
    "material_roof",
    "material_facade",
    "material_summary",
    "sort_order_in_category",
]

CREATE_DEFAULT_TYPE = "Дом"

CYRILLIC_SKU_TRANSLATION = str.maketrans(
    {
        "А": "A",
        "В": "B",
        "Е": "E",
        "К": "K",
        "М": "M",
        "Н": "H",
        "О": "O",
        "Р": "P",
        "С": "C",
        "Т": "T",
        "Х": "X",
        "У": "Y",
        "а": "A",
        "в": "B",
        "е": "E",
        "к": "K",
        "м": "M",
        "н": "H",
        "о": "O",
        "р": "P",
        "с": "C",
        "т": "T",
        "х": "X",
        "у": "Y",
    }
)

HEADER_MAP = {
    "артикул": "id",
    "название": "title",
    "стиль": "style",
    "описание": "description",
    "общие размеры дома": "house_dimensions",
    "экспликация подвал": "explication_basement",
    "экспликация 1й этаж": "explication_floor_1",
    "экспликация 1 этаж": "explication_floor_1",
    "экспликация 2й этаж": "explication_floor_2",
    "экспликация 2 этаж": "explication_floor_2",
    "гараж": "garage",
    "навес": "canopy",
    "площадь гаража": "garage_area",
    "площадь навеса": "canopy_area",
    "терраса": "terrace",
    "подвал": "basement",
    "кол во спален": "bedrooms",
    "кол во этажей": "floors",
    "материал тип фундамента": "material_foundation",
    "материал стены": "material_walls",
    "материал кровля": "material_roof",
    "материал облицовка фасада": "material_facade",
    "материал общий": "material_summary",
    "площадь участка": "plot_area",
    "полезная площадь": "usable_area",
    "общая площадь дома": "house_area",
    "площадь всех построек для расчета стоимости проекта": "total_built_area",
    "стоимость проекта": "old_price",
    "цена со скидкой": "price",
    "перенесен на сайт": "published",
    "ссылка на фотографиями": "source_photo_url",
    "ссылка на фотографии": "source_photo_url",
    "примечание": "note",
}


def normalize_key(value: object) -> str:
    text = as_text(value).replace("ё", "е").lower()
    text = re.sub(r"[\n\r]+", " ", text)
    text = re.sub(r"[()/_-]+", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def canonical_sku(value: object) -> str:
    return re.sub(r"\s+", "", as_text(value).upper().translate(CYRILLIC_SKU_TRANSLATION))


def as_text(value: object) -> str:
    if value is None:
        return ""
    if isinstance(value, bool):
        return "Да" if value else "Нет"
    if isinstance(value, int):
        return str(value)
    if isinstance(value, float):
        return str(int(value)) if value.is_integer() else str(value).rstrip("0").rstrip(".")
    return str(value).strip()


def col_to_index(ref: str) -> int:
    letters = re.match(r"[A-Z]+", ref or "")
    if not letters:
        return 0
    value = 0
    for ch in letters.group(0):
        value = value * 26 + ord(ch) - ord("A") + 1
    return value


def range_bounds(ref: str) -> tuple[int, int, int, int]:
    start, _, end = ref.partition(":")
    end = end or start
    start_col = col_to_index(start)
    end_col = col_to_index(end)
    start_row = int(re.search(r"\d+", start).group(0))
    end_row = int(re.search(r"\d+", end).group(0))
    return start_row, start_col, end_row, end_col


def parse_shared_strings(zf: zipfile.ZipFile) -> list[str]:
    try:
        root = ET.fromstring(zf.read("xl/sharedStrings.xml"))
    except KeyError:
        return []
    strings = []
    for item in root.findall("main:si", NS):
        strings.append("".join(node.text or "" for node in item.iter(f"{{{MAIN_NS}}}t")))
    return strings


def parse_cell_value(cell: ET.Element, shared_strings: list[str]) -> object:
    cell_type = cell.attrib.get("t")
    if cell_type == "inlineStr":
        return "".join(node.text or "" for node in cell.iter(f"{{{MAIN_NS}}}t")).strip()

    value_node = cell.find("main:v", NS)
    if value_node is None or value_node.text is None:
        return None

    raw = value_node.text
    if cell_type == "s":
        idx = int(raw)
        return shared_strings[idx] if 0 <= idx < len(shared_strings) else ""
    if cell_type == "b":
        return raw == "1"
    try:
        number = float(raw)
        return int(number) if number.is_integer() else number
    except ValueError:
        return raw


def workbook_sheets(zf: zipfile.ZipFile) -> list[tuple[str, str]]:
    workbook = ET.fromstring(zf.read("xl/workbook.xml"))
    rels = ET.fromstring(zf.read("xl/_rels/workbook.xml.rels"))
    rel_map = {
        rel.attrib["Id"]: rel.attrib["Target"]
        for rel in rels.findall("pkg:Relationship", NS)
    }
    sheets = []
    for sheet in workbook.findall("main:sheets/main:sheet", NS):
        name = sheet.attrib["name"]
        rel_id = sheet.attrib[f"{{{REL_NS}}}id"]
        target = rel_map[rel_id].lstrip("/")
        if not target.startswith("xl/"):
            target = f"xl/{target}"
        sheets.append((name, target))
    return sheets


def parse_sheet(zf: zipfile.ZipFile, path: str, shared_strings: list[str]) -> dict[int, dict[int, object]]:
    root = ET.fromstring(zf.read(path))
    rows: dict[int, dict[int, object]] = {}
    for row in root.findall("main:sheetData/main:row", NS):
        row_num = int(row.attrib.get("r", "0"))
        cells: dict[int, object] = {}
        for cell in row.findall("main:c", NS):
            col = col_to_index(cell.attrib.get("r", ""))
            value = parse_cell_value(cell, shared_strings)
            if col and value is not None:
                cells[col] = value
        if cells:
            rows[row_num] = cells

    for merge in root.findall("main:mergeCells/main:mergeCell", NS):
        start_row, start_col, end_row, end_col = range_bounds(merge.attrib["ref"])
        if end_row < 2 or start_row > 3:
            continue
        value = rows.get(start_row, {}).get(start_col)
        if value is None:
            continue
        for row_num in range(start_row, end_row + 1):
            row = rows.setdefault(row_num, {})
            for col in range(start_col, end_col + 1):
                row.setdefault(col, value)

    return rows


def build_headers(rows: dict[int, dict[int, object]]) -> dict[int, str]:
    row2 = rows.get(2, {})
    row3 = rows.get(3, {})
    max_col = max([*row2.keys(), *row3.keys()], default=0)
    headers: dict[int, str] = {}
    for col in range(1, max_col + 1):
        base = normalize_key(row2.get(col))
        sub = normalize_key(row3.get(col))
        if not base and not sub:
            continue
        if base in {"экспликация", "материал"} and sub:
            key = normalize_key(f"{base} {sub}")
        else:
            key = base or sub
        mapped = HEADER_MAP.get(key)
        if mapped:
            headers[col] = mapped
    return headers


def read_xlsx_rows(path: str) -> list[dict[str, object]]:
    with zipfile.ZipFile(path) as zf:
        shared_strings = parse_shared_strings(zf)
        out: list[dict[str, object]] = []
        for sheet_name, sheet_path in workbook_sheets(zf):
            rows = parse_sheet(zf, sheet_path, shared_strings)
            headers = build_headers(rows)
            for row_num in sorted(num for num in rows if num >= 4):
                raw: dict[str, object] = {"type": sheet_name}
                for col, key in headers.items():
                    if col in rows[row_num]:
                        raw[key] = rows[row_num][col]
                project_id = as_text(raw.get("id")).strip()
                if project_id:
                    raw["id"] = project_id
                    raw["__sheet"] = sheet_name
                    raw["__row"] = row_num
                    out.append(raw)
    return out


def normalize_square_field(value: object) -> str:
    text = as_text(value)
    if not text:
        return ""
    numbers = re.findall(r"[\d.]+", text.replace(",", "."))
    return f"{numbers[-1]} м²" if numbers else text


def normalize_plot_area_field(value: object) -> str:
    text = as_text(value)
    if not text or text in {"-", "—"}:
        return ""
    numbers = re.findall(r"[\d.]+", text.replace(",", "."))
    if not numbers:
        return text
    only_digits_or_square = re.fullmatch(r"[\d.,\sм²м2]+", text, flags=re.I)
    if only_digits_or_square:
        numeric = float(numbers[-1])
        if re.search(r"м²|м2", text, flags=re.I) and numeric >= 100:
            numeric = numeric / 100
        return f"{numeric:.2f}".rstrip("0").rstrip(".") + " соток"
    if re.search(r"сот", text, flags=re.I):
        return text
    if re.fullmatch(r"\d+(?:[.,]\d+)?", text):
        return text.replace(",", ".") + " соток"
    return text


def normalize_attachment(value: object) -> str:
    raw = normalize_key(value)
    if "отдель" in raw:
        return "Отдельностоящий"
    if "пристро" in raw:
        return "Пристроенный"
    if not raw or raw in {"нет", "no", "false", "0", "-"}:
        return "Нет"
    return "Пристроенный"


def normalize_yes_no(value: object) -> str:
    raw = normalize_key(value)
    if not raw or raw in {"нет", "no", "false", "0", "-"}:
        return "Нет"
    return "Да"


def parse_published(value: object) -> bool:
    raw = normalize_key(value)
    if not raw:
        return False
    if "опублик" in raw or raw in {"да", "1", "true", "yes"}:
        return True
    return False


def format_square_number(value: float) -> str:
    return f"{value:.2f}".rstrip("0").rstrip(".")


def extract_named_square_area(label: str, *texts: object) -> str:
    values: list[float] = []
    label_re = re.compile(label, flags=re.I)
    unit_re = re.compile(r"(?:[-–—:]|\s)(\d+(?:[,.]\d+)?)\s*(?:кв\.?\s*м\.?|м2|м²)", flags=re.I)
    no_unit_re = re.compile(r"[-–—:]\s*(\d+(?:[,.]\d+)?)(?:\s|;|$)")
    for text in texts:
        for line in as_text(text).splitlines():
            if not label_re.search(line):
                continue
            match = unit_re.search(line) or no_unit_re.search(line)
            if not match:
                continue
            values.append(float(match.group(1).replace(",", ".")))
    if not values:
        return ""
    return normalize_square_field(format_square_number(sum(values)))


def build_payload(raw: dict[str, object]) -> dict[str, object]:
    explication_basement = as_text(raw.get("explication_basement"))
    explication_floor_1 = as_text(raw.get("explication_floor_1"))
    explication_floor_2 = as_text(raw.get("explication_floor_2"))
    garage_area = as_text(raw.get("garage_area")) or extract_named_square_area(
        "гараж",
        explication_basement,
        explication_floor_1,
        explication_floor_2,
    )
    canopy_area = as_text(raw.get("canopy_area")) or extract_named_square_area(
        "навес",
        explication_basement,
        explication_floor_1,
        explication_floor_2,
    )
    return {
        "title": as_text(raw.get("title")),
        "description": as_text(raw.get("description")),
        "floors": as_text(raw.get("floors")),
        "price": as_text(raw.get("price") or raw.get("old_price")),
        "old_price": as_text(raw.get("old_price")),
        "plot_area": normalize_plot_area_field(raw.get("plot_area")),
        "house_area": normalize_square_field(raw.get("house_area")),
        "usable_area": normalize_square_field(raw.get("usable_area")),
        "house_dimensions": as_text(raw.get("house_dimensions")),
        "style": as_text(raw.get("style")),
        "garage": normalize_attachment(raw.get("garage")),
        "canopy": normalize_attachment(raw.get("canopy")),
        "basement": normalize_yes_no(raw.get("basement")),
        "terrace": normalize_yes_no(raw.get("terrace")),
        "bedrooms": as_text(raw.get("bedrooms")),
        "total_built_area": normalize_square_field(raw.get("total_built_area")),
        "garage_area": normalize_square_field(garage_area),
        "canopy_area": normalize_square_field(canopy_area),
        "note": as_text(raw.get("note")),
        "explication_basement": explication_basement,
        "explication_floor_1": explication_floor_1,
        "explication_floor_2": explication_floor_2,
        "material_foundation": as_text(raw.get("material_foundation")),
        "material_walls": as_text(raw.get("material_walls")),
        "material_roof": as_text(raw.get("material_roof")),
        "material_facade": as_text(raw.get("material_facade")),
        "material_summary": as_text(raw.get("material_summary")),
    }


def request_json(base_url: str, path: str, method: str = "GET", token: str | None = None, body: object | None = None) -> object:
    data = None
    headers = {"Accept": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if body is not None:
        data = json.dumps(body, ensure_ascii=False).encode("utf-8")
        headers["Content-Type"] = "application/json"
    request = urllib.request.Request(base_url.rstrip("/") + path, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=45) as response:
            raw = response.read()
            return json.loads(raw.decode("utf-8")) if raw else {}
    except urllib.error.HTTPError as error:
        text = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"PocketBase {method} {path} failed: {error.code} {text}") from error


def auth_token(base_url: str, email: str, password: str) -> str:
    body = request_json(
        base_url,
        "/api/collections/_superusers/auth-with-password",
        method="POST",
        body={"identity": email, "password": password},
    )
    token = body.get("token") if isinstance(body, dict) else None
    if not token:
        raise RuntimeError("PocketBase auth did not return a token")
    return token


def fetch_existing(base_url: str, token: str | None, batch_size: int) -> dict[str, dict[str, object]]:
    records: dict[str, dict[str, object]] = {}
    fields = urllib.parse.quote(",".join(dict.fromkeys(["id", "external_id", "type", *MANAGED_FIELDS])))
    page = 1
    while True:
        data = request_json(
            base_url,
            f"/api/collections/sale_projects/records?page={page}&perPage={batch_size}&skipTotal=1&fields={fields}",
            token=token,
        )
        items = data.get("items", []) if isinstance(data, dict) else []
        for item in items:
            external_id = as_text(item.get("external_id"))
            if external_id:
                records[external_id] = item
        if len(items) < batch_size:
            break
        page += 1
    return records


def next_sort_orders_by_type(records: dict[str, dict[str, object]]) -> dict[str, int]:
    next_by_type: dict[str, int] = {}
    for record in records.values():
        project_type = as_text(record.get("type"))
        if not project_type:
            continue
        current = record.get("sort_order_in_category")
        try:
            current_int = int(current)
        except (TypeError, ValueError):
            current_int = -1
        next_by_type[project_type] = max(next_by_type.get(project_type, 0), current_int + 1)
    return next_by_type


def comparable(value: object) -> object:
    if isinstance(value, bool):
        return value
    return as_text(value)


def diff_payload(existing: dict[str, object], payload: dict[str, object]) -> dict[str, object]:
    return {
        key: value
        for key, value in payload.items()
        if comparable(existing.get(key)) != comparable(value)
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Update sale_projects in PocketBase from XLSX registry")
    parser.add_argument("--xlsx", required=True, help="Path to source .xlsx")
    parser.add_argument("--url", default=os.environ.get("POCKETBASE_URL") or os.environ.get("VITE_POCKETBASE_URL") or "https://api.husam.ru")
    parser.add_argument("--apply", action="store_true", help="Write changes to PocketBase")
    parser.add_argument("--create-missing", action="store_true", help="Create XLSX rows whose external_id is missing in PocketBase")
    parser.add_argument("--batch-size", type=int, default=200)
    parser.add_argument("--limit", type=int, default=0, help="Limit changed records to apply/debug")
    args = parser.parse_args()

    token = None
    email = os.environ.get("POCKETBASE_SUPERUSER_EMAIL")
    password = os.environ.get("POCKETBASE_SUPERUSER_PASSWORD")
    if email and password:
        token = auth_token(args.url, email, password)
    elif args.apply:
        raise RuntimeError("For --apply set POCKETBASE_SUPERUSER_EMAIL and POCKETBASE_SUPERUSER_PASSWORD")

    raw_rows = read_xlsx_rows(args.xlsx)
    payloads = [(as_text(row["id"]), row, build_payload(row)) for row in raw_rows]
    existing = fetch_existing(args.url, token, args.batch_size)

    existing_by_canonical = {
        canonical_sku(external_id): record
        for external_id, record in existing.items()
        if canonical_sku(external_id)
    }
    missing = []
    changes = []
    creates = []
    normalized_matches = 0
    unchanged = 0
    for external_id, raw, payload in payloads:
        record = existing.get(external_id)
        if not record:
            record = existing_by_canonical.get(canonical_sku(external_id))
            if record:
                normalized_matches += 1
        if not record:
            missing.append((external_id, raw.get("__sheet"), raw.get("__row")))
            creates.append((external_id, raw, payload))
            continue
        diff = diff_payload(record, payload)
        if diff:
            changes.append((external_id, record["id"], diff))
        else:
            unchanged += 1

    if args.limit:
        changes = changes[: args.limit]

    print(f"XLSX rows: {len(payloads)}")
    print(f"PocketBase matched: {len(payloads) - len(missing)}")
    print(f"Matched by normalized SKU: {normalized_matches}")
    print(f"Changed: {len(changes)}")
    print(f"Unchanged: {unchanged}")
    print(f"Missing in PocketBase: {len(missing)}")
    if args.create_missing:
        print(f"Will create missing: {len(creates)}")
        print(f"Missing create defaults: type={CREATE_DEFAULT_TYPE!r}, published=False")
    if missing:
        preview = ", ".join(item[0] for item in missing[:30])
        suffix = " ..." if len(missing) > 30 else ""
        print(f"Missing preview: {preview}{suffix}")
    if changes:
        print("Change preview:")
        for external_id, _, diff in changes[:10]:
            print(f"  {external_id}: {', '.join(diff.keys())}")

    if not args.apply:
        print("Dry run only. Re-run with --apply and PocketBase superuser env to write.")
        return 0

    for index, (external_id, record_id, diff) in enumerate(changes, start=1):
        request_json(
            args.url,
            f"/api/collections/sale_projects/records/{record_id}",
            method="PATCH",
            token=token,
            body=diff,
        )
        print(f"Applied {index}/{len(changes)} {external_id}")

    if args.create_missing:
        next_by_type = next_sort_orders_by_type(existing)
        for index, (external_id, _raw, payload) in enumerate(creates, start=1):
            project_type = CREATE_DEFAULT_TYPE
            sort_order_in_category = next_by_type.get(project_type, 0)
            next_by_type[project_type] = sort_order_in_category + 1
            create_payload = {
                "external_id": external_id,
                "type": project_type,
                "status": "available",
                "featured": False,
                "published": False,
                "sort_order_in_category": sort_order_in_category,
                **payload,
            }
            request_json(
                args.url,
                "/api/collections/sale_projects/records",
                method="POST",
                token=token,
                body=create_payload,
            )
            print(f"Created {index}/{len(creates)} {external_id}")

    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(error, file=sys.stderr)
        raise SystemExit(1)
