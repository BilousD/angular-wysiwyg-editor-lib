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
import {MatDialog} from '@angular/material/dialog';
import {EditorPluginComponent} from './editor-plugin.component';
import {ButtonTools} from './button-tools';
import {InsertTools} from './insert-tools';

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
    innerHTMLasString = '';
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
    caretInZeroText = false;

    imageControlsHidden = true;
    imageControlsTop = 0;
    imageControlsLeft = 0;
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
            const r = document.getSelection().getRangeAt(0);
            if (this.tools.isSelectionCoveredInTag(r.startContainer, r.endContainer, r.commonAncestorContainer, 'b')) {
                this.boldPressed = true;
            }
            if (this.tools.isSelectionCoveredInTag(r.startContainer, r.endContainer, r.commonAncestorContainer, 'u')) {
                this.underlinePressed = true;
            }
        });
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
                console.error('Error: Selected text does not belong to editor element');
                return;
            }
            const r = new Range();
            const range = s.getRangeAt(0);
            let a = range.startContainer;
            let anchorOffset = range.startOffset;
            let f = range.endContainer;
            let focusOffset = range.endOffset;
            let ca = range.commonAncestorContainer;
            const collapsed = range.collapsed;

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
            // TODO br
            // TODO if blockquote - ????????

            let trackNode = document.createTextNode('');

            // TODO insert new text node before a?
            while (a.nodeType !== 3) {
                if (a.childNodes) {
                    // select next node
                    if (anchorOffset >= a.childNodes.length) {
                        const ne = new Text('');
                        a.appendChild(ne);
                        a = ne;
                    } else {
                        a = a.childNodes[anchorOffset];
                    }
                    anchorOffset = 0;
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
                    if (focusOffset >= f.childNodes.length) {
                        const ne = new Text('');
                        f.appendChild(ne);
                        f = ne;
                    } else {
                        f = f.childNodes[focusOffset];
                    }
                    focusOffset = 0;
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
                trackNode = (a as Text).splitText(anchorOffset);
                this.tools.insertNewBlock(a);
            } else {
                const t = (a as Text).splitText(anchorOffset);
                if (a.isSameNode(f)) {
                    trackNode = (f as Text).splitText(focusOffset - anchorOffset);
                } else {
                    trackNode = (f as Text).splitText(focusOffset);
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
            r.setStart(trackNode, 0);
            r.collapse(true);
            document.getSelection().removeAllRanges();
            document.getSelection().addRange(r);
        }
        // this.output.emit(this.editorElement.nativeElement.innerHTML
        //     .replace(/<\/p*(h\d)*(pre)*(blockquote)*>/g, '$&\n')
        //     .replace(/<br>/g, '<br>\n'));
        this.innerHTMLasString = this.editorElement.nativeElement.innerHTML;
    }

    onKeyDown(event: KeyboardEvent): void {
        if (this.helpPressed) { return; }
        // console.log(event);
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
            console.log('ctrl+z');
            console.log(event);
        }
        this.innerHTMLasString = this.editorElement.nativeElement.innerHTML;
    }
    block(tag: string): void {
        if (this.helpPressed) { return; }
        this.buttonTools.block(tag);
        this.innerHTMLasString = this.editorElement.nativeElement.innerHTML;
    }

    tag(tag, attribute?): void {
        if (this.helpPressed) { return; }
        const caretInZeroText = this.buttonTools.tag(tag, attribute);
        if (caretInZeroText) {
            this.caretInZeroText = caretInZeroText;
        }
        this.innerHTMLasString = this.editorElement.nativeElement.innerHTML;
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
        this.innerHTMLasString = this.editorElement.nativeElement.innerHTML;
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
        if (target instanceof HTMLImageElement) {
            this.imageControlsHidden = false;
            this.tableControlsHidden = true;
            this.imageControlsTop = event.pageY + 5;
            this.imageControlsLeft = event.pageX + 5;
            if (target.style['max-height']) {
                this.imageHeightInput = target.style['max-height'];
            }
            if (target.style['max-width']) {
                this.imageWidthInput = target.style['max-width'];
            }
            this.clickedImage = target;
        } else if (target instanceof HTMLTableCellElement) {
            this.imageControlsHidden = true;
            this.tableControlsHidden = false;
            this.tableControlsTop = event.pageY + 5;
            this.tableControlsLeft = event.pageX + 5;
            this.clickedCell = target;
        } else {
            this.imageControlsHidden = true;
            this.tableControlsHidden = true;
        }
        // if clicked on image - change div position to click position, and make div visible
        // also remember image that got clicked on (change remembered on each image click)
        // if after clicked on div -
        this.innerHTMLasString = this.editorElement.nativeElement.innerHTML;
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
        this.innerHTMLasString = this.editorElement.nativeElement.innerHTML;
    }

    floatImage(float, margin): void {
        if (this.helpPressed) { return; }
        this.clickedImage.style.float = float;
        this.clickedImage.style.margin = margin;
        this.innerHTMLasString = this.editorElement.nativeElement.innerHTML;
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
        this.innerHTMLasString = this.editorElement.nativeElement.innerHTML;
    }

    clearFormatting(): void {
        // if (this.helpPressed) { return; }
        // const s = document.getSelection();
        //
        // if (!this.tools.isInDiv(s)) {
        //     return;
        // }
        // const r = s.getRangeAt(0);
        // let start = r.startContainer;
        // let end = r.endContainer;
        // const rangeStart = r.startContainer;
        // const startOffset = r.startOffset;
        // const rangeEnd = r.endContainer;
        // const endOffset = r.endOffset;
        // const ca = r.commonAncestorContainer;
        //
        // // get selection text? s.toString() - getBlock() - block.child = string?
        // //                                                 block.child = block.wholeText?
        // // remove parents until div editor, put p parent
    }
}
