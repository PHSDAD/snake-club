# 貪吃蛇 · SNAKE CLUB

**[點此線上遊玩](https://phsdad.github.io/snake-club/)**

無須安裝套件的瀏覽器遊戲。直接用瀏覽器開啟根目錄的 `index.html` 即可遊玩；這個單檔版本也適合 GitHub Pages。可編輯的分檔原始碼位於 `dist/`：`index.html`、`style.css`、`app.js` 與 `engine.js`。所有素材均在本機，無外部資源依賴。

- 方向鍵或 WASD：轉向
- Enter：開始；空白鍵：暫停／繼續；R：重新開始
- 手機：滑動棋盤或使用方向按鈕
- 每顆果實 10 分；撞牆或撞到自己即結束
- 三種速度可以隨時切換，最高分儲存在目前瀏覽器
- 切換視窗或頁籤時自動暫停

本機預覽：`node preview.cjs`，開啟 http://127.0.0.1:4173。

規則測試：`node --test tests/engine.test.cjs`。

GitHub Pages 已從主分支的根目錄 `/` 發佈。
