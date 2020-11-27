# AngularWysiwygEditorLib

## Using lib

Install lib `npm i @bilousd/angular-wysiwyg-editor-lib`,  
import lib in app.module.ts
`import {AngularWysiwygEditorLibModule} from 'angular-wysiwyg-editor-lib';` 
and `AngularWysiwygEditorLibModule` inside `imports` array,  
then put in your html `<lib-wysiwyg-editor startingHTMLvalue="Hello <b>world!</b>"></lib-wysiwyg-editor>`,  
Use child function `getInnerHTML()` to get created html.  
`startingHTMLvalue` for initial value inside editor.  
`pluginParameters` for inserting plugins into a html (structure: `{ selector: string, attributes: string[] }[]`).  
If you are inserting plugins outside of editor, be sure it is covered in `<editor-plugin>` tag, 
and it is outside of block of text (outside of `<p>`, `<h1>` etc.).
There is no guarantee that custom tags, and plugin tags outside of blocks will be displayed or edited properly. 
  


This library was generated with [Angular CLI](https://github.com/angular/angular-cli) version 10.1.6.

