import { NgModule } from '@angular/core';
import { EditorComponent } from './editor.component';
import {MatButtonModule} from '@angular/material/button';
import {MatMenuModule} from '@angular/material/menu';
import {MatIconModule} from '@angular/material/icon';
import {CommonModule} from '@angular/common';
import {MatCardModule} from '@angular/material/card';
import {MatDialogModule} from '@angular/material/dialog';
import {EditorPluginComponent} from './editor-plugin.component';
import {DynamicHTMLModule} from './dynamic-html';
import {ReactiveFormsModule} from '@angular/forms';
import {MatOptionModule} from '@angular/material/core';
import {MatSelectModule} from '@angular/material/select';



@NgModule({
  declarations: [
      EditorComponent,
      EditorPluginComponent
  ],
    imports: [
        MatButtonModule,
        MatMenuModule,
        MatIconModule,
        CommonModule,
        MatCardModule,
        MatDialogModule,
        DynamicHTMLModule.forRoot({
            components: [
                {component: EditorPluginComponent, selector: 'editor-plugin'}
            ]
        }),
        ReactiveFormsModule,
        MatOptionModule,
        MatSelectModule
    ],
  exports: [EditorComponent]
})
export class AngularWysiwygEditorLibModule { }
