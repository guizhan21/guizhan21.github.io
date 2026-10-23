# 日讀 · 短網址發布器

正式短網址：<https://guizhan21.github.io/>。

這裡只保存 GitHub Pages 發布流程；應用程式、書籍目錄、原文及所有原始音訊的唯一來源是 [daily-reading-github-test](https://github.com/guizhan21/daily-reading-github-test)。音訊仍由原來的 Releases 提供，不重傳、不放入 Pages 或這個 Git 歷史。

流程先確認來源 main 的完整 Actions 與外網驗收均成功，再以同一個 Commit 建置根路徑版本並發布。原來的專案網址保留。兩個網址同源，沿用同一個 `daily-reading-github:v1` 本機進度，不加入帳號或跨設備同步。

支援手動執行；每小時檢查來源是否有新的已驗證版本，未變動就跳過部署。公開的 `publication.json` 記錄真正來源 Commit、驗證工作與書庫雜湊；不含憑證或本機路徑。

發布後再次以 Chrome、Firefox、WebKit 驗證真實 HTTPS、閱讀、音訊與續播。Chrome 另測真正背景分頁接章；iPhone 實機、鎖屏及其他引擎真正背景另行驗證。

回滾：手動指定來源倉庫仍可取得的已成功 `source_run_id`，並勾選 `force`；同樣經過來源驗收門檻，不覆寫原書籍或 Release。
