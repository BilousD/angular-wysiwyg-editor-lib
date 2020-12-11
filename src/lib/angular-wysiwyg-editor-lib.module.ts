import { NgModule } from '@angular/core';
import { EditorComponent } from './editor.component';
import {CommonModule} from '@angular/common';
import {EditorPluginComponent} from './editor-plugin.component';
import {DynamicHTMLModule} from './dynamic-html';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';



@NgModule({
  declarations: [
      EditorComponent,
      EditorPluginComponent
  ],
    imports: [
        CommonModule,
        DynamicHTMLModule.forRoot({
            components: [
                {component: EditorPluginComponent, selector: 'editor-plugin'}
            ]
        }),
        ReactiveFormsModule,
        FormsModule
    ],
  exports: [EditorComponent]
})
export class AngularWysiwygEditorLibModule { }
