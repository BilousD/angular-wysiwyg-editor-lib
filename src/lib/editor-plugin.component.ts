import {AfterContentInit, AfterViewInit, Component, ContentChild, ElementRef, Input, OnInit, ViewChild} from '@angular/core';
import {Form, NgForm} from '@angular/forms';

@Component({
    // tslint:disable-next-line:component-selector
  selector: 'editor-plugin',
  templateUrl: './editor-plugin.component.html',
  styleUrls: ['./editor-plugin.component.scss']
})
export class EditorPluginComponent {
    // TODO discard changes button?

    // problem: connect array of parameters with plugins
    params: { selector: string, attributes: string[] }[];
    selected: { selector: string, attributes: string[] };

    @ViewChild('editable') editableElement: ElementRef<HTMLDivElement>;
    @ViewChild('topDivElement') topDivElement: ElementRef<HTMLDivElement>;
    @ViewChild('myForm') form: NgForm;

    plugin: HTMLElement;
    pluginControlsHidden = true;

    constructor() { }

    setPlugin(el): void {
        this.plugin = el;
        this.params.find(elem => {
            if (this.plugin.nodeName.toLowerCase() === elem.selector) {
                this.selected = elem;
            }
        });
    }

    removePlugin(): void {
        const plugin = this.topDivElement.nativeElement.parentNode;
        plugin.parentNode.removeChild(plugin);
    }

    save(form: NgForm): boolean {
        if (!this.selected) {
            return false;
        }
        // TODO remove attributes of other plugins
        const attributes = form.form.value;
        const newPlugin = document.createElement(this.selected.selector);
        Object.keys(attributes).forEach(key => {
            if (attributes[key]) {
                newPlugin.setAttribute(key, attributes[key]);
            } else {
                if (newPlugin.getAttribute(key)) {
                    newPlugin.removeAttribute(key);
                }
            }
        });
        // TODO could have errors
        if (this.editableElement.nativeElement.firstChild) {
            newPlugin.innerHTML = (this.editableElement.nativeElement.firstChild as Text).textContent;
        } else {
            newPlugin.innerHTML = '';
        }
        this.plugin = newPlugin;
        return true;
    }

    getAttribute(attrib: string): string {
        if (!this.plugin) {
            return '';
        }
        const val = this.plugin.getAttribute(attrib);
        if (val) {
            return val;
        }
        return '';
    }

    transformToNormal(): void {
        const editorPlugin = this.topDivElement.nativeElement.parentNode;
        this.save(this.form);
        if (this.plugin) {
            editorPlugin.appendChild(this.plugin);
            editorPlugin.removeChild(this.topDivElement.nativeElement);
        } else {
            editorPlugin.parentNode.removeChild(editorPlugin);
        }
    }

    getTransformedInner(): string {
        const isSaved = this.save(this.form);
        if (isSaved) {
            return '<editor-plugin>' + this.plugin.outerHTML + '</editor-plugin>';
        } else {
            return '';
        }
    }

}
