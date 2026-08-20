from __future__ import annotations

from datetime import date
from pathlib import Path
import re

import pandas as pd


SOURCE = Path(
    '/Users/renxubin/Library/Containers/com.tencent.xinWeChat/Data/Documents/'
    'xwechat_files/wxid_k9z9cg6aairv21_ac1c/temp/RWTemp/2026-08/'
    '911d0bad29617f8c5013761aba34d2e0/2026.6.1商品和服务税收分类编码(1).xlsx'
)
OUTPUT_DIR = Path(__file__).resolve().parent
VERSION = '2026.6.1'
EFFECTIVE_FROM = '2026-06-01'
GENERATED_ON = date.today().isoformat()


def sql_string(value: object) -> str:
    if value is None or pd.isna(value):
        return 'NULL'
    text = str(value).strip()
    if not text:
        return 'NULL'
    return "'" + text.replace("'", "''") + "'"


def normalize_code(value: object) -> str | None:
    if value is None or pd.isna(value):
        return None
    code = str(value).strip()
    return code if re.fullmatch(r'\d{19}', code) else None


def normalize_flag(value: object) -> bool:
    return str(value).strip() == '是'


def load_rows() -> list[dict[str, object]]:
    frame = pd.read_excel(SOURCE, sheet_name=0, dtype={'商品编码': 'string'})
    rows: list[dict[str, object]] = []
    for _, item in frame.iterrows():
        code = normalize_code(item.get('商品编码'))
        name = None if pd.isna(item.get('货物和劳务名称')) else str(item.get('货物和劳务名称')).strip()
        if not code or not name:
            continue
        rate = None if pd.isna(item.get('一般纳税人增值税税率')) else str(item.get('一般纳税人增值税税率')).strip()
        rows.append({
            'code': code,
            'name': name,
            'short_name': item.get('商品和服务分类简称'),
            'is_summary': normalize_flag(item.get('是否汇总项(是汇总项不能用)')),
            'general_rate_text': rate,
            'description': item.get('说明'),
            'policy_basis': item.get('增值税政策依据'),
            'is_may_updated': normalize_flag(item.get('是否5月更新')),
        })
    return rows


def value_tuple(row: dict[str, object]) -> str:
    return '(' + ', '.join([
        sql_string(row['code']),
        sql_string(row['name']),
        sql_string(row['short_name']),
        'true' if row['is_summary'] else 'false',
        sql_string(row['general_rate_text']),
        sql_string(row['description']),
        sql_string(row['policy_basis']),
        'true' if row['is_may_updated'] else 'false',
    ]) + ')'


def build_sql(rows: list[dict[str, object]], target: str) -> str:
    lines = [
        '-- Generated from 2026.6.1商品和服务税收分类编码(1).xlsx',
        f'-- Target: {target}',
        f'-- Generated on: {GENERATED_ON}',
        '-- This script targets PostgreSQL. CloudBase script assumes CloudBase PostgreSQL.',
        '-- It does not infer small-taxpayer rates; only source rates are imported.',
        '',
        'begin;',
        '',
        'create table if not exists public.tax_data_versions (',
        '  id bigserial primary key,',
        '  source_name text not null,',
        '  source_version text not null,',
        '  effective_from date not null,',
        '  imported_at timestamptz not null default now(),',
        '  row_count integer not null,',
        '  notes text,',
        '  unique (source_name, source_version)',
        ');',
        '',
        'create table if not exists public.tax_code_items (',
        '  id bigserial primary key,',
        '  code varchar(19) not null,',
        '  name text not null,',
        '  short_name text,',
        '  is_summary boolean not null default false,',
        '  general_rate_text varchar(32),',
        '  description text,',
        '  policy_basis text,',
        '  is_may_updated boolean not null default false,',
        '  source_name text not null,',
        '  source_version text not null,',
        '  effective_from date not null,',
        '  status varchar(20) not null default \'active\',',
        '  created_at timestamptz not null default now(),',
        '  updated_at timestamptz not null default now(),',
        '  unique (code, source_version)',
        ');',
        '',
        'create table if not exists public.tax_rate_rules (',
        '  id bigserial primary key,',
        '  tax_code_id bigint not null references public.tax_code_items(id) on delete cascade,',
        '  taxpayer_type varchar(30) not null,',
        '  rate_type varchar(30) not null,',
        '  rate_text varchar(32) not null,',
        '  effective_from date not null,',
        '  source_name text not null,',
        '  source_version text not null,',
        '  unique (tax_code_id, taxpayer_type, rate_type, source_version)',
        ');',
        '',
        'create index if not exists tax_code_items_name_idx on public.tax_code_items using gin (to_tsvector(\'simple\', name));',
        'create index if not exists tax_code_items_code_idx on public.tax_code_items (code);',
        'create index if not exists tax_code_items_active_leaf_idx on public.tax_code_items (status, is_summary, effective_from);',
        '',
        'insert into public.tax_data_versions (source_name, source_version, effective_from, row_count, notes)',
        f'values ({sql_string(SOURCE.name)}, {sql_string(VERSION)}, {sql_string(EFFECTIVE_FROM)}, {len(rows)}, {sql_string("Excel source; summary rows retained but excluded from default search.")})',
        'on conflict (source_name, source_version) do update set',
        '  effective_from = excluded.effective_from,',
        '  row_count = excluded.row_count,',
        '  imported_at = now(),',
        '  notes = excluded.notes;',
        '',
        'create temporary table _tax_code_import (',
        '  code varchar(19) not null,',
        '  name text not null,',
        '  short_name text,',
        '  is_summary boolean not null,',
        '  general_rate_text varchar(32),',
        '  description text,',
        '  policy_basis text,',
        '  is_may_updated boolean not null',
        ') on commit drop;',
        '',
    ]

    batch_size = 400
    columns = '(code, name, short_name, is_summary, general_rate_text, description, policy_basis, is_may_updated)'
    for start in range(0, len(rows), batch_size):
        batch = rows[start:start + batch_size]
        lines.append(f'insert into _tax_code_import {columns} values')
        lines.append(',\n'.join(value_tuple(row) for row in batch) + ';')
        lines.append('')

    lines.extend([
        'insert into public.tax_code_items (code, name, short_name, is_summary, general_rate_text, description, policy_basis, is_may_updated, source_name, source_version, effective_from, status, updated_at)',
        f'select code, name, short_name, is_summary, general_rate_text, description, policy_basis, is_may_updated, {sql_string(SOURCE.name)}, {sql_string(VERSION)}, {sql_string(EFFECTIVE_FROM)}, \'active\', now()',
        'from _tax_code_import',
        'on conflict (code, source_version) do update set',
        '  name = excluded.name,',
        '  short_name = excluded.short_name,',
        '  is_summary = excluded.is_summary,',
        '  general_rate_text = excluded.general_rate_text,',
        '  description = excluded.description,',
        '  policy_basis = excluded.policy_basis,',
        '  is_may_updated = excluded.is_may_updated,',
        '  effective_from = excluded.effective_from,',
        '  status = excluded.status,',
        '  updated_at = now();',
        '',
        'insert into public.tax_rate_rules (tax_code_id, taxpayer_type, rate_type, rate_text, effective_from, source_name, source_version)',
        f'select item.id, \'general\', \'vat_rate\', item.general_rate_text, item.effective_from, {sql_string(SOURCE.name)}, {sql_string(VERSION)}',
        'from public.tax_code_items item',
        f'where item.source_name = {sql_string(SOURCE.name)}',
        f'  and item.source_version = {sql_string(VERSION)}',
        '  and item.general_rate_text is not null',
        'on conflict (tax_code_id, taxpayer_type, rate_type, source_version) do update set',
        '  rate_text = excluded.rate_text,',
        '  effective_from = excluded.effective_from;',
        '',
        'commit;',
        '',
        '-- Validation queries',
        f'select count(*) as imported_rows from public.tax_code_items where source_version = {sql_string(VERSION)};',
        f'select count(*) as searchable_leaf_rows from public.tax_code_items where source_version = {sql_string(VERSION)} and status = \'active\' and is_summary = false;',
        f'select count(*) as rate_rule_rows from public.tax_rate_rules where source_version = {sql_string(VERSION)};',
    ])
    return '\n'.join(lines) + '\n'


def main() -> None:
    rows = load_rows()
    if not rows:
        raise RuntimeError('No valid 19-digit tax-code rows found in source workbook.')
    for target in ('supabase', 'cloudbase-postgresql'):
        output = OUTPUT_DIR / f'tax-code-import-{target}.sql'
        output.write_text(build_sql(rows, target), encoding='utf-8')
    print(f'Generated {len(rows)} valid rows from {SOURCE.name}')


if __name__ == '__main__':
    main()
