# FarmKonnect - Phase 2 Panel EDA

- Built: 2026-05-25 17:04 UTC
- Source: `commodityprices` FQP, excluded:{$ne:true}, real Date only
- Scope: Wheat, Rice, Paddy, Maize, Sugar, Seed Cotton (Phutti)
- Resample: W-FRI mean - ffill <= 4w - winsor 1%/99%

**Panel:** 64,247 weekly rows - 146 series - 2009-01-02 -> 2026-05-29
**Filled rows:** 6,467 (10.1%) - **Winsorized rows:** 1,020 (1.6%)

## Per-commodity overview

| commodity            |   series |   cities |   varieties | start      | end        |   present_weeks |   filled_weeks |   winsorized_weeks |   price_min |   price_max |
|:---------------------|---------:|---------:|------------:|:-----------|:-----------|----------------:|---------------:|-------------------:|------------:|------------:|
| Maize                |       13 |       13 |           1 | 2009-01-02 | 2026-05-29 |            8094 |            635 |                150 |      400    |     4000    |
| Paddy                |       30 |       13 |           3 | 2009-01-02 | 2026-05-22 |            2611 |            973 |                 63 |      420    |     8840    |
| Rice                 |       67 |       14 |           5 | 2009-01-02 | 2026-05-29 |           28333 |           2615 |                441 |      865.83 |    14900    |
| Seed Cotton (Phutti) |        8 |        8 |           1 | 2009-01-02 | 2026-02-20 |            2081 |            593 |                 46 |     1079.82 |    10660    |
| Sugar                |       14 |       14 |           1 | 2009-01-02 | 2026-05-29 |            8994 |            766 |                170 |       35.73 |      178.54 |
| Wheat                |       14 |       14 |           1 | 2009-01-02 | 2026-05-29 |            7667 |            885 |                150 |      832.45 |     5240    |

## Coverage (worst 15 series by coverage %)

| commodity            | variety     | city         | start      | end        |   present_weeks |   coverage_pct |
|:---------------------|:------------|:-------------|:-----------|:-----------|----------------:|---------------:|
| Rice                 | Kainat New  | Lahore       | 2018-12-28 | 2025-12-12 |               2 |            0.5 |
| Rice                 | Basmati 385 | Lahore       | 2011-07-01 | 2020-11-20 |               3 |            0.6 |
| Rice                 | Basmati 385 | Sialkot      | 2009-10-23 | 2022-07-15 |               6 |            0.9 |
| Rice                 | Basmati 385 | Gujranwala   | 2009-06-26 | 2015-11-13 |               6 |            1.8 |
| Rice                 | Kainat New  | BahawalNagar | 2017-02-24 | 2026-02-20 |              11 |            2.3 |
| Rice                 | Kainat New  | RahimYarKhan | 2017-06-02 | 2019-05-10 |               3 |            2.9 |
| Paddy                | IRRI        | Layyah       | 2012-03-30 | 2013-04-19 |               2 |            3.6 |
| Paddy                | Basmati     | Faisalabad   | 2012-04-27 | 2021-12-24 |              21 |            4.2 |
| Paddy                | IRRI        | RahimYarKhan | 2009-02-06 | 2016-02-12 |              19 |            5.2 |
| Paddy                | IRRI        | Chichawatni  | 2009-10-09 | 2021-10-15 |              34 |            5.4 |
| Paddy                | Basmati     | Gujranwala   | 2009-10-09 | 2022-09-30 |              37 |            5.5 |
| Paddy                | IRRI        | Faisalabad   | 2019-07-26 | 2022-06-10 |              11 |            7.3 |
| Paddy                | Basmati     | RahimYarKhan | 2009-01-09 | 2016-02-12 |              34 |            9.2 |
| Rice                 | Kainat New  | Okara        | 2017-05-12 | 2026-05-29 |              45 |            9.5 |
| Seed Cotton (Phutti) |             | BahawalNagar | 2009-01-02 | 2023-07-14 |              74 |            9.7 |

## Gaps > 4w (top 15 by length)

| commodity            | variety           | city         | gap_start   | gap_end    |   gap_weeks |
|:---------------------|:------------------|:-------------|:------------|:-----------|------------:|
| Paddy                | IRRI              | Sargodha     | 2011-06-03  | 2025-09-19 |         747 |
| Seed Cotton (Phutti) |                   | Jhang        | 2013-03-29  | 2023-07-07 |         537 |
| Rice                 | Basmati Super Old | Layyah       | 2017-01-06  | 2025-12-05 |         466 |
| Rice                 | Basmati 385       | Sargodha     | 2012-06-22  | 2021-01-22 |         449 |
| Rice                 | IRRI              | Layyah       | 2017-06-09  | 2025-10-17 |         437 |
| Rice                 | Basmati Super Old | Jhang        | 2010-03-19  | 2017-03-24 |         367 |
| Rice                 | Kainat New        | Lahore       | 2019-01-04  | 2025-12-05 |         362 |
| Seed Cotton (Phutti) |                   | BahawalNagar | 2010-11-05  | 2017-07-28 |         352 |
| Seed Cotton (Phutti) |                   | Okara        | 2017-01-13  | 2023-07-28 |         342 |
| Rice                 | Kainat New        | BahawalNagar | 2020-02-07  | 2026-02-13 |         315 |
| Rice                 | Basmati 385       | BahawalNagar | 2020-02-07  | 2026-02-06 |         314 |
| Rice                 | Basmati 385       | Lahore       | 2011-07-08  | 2017-06-02 |         309 |
| Rice                 | Basmati Super New | Jhang        | 2017-04-14  | 2023-02-03 |         304 |
| Rice                 | Basmati 385       | Jhang        | 2017-06-16  | 2023-02-17 |         297 |
| Rice                 | Basmati 385       | Sialkot      | 2009-10-30  | 2015-07-03 |         297 |

Total long gaps: 885
