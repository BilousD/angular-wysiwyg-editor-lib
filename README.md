# AngularWysiwygEditorLib

## Using lib

Install lib `npm i @bilousd/angular-wysiwyg-editor-lib`,  
import lib in app.module.ts
`import {AngularWysiwygEditorLibModule} from 'angular-wysiwyg-editor-lib';` and `AngularWysiwygEditorLibModule` inside `imports` array,  
then put in your html `<lib-wysiwyg-editor startingHTMLvalue="Hello <b>world!</b>"></lib-wysiwyg-editor>`,  
Use child function `getInnerHTML()` to get created html,`startingHTMLvalue` is not necessary parameter.

This library was generated with [Angular CLI](https://github.com/angular/angular-cli) version 10.1.6.

## Code scaffolding

Run `ng generate component component-name --project angular-wysiwyg-editor-lib` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module --project angular-wysiwyg-editor-lib`.
> Note: Don't forget to add `--project angular-wysiwyg-editor-lib` or else it will be added to the default project in your `angular.json` file. 

## Build

Run `ng build angular-wysiwyg-editor-lib` to build the project. The build artifacts will be stored in the `dist/` directory.

## Publishing

After building your library with `ng build angular-wysiwyg-editor-lib`, go to the dist folder `cd dist/angular-wysiwyg-editor-lib` and run `npm publish`.

## Running unit tests

Run `ng test angular-wysiwyg-editor-lib` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI README](https://github.com/angular/angular-cli/blob/master/README.md).
