[English](https://github.com/hogmoff/siyuan-plugin-templater/blob/main/README.md)

# 思源插件模板

![Preview](preview.png)

## 概述
該插件管理模板的處理，根據創建的路徑設置圖標並提供擴展功能。

## 功能
- 在設置中管理規則
- 根據筆記本和路徑作為正則表達式應用不同的模板
- 支持工作區模板文件夾中的任何Markdown模板
- 將文件移動到特定文件夾（支持日期格式模板變量，例如 /Meeting/{{now   date "2006/01"}}/{{now | date "2006-01-02"}}）
- 用表情符號選擇器為模板設置圖標
- 設置動態圖標
- 設置自定義屬性的功能

## 安裝
要安裝該插件，請從SiYuan插件市場下載，或克隆存儲庫並將其添加到您的SiYuan插件文件夾中。

### 克隆存儲庫並構建
```bash
git clone https://github.com/hogmoff/siyuan-plugin-templater.git
cd siyuan-plugin-templater
npm install
npm run builduild
```

## 使用方法
要使用該插件，請在思源設定中啟用它，然後在「設定」中新增規則。儲存後，新規則將顯示在清單中。

### 範本路徑
設定相對於工作區的範本路徑（例如 data/templates/example.md）。

### 儲存路徑
如果您需要為渲染後的範本指定目標位置，請設定「儲存路徑」。
如果欄位為空，則將在目前路徑上建立文件並詢問文件名稱。 「儲存路徑」支援每日筆記中的日期格式範本變數。不存在的路徑將不會被創建。

#### 範例
1. > "/Meeting/{{now | date "2006/01"}}/Meeting {{now | date "2006-01-02"}} 會在資料夾「/Meeting/20xx/xx/」中的任何筆記本中建立一個名為「Meeting 20xx-xx-xx」（今天日期）的新文件。

2. > "notebook1/Meeting/{{now | date "2006/01"}}日期“2006/01”}}/會議{{現在| date "2006-01-02"}}" 會在資料夾 "/Meeting/20xx//"" 中建立一個名稱為新的"notebook1"。

### 擴充函數
若要使用模板函數，您必須將函數放在 <%function1 function2 function3 ...%> 之間。字串“<%”必須位於行首，“%>”必須位於行尾。

可用函數：
1. 自訂屬性
您可以使用 [Sprig-Functions](https://masterminds.github.io/sprig/date.html?utm_source=liuyun.io) 設定自訂屬性。

#### 範例
- 使用以下格式為每日筆記設定自訂屬性：<%custom-dailynote-{{now | date "20060102"}}={{now | date "2006-01-02"}}%>

## 可用語言
- 英語
- 中文（機器翻譯）
- 德語

如果您需要新增或編輯語言文件，請在項目中新增英文版拉取請求。

## 問題
如果您發現問題，請在專案中的 [Github 問題](https://github.com/hogmoff/siyuan-plugin-templater/issues) 下僅新增英文版問題。

## 限制
- 僅在桌面版和網頁版中測試。
- 相容性可能因 Siyuan 版本而異。

## 圖片
[圖示來自 Freepik](https://de.freepik.com/icon/wegweiser_3501183#fromView=family&page=1&position=51&uuid=446d41f8-5f18-4105-a681-b4447b91efe7)

## 外部資源鏈接
特別感謝致相關開源專案的貢獻者與維護者：
- https://github.com/SilentVoid13/Templater