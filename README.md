[中文](https://github.com/hogmoff/siyuan-plugin-templater/blob/main/README_zh_CN.md)

# SiYuan plugin templater

![Preview](preview.png)

## Overview
The Plugin manage handling of template dependend from the created path

## Features
- Manage rules in Settings
- Dependend from the path as regex apply a different template
- Support any markdown-template in the template folder of the workspace
- Move file to specific folder (support date format template variables, such as /Meeting/{{now | date "2006/01"}}/{{now | date "2006-01-02"}})
- Set Icon for Templates with Emoji-Picker
  - Additionally, you can use `{{date}}` or `{{week}}` as the icon string.
    - `{{date}}`: Renders a dynamic SVG icon representing the current day of the month (e.g., a calendar page showing the day).
    - `{{week}}`: Renders a dynamic SVG icon representing the current week of the year (e.g., a calendar page showing "W" followed by the week number).

## Installation
To install the plugin, download it from the Siyuan plugin marketplace or clone the repository and add it to your Siyuan plugins folder.

### Clone repository and build
``` bash
git clone https://github.com/hogmoff/siyuan-plugin-templater.git
cd siyuan-plugin-templater
npm install
npm run build
```

## Usage
To use the plugin, enable it in the Siyuan settings, then add the rules in Settings. After saving the new rules will be shown in a list. 

### Template Path
Set the Template path relative to workspace (e.g. data/templates/example.md)

### Save Path
Set the Save Path if you need a specific target location for the rendered template. 
If field is empty then document will be created on current path and ask for document name. Save Path support date format template variables from daily notes. Not existing paths are created.

#### Example
> "/Meeting/{{now | date "2006/01"}}/Meeting {{now | date "2006-01-01"}} creates a new document in folder "/Meeting/20xx/xx/" with name "Meeting 20xx-xx-xx" (today date) 

## Available Languages
- English
- Chinese (machine translated)
- German

If you want add or edit the Language file, add a pull request in English to the project.

## Limitations
- No differentation between notebooks.
- Tested only in Desktop and Web Version.
- Compatibility may vary depending on the Siyuan version.

## Image
[Icon from Freepik](https://de.freepik.com/icon/wegweiser_3501183#fromView=family&page=1&position=51&uuid=446d41f8-5f18-4105-a681-b4447b91efe7)


## Link to external resources
Special Thanks to the contributors and maintainers of related open-source projects:
- https://github.com/SilentVoid13/Templater
