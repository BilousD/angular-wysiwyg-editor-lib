import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditorPluginComponent } from './editor-plugin.component';

describe('EditorPluginComponent', () => {
  let component: EditorPluginComponent;
  let fixture: ComponentFixture<EditorPluginComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EditorPluginComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(EditorPluginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
