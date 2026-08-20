# 税收分类编码导入

数据源：`2026.6.1商品和服务税收分类编码(1).xlsx`

本次生成结果：

- 有效编码：4,300 条
- 汇总项：保留在主表，但默认查询应使用 `is_summary = false`
- 编码：按 19 位字符串保存，避免数字类型丢失前导位
- 一般纳税人税率：按 Excel 原值导入
- 小规模纳税人征收率：本次不自动推断，后续应通过税率规则或政策数据补充

## Supabase

在 Supabase SQL Editor 中执行：

```text
scripts/database/tax-code-import-supabase.sql
```

脚本包含建表、索引、版本记录、批量导入、幂等更新和导入后的统计查询。

## CloudBase

当前项目的 CloudBase 适配器使用 CloudBase PostgreSQL，因此执行：

```text
scripts/database/tax-code-import-cloudbase-postgresql.sql
```

执行前请确认 CloudBase 实例允许创建表、索引和临时表，并且连接用户具有相应权限。

如果使用的是 CloudBase 文档型数据库而不是 CloudBase PostgreSQL，这两份 SQL 不能直接执行，需要另行生成 JSON/Node.js 导入脚本。

## 重复执行

脚本使用 `source_name + source_version` 和 `code + source_version` 做幂等更新，可以重复执行同一版本导入，不会重复插入同一批编码。

## 查询建议

```sql
select code, name, short_name, general_rate_text, description, policy_basis
from public.tax_code_items
where status = 'active'
  and is_summary = false
  and (name ilike '%小麦%' or short_name ilike '%小麦%' or code = '1030101010000000000')
order by code;
```

## 重新生成

如果 Excel 更新了，先修改生成脚本中的 `SOURCE`、`VERSION` 和 `EFFECTIVE_FROM`，再执行：

```bash
python3 scripts/database/generate-tax-code-import-sql.py
```
