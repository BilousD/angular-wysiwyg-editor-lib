import {
    AfterViewInit, ApplicationRef,
    ChangeDetectorRef,
    Component, ComponentFactoryResolver,
    ElementRef,
    EventEmitter, Injector,
    Input,
    OnChanges,
    OnInit,
    Output,
    ViewChild
} from '@angular/core';
import {HelpingTools} from './helping-tools';
import {EditorPluginComponent} from './editor-plugin.component';
import {ButtonTools} from './button-tools';
import {InsertTools} from './insert-tools';
import {Align} from './types';

@Component({
    selector: 'lib-wysiwyg-editor',
    templateUrl: './editor.component.html',
    styleUrls: ['./editor.component.scss']
})
export class EditorComponent implements AfterViewInit {

    tools: HelpingTools;
    buttonTools: ButtonTools;
    insertTools: InsertTools;

    selection: Selection;
    regexParagraph = /<\/p*(h\d)*(pre)*(blockquote)*>/g;
    regexBR = /<br>/g;
    replaceBR = '<br>\n';

    @ViewChild('editor') editorElement: ElementRef<HTMLDivElement>;
    @Input() startingHTMLvalue = '';
    @ViewChild('c1') color1: ElementRef<HTMLInputElement>;
    @ViewChild('c2') color2: ElementRef<HTMLInputElement>;
    // @Output() output: EventEmitter<any> = new EventEmitter<any>();

    boldPressed: boolean;
    underlinePressed: boolean;
    alignPressed: Align;
    caretInZeroText = false;

    imageControlsHidden = true;
    imageHeightInput = '';
    imageWidthInput = '';
    clickedImage: HTMLImageElement;

    tableControlsHidden = true;
    tableControlsTop = 0;
    tableControlsLeft = 0;
    clickedCell: HTMLTableCellElement;

    pluginInstances: EditorPluginComponent[] = [];
    @Input() pluginParameters: { selector: string, attributes: string[] }[];

    @ViewChild('helpDIV') helpDIV: ElementRef<HTMLDivElement>;
    helpPressed = false;

    constructor(private resolver: ComponentFactoryResolver,
                private injector: Injector,
                private app: ApplicationRef) {}

    ngAfterViewInit(): void {
        this.selection = document.getSelection();
        if (this.startingHTMLvalue) {
            this.editorElement.nativeElement.innerHTML = this.startingHTMLvalue;
            // @ts-ignore
            for (const el of this.editorElement.nativeElement.getElementsByTagName('editor-plugin')) {
                const factory = this.resolver.resolveComponentFactory(EditorPluginComponent);
                let content;
                if (el.hasChildNodes()) {
                    content = el.childNodes[0];
                }
                const ref = factory.create(this.injector, null, el);
                this.app.attachView(ref.hostView);
                ref.instance.params = this.pluginParameters;
                this.pluginInstances.push(ref.instance);
                if (content) {
                    ref.instance.setPlugin(content);
                }
            }
        }
        this.tools = new HelpingTools(this.editorElement.nativeElement);
        this.buttonTools = new ButtonTools(this.editorElement.nativeElement, this.tools);
        this.insertTools = new InsertTools(this.editorElement.nativeElement, this.tools, this.resolver, this.injector);

        this.editorElement.nativeElement.addEventListener('selectionchange', () => {
            this.boldPressed = false;
            this.underlinePressed = false;
            if (document.getSelection().rangeCount < 1) {
                return;
            }
            const r = document.getSelection().getRangeAt(0);
            if (this.tools.isSelectionCoveredInTag(r.startContainer, r.endContainer, r.commonAncestorContainer, 'b')) {
                this.boldPressed = true;
            }
            if (this.tools.isSelectionCoveredInTag(r.startContainer, r.endContainer, r.commonAncestorContainer, 'u')) {
                this.underlinePressed = true;
            }
            this.alignPressed = this.tools.isRangeAligned(r);
        });
        window.onclick = (event) => {
            if (!(event.target.matches('.dropbtn') || (event.target.parentElement && event.target.parentElement.matches('.dropbtn')))) {
                const dropdowns = document.getElementsByClassName('dropdown-content');
                let i;
                for (i = 0; i < dropdowns.length; i++) {
                    const openDropdown = dropdowns[i];
                    if (openDropdown.classList.contains('show')) {
                        openDropdown.classList.remove('show');
                    }
                }
            }
        };
    }

    helpToggle(): void {
        this.helpPressed = !this.helpPressed;
    }

    onKeyPress(event: KeyboardEvent): void {
        if (this.helpPressed) { return; }
        // TODO what keypress should do what? --------------------------------------------------------------------------------------------
        if (event.key === 'Enter') {
            event.preventDefault();
            const s = document.getSelection();
            if (!this.tools.isInDiv(s)) {
                // console.error('Error: Selected text does not belong to editor element'); // should it throw error?
                return;
            }
            const r = new Range();
            const range = s.getRangeAt(0);
            let a = range.startContainer;
            let startOffset = range.startOffset;
            let f = range.endContainer;
            let endOffset = range.endOffset;
            let ca = range.commonAncestorContainer;
            const collapsed = range.collapsed;

            let trackNode = document.createTextNode('');

            if (event.shiftKey) {
                // getTextNode if not in, if start != end - remove, insert <br> after, make selection after <br> but before <br>
                let vals = this.tools.getTextNode(a, startOffset);
                a = vals.node;
                startOffset = vals.offset;
                vals = this.tools.getTextNode(f, endOffset);
                f = vals.node;
                endOffset = vals.offset;

                // remove in between, merge paragraphs if a and f in different nodes
                if (a.isSameNode(f)) {
                    if (collapsed) {
                        f = (a as Text).splitText(startOffset);
                    } else {
                        (a as Text).splitText(startOffset);
                        f = (f as Text).splitText(endOffset - startOffset);
                        a.parentNode.removeChild(a.nextSibling);
                    }
                    const ne = document.createElement('br');
                    this.tools.insertAfter(ne, a);
                    if (!f.nextSibling) {
                        f.parentNode.appendChild(document.createElement('br'));
                    }
                    trackNode = f as Text;
                } else {
                    (a as Text).splitText(startOffset);
                    let endOfLine;
                    while (!a.parentNode.isSameNode(ca)) {
                        if (!endOfLine && this.tools.isBlock(a.parentNode)) {
                            endOfLine = a;
                        }
                        while (a.nextSibling) {
                            a.parentNode.removeChild(a.nextSibling);
                        }
                        a = a.parentNode;
                    }
                    let startOfLine;
                    f = (f as Text).splitText(endOffset);
                    while (!f.parentNode.isSameNode(ca)) {
                        if (!startOfLine && this.tools.isBlock(f.parentNode)) {
                            startOfLine = f;
                        }
                        while (f.previousSibling) {
                            f.parentNode.removeChild(f.previousSibling);
                        }
                        f = f.parentNode;
                    }
                    while (!a.nextSibling.isSameNode(f)) {
                        a.parentNode.removeChild(a.nextSibling);
                    }
                    const ne = document.createElement('br');
                    this.tools.insertAfter(ne, endOfLine);
                    while (startOfLine.nextSibling) {
                        ne.parentNode.appendChild(startOfLine.nextSibling);
                    }
                    this.tools.insertAfter(startOfLine, ne);
                    trackNode = startOfLine as Text;
                }

            } else {

                const newParagraph = this.tools.makeBlock();
                if (newParagraph) {
                    ca = newParagraph;
                    if (a.isSameNode(this.editorElement.nativeElement)) {
                        a = a.firstChild;
                    }
                    if (f.isSameNode(this.editorElement.nativeElement)) {
                        f = f.firstChild;
                    }
                }
                // TODO if blockquote - ????????
                // TODO insert new text node before a?
                while (a.nodeType !== 3) {
                    if (a.childNodes) {
                        // select next node
                        if (startOffset >= a.childNodes.length) {
                            const ne = new Text('');
                            a.appendChild(ne);
                            a = ne;
                        } else {
                            a = a.childNodes[startOffset];
                        }
                        startOffset = 0;
                    } else {
                        if (a.nodeName === 'br' || a.nodeName === 'img') {
                            const ne = new Text('');
                            a.parentNode.insertBefore(ne, a);
                            a = ne;
                        } else {
                            const ne = new Text('');
                            a.appendChild(ne);
                        }
                    }
                }
                while (f.nodeType !== 3) {
                    if (f.childNodes) {
                        // select next node
                        if (endOffset >= f.childNodes.length) {
                            const ne = new Text('');
                            f.appendChild(ne);
                            f = ne;
                        } else {
                            f = f.childNodes[endOffset];
                        }
                        endOffset = 0;
                    } else {
                        if (f.nodeName === 'br' || f.nodeName === 'img') {
                            const ne = new Text('');
                            f.parentNode.insertBefore(ne, f);
                            f = ne;
                        } else {
                            const ne = new Text('');
                            f.appendChild(ne);
                        }
                    }
                }

                if (collapsed) {
                    // TODO a could be not a text node?
                    const list = this.tools.getParent(a, 'li', undefined);
                    if (list && !list.textContent) {
                        const ne = document.createElement('p');
                        while (list.firstChild) {
                            ne.appendChild(list.firstChild);
                        }
                        ne.appendChild(document.createElement('br'));
                        // list.parentNode = ol/ul
                        this.tools.insertAfter(ne, list.parentNode);
                        trackNode = a as Text;
                        list.parentNode.removeChild(list);
                    } else {
                        trackNode = (a as Text).splitText(startOffset);
                        this.tools.insertNewBlock(a);
                    }
                } else {
                    const t = (a as Text).splitText(startOffset);
                    if (a.isSameNode(f)) {
                        trackNode = (f as Text).splitText(endOffset - startOffset);
                    } else {
                        trackNode = (f as Text).splitText(endOffset);
                    }
                    let pa = a.parentNode;
                    // remove everything to the right
                    while (!pa.isSameNode(ca)) {
                        while (a.nextSibling) {
                            pa.removeChild(a.nextSibling);
                        }
                        pa = pa.parentNode;
                    }
                    // remove everything to the left
                    let pf = trackNode.parentNode;
                    while (!pf.isSameNode(ca)) {
                        while (trackNode.previousSibling) {
                            pf.removeChild(trackNode.previousSibling);
                        }
                        pf = pf.parentNode;
                    }
                    // remove everything in between    can getChild from cycle above
                    pa = (this.tools.getChild(a, ca) as Node & ParentNode);
                    while (!pa.nextSibling.isSameNode(this.tools.getChild(trackNode, ca))) {
                        pa.parentNode.removeChild(pa.nextSibling);
                    }
                    this.tools.insertNewBlock(a);
                }
            }
            r.setStart(trackNode, 0);
            r.collapse(true);
            document.getSelection().removeAllRanges();
            document.getSelection().addRange(r);
        }
    }

    onKeyDown(event: KeyboardEvent): void {
        if (this.helpPressed) { return; }
        // TODO using deprecated thing
        const char = String.fromCharCode(event.charCode);
        if (this.caretInZeroText) {
            this.caretInZeroText = false;
            const s = document.getSelection();
            if (s.isCollapsed && (s.anchorNode as Text).length === 0 && char) {
                const a = s.anchorNode;
                const range = new Range();
                a.nodeValue = char;
                range.setStart(a, 1);
                s.removeAllRanges();
                s.addRange(range);
            }
        }
        if (event.ctrlKey && (event.key === 'z')) {
            // console.log('ctrl+z');
            // console.log(event);
        }
    }
    block(tag: string): void {
        if (this.helpPressed) { return; }
        this.buttonTools.block(tag);
    }

    tag(tag, attribute?): void {
        if (this.helpPressed) { return; }
        const caretInZeroText = this.buttonTools.tag(tag, attribute);
        if (caretInZeroText) {
            this.caretInZeroText = caretInZeroText;
        }
    }

    getInnerHTML(): string {
        // for (const instance of this.pluginInstances) {
        //     instance.transformToNormal();
        // }
        let str = this.editorElement.nativeElement.innerHTML;
        for (const inst of this.pluginInstances) {
            str = str.replace((inst.topDivElement.nativeElement.parentNode as Element).outerHTML, inst.getTransformedInner());
        }
        return str;
    }

    allowDrop(ev): void {
        if (this.helpPressed) { return; }
        ev.preventDefault();
    }
    drop(ev): void {
        ev.preventDefault();
        if (this.helpPressed) { return; }
        const data = ev.dataTransfer.getData('text');
        const e = document.getElementById(data);
        if (e) {
            e.removeAttribute('id');
            if (ev.target.isSameNode(e)) {
                return;
            }
            if (ev.target.isSameNode(this.editorElement.nativeElement) &&
                this.tools.isBlock(this.editorElement.nativeElement.lastChild)) {
                ev.target.lastChild.appendChild(e);
            } else {
                ev.target.appendChild(e);
            }
        } else {
            const img = new Image();
            img.src = data;
            img.style.maxWidth = '100%';
            if (ev.target.isSameNode(this.editorElement.nativeElement) &&
                this.tools.isBlock(this.editorElement.nativeElement.lastChild)) {
                ev.target.lastChild.appendChild(img);
            } else {
                ev.target.appendChild(img);
            }
        }
    }
    dragStart(ev): void {
        if (ev.target.nodeName.toLowerCase() === 'img') {
            ev.target.id = 'AngularWYSIWYGEditorReservedId';
            ev.dataTransfer.setData('text', ev.target.id);
        }
    }

    onClick(event: MouseEvent): void {
        if (this.helpPressed) { return; }
        const target = event.target as Element;
        if (target.nodeName === 'P' && (target as HTMLElement).style.resize === 'both') {
            // a
        } else if (target instanceof HTMLImageElement && target.classList.contains('editor-icon-img')) {
            this.imageControlsHidden = false;
            this.tableControlsHidden = true;
            if (!target.isSameNode(this.clickedImage)) {
                this.tools.saveResizedImage(this.clickedImage);
            }
            this.clickedImage = target;
            const p = document.createElement('p');
            p.style.cssText = 'resize: both; overflow: hidden; display: inline-block; margin: 0;';
            if (target.style.width) {
                p.style.width = target.style.width;
            }
            if (target.style.height) {
                p.style.height += target.style.height;
            }
            target.style.width = '100%';
            target.style.height = '100%';
            target.parentNode.insertBefore(p, target);
            p.appendChild(target);
            if (target.style['max-height']) {
                this.imageHeightInput = target.style['max-height'];
            }
            if (target.style['max-width']) {
                this.imageWidthInput = target.style['max-width'];
            }
        } else if (target instanceof HTMLTableCellElement) {
            if (!this.imageControlsHidden) {
                this.tools.saveResizedImage(this.clickedImage);
            }
            this.imageControlsHidden = true;
            this.tableControlsHidden = false;

            this.clickedCell = target;
        } else {
            if (!this.imageControlsHidden) {
                this.tools.saveResizedImage(this.clickedImage);
            }
            this.imageControlsHidden = true;
            this.tableControlsHidden = true;
        }
        // if clicked on image - change div position to click position, and make div visible
        // also remember image that got clicked on (change remembered on each image click)
        // if after clicked on div -
    }

    resizeImage(height, width): void {
        if (this.helpPressed) { return; }
        this.clickedImage.style.height = 'auto';
        this.clickedImage.style.width = 'auto';

        // TODO something on empty input
        if (height !== '0' && !isNaN(height)) {
            this.clickedImage.style['max-height'] = height + 'px';
        } else {
            this.clickedImage.style['max-height'] = height;
        }
        if (width !== '0' && !isNaN(width)) {
            this.clickedImage.style['max-width'] = width + 'px';
        } else {
            this.clickedImage.style['max-width'] = width;
        }
    }

    floatImage(float, margin): void {
        if (this.helpPressed) { return; }
        this.clickedImage.style.float = float;
        this.clickedImage.style.margin = margin;
    }

    insertPlugin(): void {
        if (this.helpPressed) { return; }
        const ref = this.insertTools.insertPlugin(this.pluginParameters);
        if (ref) {
            this.app.attachView(ref.hostView);
            this.pluginInstances.push(ref.instance);
        }
    }

    insertTable(cells, rows): void {
        if (this.helpPressed) { return; }
        this.insertTools.insertTable(cells, rows);
    }

    insertRow(toBottom?): void {
        if (this.helpPressed) { return; }
        // this.clickedCell.cellIndex
        const row = this.clickedCell.parentNode as HTMLTableRowElement;
        const tbody = row.parentNode as HTMLTableSectionElement;
        if (toBottom) {
            const newRow = tbody.insertRow(row.rowIndex + 1);
            // tslint:disable-next-line:prefer-for-of
            for (let i = 0; i < row.cells.length; i++) {
                this.tools.insertCell(newRow);
            }
        } else {
            const newRow = tbody.insertRow(row.rowIndex);
            // tslint:disable-next-line:prefer-for-of
            for (let i = 0; i < row.cells.length; i++) {
                this.tools.insertCell(newRow);
            }
        }
    }

    insertColumn(toRight?): void {
        if (this.helpPressed) { return; }
        const tbody = this.clickedCell.parentNode.parentNode as HTMLTableSectionElement;
        const index = this.clickedCell.cellIndex;
        // @ts-ignore
        for (const row of tbody.rows) {
            // if (tbody.rows.hasOwnProperty(rowKey)) { tbody.rows[rowKey]
            if (toRight) {
                this.tools.insertCell(row, index + 1);
            } else {
                this.tools.insertCell(row, index);
            }
            // }
        }
    }

    transformToList(ordered?: boolean): void {
        if (this.helpPressed) { return; }
        this.buttonTools.transformToList(ordered);
    }

    clearFormatting(): void {
        if (this.helpPressed) { return; }
        this.buttonTools.clearFormatting();
    }

    toggleDropdown(dropDown: HTMLDivElement): void {
        dropDown.classList.toggle('show');
    }

    align(al: string): void {
        if (this.helpPressed) { return; }
        this.buttonTools.align(al);
    }
}
