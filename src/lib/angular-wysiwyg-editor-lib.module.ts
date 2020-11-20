import { NgModule } from '@angular/core';
import { EditorComponent } from './editor.component';
import {MatButtonModule} from '@angular/material/button';
import {MatMenuModule} from '@angular/material/menu';
import {MatIconModule} from '@angular/material/icon';
import {CommonModule} from '@angular/common';
import {MatCardModule} from '@angular/material/card';
import {MatDialogModule} from '@angular/material/dialog';



@NgModule({
  declarations: [
      EditorComponent
  ],
    imports: [
        MatButtonModule,
        MatMenuModule,
        MatIconModule,
        CommonModule,
        MatCardModule,
        MatDialogModule
    ],
  exports: [EditorComponent]
})
export class AngularWysiwygEditorLibModule { }
