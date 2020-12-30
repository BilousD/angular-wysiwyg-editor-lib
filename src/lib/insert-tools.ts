import { HelpingTools } from './helping-tools';
import {EditorPluginComponent} from './editor-plugin.component';
import {ComponentFactoryResolver, ComponentRef, Injector} from '@angular/core';

export class InsertTools {
    editorElement: Element;
    tools: HelpingTools;
    resolver: ComponentFactoryResolver;
    injector: Injector;

    constructor(editor, tools, resolver: ComponentFactoryResolver, injector: Injector) {
        this.editorElement = editor;
        this.tools = tools;
        this.resolver = resolver;
        this.injector = injector;
    }

    insertPlugin(pluginParameters): ComponentRef<EditorPluginComponent> {
        const s = document.getSelection();

        const factory = this.resolver.resolveComponentFactory(EditorPluginComponent);
        const newNode = document.createElement('editor-plugin');

        if (!this.tools.isInDiv(s)) {
            this.editorElement.appendChild(newNode);
            this.editorElement.appendChild(document.createElement('br'));
        } else {
            const r = s.getRangeAt(0);
            let f = r.endContainer;
            const offset = r.endOffset;
            const collapsed = r.collapsed;
            // problem: if no block, tag will be inserted, but it will be inside one when blocks will be created
            this.tools.makeBlock();

            while (this.tools.isBlock(f) || f.parentNode.isSameNode(this.editorElement)) {
                f = f.parentNode;
            }
            if (offset === 0 && collapsed) {
                f.parentNode.insertBefore(newNode, f);
            } else {
                this.tools.insertAfter(newNode, f);
            }
        }

        const ref = factory.create(this.injector, null, newNode);
        ref.instance.params = pluginParameters;
        return ref;
    }

    insertTable(cells, rows): void {
        if (rows < 1 || cells < 1) { return; }
        const s = document.getSelection();

        const newNode = document.createElement('table');
        newNode.style.width = '100%';
        newNode.style.maxWidth = '100%';
        newNode.style.marginBottom = '20px';
        newNode.style.borderCollapse = 'collapse';
        newNode.style.border = '1px solid #ddd';
        const tbody = newNode.createTBody();


        if (!this.tools.isInDiv(s)) {
            this.tools.makeBlock();
            this.editorElement.appendChild(newNode);
            const p = document.createElement('p');
            p.appendChild(document.createElement('br'));
            this.editorElement.appendChild(p);
        } else {
            const r = s.getRangeAt(0);
            let f = r.endContainer;
            const offset = r.endOffset;
            const collapsed = r.collapsed;
            this.tools.makeBlock();

            while (!(this.tools.isBlock(f) || f.parentNode.isSameNode(this.editorElement) || f.isSameNode(this.editorElement))) {
                f = f.parentNode;
            }
            if (f.isSameNode(this.editorElement)) {
                // div, so offsets counts differently
                this.tools.insertAfter(newNode, f.childNodes[offset]);
                if (!newNode.nextSibling) {
                    const p = document.createElement('p');
                    p.appendChild(document.createElement('br'));
                    this.tools.insertAfter(p, newNode);
                }
            } else if (offset === 0) {
                // WHAT IS THIS?
                f.parentNode.insertBefore(newNode, f);
            } else {
                this.tools.insertAfter(newNode, f);
            }
        }

        for (let i = 0; i < rows * 1; i++) {
            const row = tbody.insertRow();
            for (let j = 0; j < cells * 1; j++) {
                const cell = row.insertCell();
                cell.style.border = '1px solid #ddd';
                cell.appendChild(document.createElement('br'));
            }
        }
    }
}
