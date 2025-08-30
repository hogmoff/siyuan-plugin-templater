英文文档: https://github.com/hogmoff/siyuan-plugin-templater/blob/main/README.md
德文文档: https://github.com/hogmoff/siyuan-plugin-templater/blob/main/README_de_DE.md

# 思源 Templater 插件

![Preview](preview.png)

## 概述
根据“笔记本+路径”规则自动套用模板，可选择目标路径、设置图标、执行扩展函数。也可为每条规则设置快捷键，按下即可立即创建一篇套用模板的新文档。

## 功能
- 规则匹配：基于 笔记本名+路径（正则）匹配不同模板。
- 规则快捷键：为规则绑定组合键，一键创建并套用模板。
- 目标路径：使用 Sprig 表达式渲染，自动创建缺失的文件夹。
- 图标：支持表情符号或动态 SVG 图标。
- 扩展函数：如设置自定义属性等。
- 设置界面：带横向滚动的规则表格与编辑弹窗。

## 安装
从思源插件市场安装，或克隆仓库自行构建：

```bash
git clone https://github.com/hogmoff/siyuan-plugin-templater.git
cd siyuan-plugin-templater
npm install
npm run build
```

## 快速上手
1) 启用插件。
2) 打开 Templater 设置 → 管理模板规则。
3) 新增规则：填写 路径正则、模板、可选的保存路径、图标、快捷键。
4) 保存。表格可横向滚动，显示所有列。

## 模板规则
每条规则包含：
- 路径正则：匹配对象为 “笔记本名称/父级人类可读路径”。示例：`Work/Meetings/.*`。
- 模板：相对工作区的模板路径，如 `data/templates/meeting.md`。
- 描述：规则说明。
- 保存路径（可选）：若设置则在此处创建/移动；为空时在当前目录创建并询问文件名。
- 图标（可选）：表情或动态 SVG。
- 快捷键（可选）：按下后立即按此规则新建文档。

说明
- 正则语法为 JavaScript RegExp。用于匹配 `<NotebookName>/<父级人类可读路径>`。
- 多条规则使用相同快捷键时，以列表中最后一条生效。

## 保存路径（Sprig）
支持 [Sprig](https://masterminds.github.io/sprig/) 的日期/时间函数。缺失的目录会自动创建。

示例
- `/Meeting/{{now | date "2006/01"}}/Meeting {{now | date "2006-01-02"}}`
  → 生成：`/Meeting/20xx/xx/Meeting 20xx-xx-xx`（在当前激活的笔记本中）
- `MyNotebook/Inbox/{{now | date "2006-01"}}` → 仅匹配名为 “MyNotebook” 的笔记本。

保存路径为空时，将提示输入文档名，并保留在当前目录。

## 图标
两种方式：
- 表情：点击图标按钮选择表情，将以代码点形式保存。
- 动态：切换到 “动态图标” 选项卡，选择颜色/语言/日期/类型/内容，插件会生成并设置 SVG。

## 快捷键
每条规则可设置快捷键。按下后立即按该规则创建新文档：
- 写法：如 `Ctrl+Alt+T`、`Shift+Meta+N`（Meta=macOS 上的 Cmd）。
- 作用域：针对当前激活的笔记本（最近一次聚焦的编辑器）。
- 安全：在输入框或可编辑区域输入时不会触发。
- 冲突：若与系统或思源快捷键冲突，可能无法触发，请更换组合键。

## 扩展函数
在模板中以单独一行写入：

```
<% function1 function2 %>
```

目前支持：
- 自定义属性：可结合 Sprig，示例：
```
<% custom-dailynote-{{now | date "20060102"}}={{now | date "2006-01-02"}} %>
```

## 设置界面
- “管理模板规则” 弹窗用于新增/编辑规则，包含：
  - 路径正则、模板、描述、保存路径、图标、快捷键。
  - 表情选择器与动态图标生成器。
  - 点击快捷键输入框后按下组合键；点击 Clear 清除。
- 规则表格带横向滚动，左对齐并显示完整网格线。

## 排错
- 模板未生效：检查路径正则与模板路径是否正确。
- 保存路径无效：检查 Sprig 输出与笔记本名称（若指定）。
- 图标未更新：确认动态图标 URL 已生成后再试。
- 快捷键无响应：避免系统/思源保留组合；确保有编辑器处于激活状态。

## 语言
- 英文、中文、德文（欢迎通过 PR 改进翻译）。

## 许可与致谢
- 图标来源 Freepik: https://de.freepik.com/icon/wegweiser_3501183
- 借鉴项目： https://github.com/SilentVoid13/Templater
