import {
    AfterViewInit,
    ChangeDetectorRef,
    Component,
    ElementRef,
    EventEmitter,
    Input,
    OnChanges,
    OnInit,
    Output,
    ViewChild
} from '@angular/core';
import {HelpingTools} from './helping-tools';
import {MatDialog} from '@angular/material/dialog';

@Component({
    selector: 'app-test-editor',
    templateUrl: './editor.component.html',
    styleUrls: ['./editor.component.scss']
})
export class EditorComponent implements AfterViewInit {

    tools: HelpingTools;
    selection: Selection;
    innerHTMLasString = '';
    regexParagraph = /<\/p*(h\d)*(pre)*(blockquote)*>/g;
    regexBR = /<br>/g;
    replaceBR = '<br>\n';

    @ViewChild('editor') editorElement: ElementRef<HTMLDivElement>;
    @Input() placeholder = '';
    @ViewChild('c1') color1: ElementRef<HTMLInputElement>;
    @ViewChild('c2') color2: ElementRef<HTMLInputElement>;
    // @Output() output: EventEmitter<any> = new EventEmitter<any>();

    boldPressed: boolean;
    underlinePressed: boolean;
    caretInZeroText = false;

    imageControlsHidden = true;
    imageControlsTop = 0;
    imageControlsLeft = 0;
    clickedImage: HTMLImageElement;

    @ViewChild('helpDIV') helpDIV: ElementRef<HTMLDivElement>;
    helpPressed = false;

    constructor(private dialog: MatDialog) {}

    ngAfterViewInit(): void {
        this.selection = document.getSelection();
        if (this.placeholder) {
            this.editorElement.nativeElement.innerHTML = this.placeholder;
        }
        this.tools = new HelpingTools(this.editorElement.nativeElement);
        console.log(this.editorElement);
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
        if (event.key === 'Enter') {
            event.preventDefault();
            const s = document.getSelection();
            if (!this.tools.isInDiv(s)) {
                // return null;
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
                a = a.firstChild;
                f = f.firstChild;
            }
            // TODO br
            // TODO if blockquote - ????????

            let trackNode = document.createTextNode('');

            while (a.nodeType !== 3) {
                // if children - select child based on offset
                // offset 1 - after 1-st element, if text - select text with 0 offset
                //                                  else make text and select it
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
                // TODO a could be not a text node
                trackNode = (a as Text).splitText(anchorOffset);
                this.tools.insertNewBlock(a);
            } else {
                const t = (a as Text).splitText(anchorOffset);
                trackNode = (f as Text).splitText(focusOffset);
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
        // check selection to be inside div
        const s = document.getSelection();
        if (!this.tools.isInDiv(s)) {
            return null;
        }
        // TODO if no blocks make block
        const r = s.getRangeAt(0);
        const a = r.startContainer;
        const f = r.endContainer;
        const startOffset = r.startOffset;
        const endOffset = r.endOffset;

        this.tools.makeBlock();

        let pa = this.tools.getChild(a, this.editorElement.nativeElement);
        const pf = this.tools.getChild(f, this.editorElement.nativeElement);

        while (!pa.isSameNode(pf)) {
            const temp = pa.nextSibling;
            if (this.tools.isBlock(pa)) {
                if (pa.nodeName.toLowerCase() !== tag) {
                    this.tools.replaceNode(pa, tag);
                }
            } else {
                this.tools.putInBlock(pa, tag);
            }
            pa = temp;
        }

        if (this.tools.isBlock(pf)) {
            if (pf.nodeName.toLowerCase() !== tag) {
                this.tools.replaceNode(pf, tag);
            }
        } else {
            this.tools.putInBlock(pa, tag);
        }

        const range = new Range();
        range.setStart(a, startOffset);
        range.setEnd(f, endOffset);

        document.getSelection().removeAllRanges();
        document.getSelection().addRange(range);
        this.innerHTMLasString = this.editorElement.nativeElement.innerHTML;
        // this.output.emit(this.editorElement.nativeElement.innerHTML
        //     .replace(/<\/p*(h\d)*(pre)*(blockquote)*>/g, '$&\n')
        //     .replace(/<br>/g, '<br>\n'));
    }

    tag(tag, attribute?): void {
        if (this.helpPressed) { return; }
        // check selection to be inside div
        const s = document.getSelection();

        const r = s.getRangeAt(0);
        let a = r.startContainer;
        let f = r.endContainer;
        let rangeStart = a;
        let startOffset = r.startOffset;
        let rangeEnd = f;
        let endOffset = r.endOffset;
        const ca = r.commonAncestorContainer;

        if (!this.tools.isInDiv(s)) {
            return;
        }

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
                const ne = new Text('');
                if (a.nodeName === 'br' || a.nodeName === 'img') {
                    a.parentNode.insertBefore(ne, a);
                } else {
                    a.appendChild(ne);
                }
                rangeStart = a = ne;
                startOffset = 0;
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
                const ne = new Text('');
                if (f.nodeName === 'br' || f.nodeName === 'img') {
                    f.parentNode.insertBefore(ne, f);
                } else {
                    f.appendChild(ne);
                }
                rangeEnd = f = ne;
                endOffset = 0;
            }
        }

        if (r.collapsed) {
// START = END -------------------------------------------------------------------------------------
            let txt = new Text('');
            if ((a as Text).length === 0) {
                txt = a as Text;
            } else {
                a = (a as Text).splitText(startOffset);
            }
            const tp = this.tools.getParent(a, tag, attribute);
            if (tp) {
                // </tag> MOVE CARET HERE <tag>
                // 2 COPIES - 1 FOR '' txt NODE, 1 FOR RIGHT SIBLINGS
                // TODO a.ps could be null?
                let pa = a.parentNode;
                // if a = '', and tp has only one child - remove tp keeping child
                // if a = '', and tp has multiple children - everything already split into 3, ( <b> 123 <u></u> 456 </b> )
                // original -> [ 123 ] <u> [ 456 ] <- cloned
                this.tools.split(a.previousSibling, tp.parentNode);

                let ne: Node = txt;
                while (!pa.isSameNode(tp)) {
                    const pc = pa.cloneNode(false);
                    pc.appendChild(ne);
                    ne = pc;
                    pa = pa.parentNode;
                }
                // TODO tp.nextSibling should be clone of tp (need testing)
                tp.parentNode.insertBefore(ne, tp.nextSibling);
            } else {
                const ne = this.tools.createElement(tag, attribute);
                a.parentNode.insertBefore(ne, a);
                ne.appendChild(txt);
            }
            this.caretInZeroText = true;
            const range2 = new Range();
            range2.setStart(txt, 0);
            range2.collapse(true);
            s.removeAllRanges();
            s.addRange(range2);
            return;
        }

        if (a.isSameNode(f)) {
// START AND END IN SAME NODE ----------------------------------------------------------------------
            rangeStart = rangeEnd = a = f = (a as Text).splitText(startOffset);
            (f as Text).splitText(endOffset - startOffset);

            const tagParent = this.tools.getParent(a, tag, attribute);
            if (tagParent) {
                // cover siblings in tag up to getParent and remove GP
                let gen = a;
                while (!gen.isSameNode(tagParent)) {
                    let start = gen.parentNode.firstChild;
                    // before gen
                    let ne = this.tools.createElement(tag, attribute);
                    while (!start.isSameNode(gen)) {
                        start = start.nextSibling;
                        ne.appendChild(start.previousSibling);
                    }
                    gen.parentNode.insertBefore(ne, gen);
                    // after gen
                    start = gen.nextSibling;
                    ne = this.tools.createElement(tag, attribute);
                    while (start) {
                        const ns = start.nextSibling;
                        ne.appendChild(start);
                        if (ns) {
                            start = ns;
                        } else {
                            start = null;
                        }
                    }
                    gen.parentNode.appendChild(ne);
                    // moving upwards
                    gen = gen.parentNode;
                }
                // remove tagParent, siblings before selection and sibling after should be covered in tag
                this.tools.removeNodeSavingChildren(tagParent);
            } else {
                this.tools.coverNodeInNewElement(a, tag, attribute);
            }
        } else {
            rangeStart = a = (a as Text).splitText(startOffset);
            (f as Text).splitText(endOffset);

            if (this.tools.isSelectionCoveredInTag(a, f, ca, tag, attribute)) {
// REMOVING TAG ------------------------------------------------------------------------------------
                // go through start to getParent, cover prev siblings, go through end to gp, cover ns
                // if ca is above gp - from gp to ca uncover ns and ps
                let start = a;
                let end = this.tools.getParent(a, tag, attribute);
                while (!start.isSameNode(end)) {
                    if (start.previousSibling) {
                        const ne = this.tools.createElement(tag, attribute);
                        while (start.previousSibling) {
                            this.tools.movePrevious(start, ne);
                        }
                        start.parentNode.insertBefore(ne, start);
                    }
                    start = start.parentNode;
                }
                start = f;
                end = this.tools.getParent(f, tag, attribute);
                while (!start.isSameNode(end)) {
                    if (start.nextSibling) {
                        const ne = this.tools.createElement(tag, attribute);
                        while (start.nextSibling) {
                            ne.appendChild(start.nextSibling);
                        }
                        start.parentNode.appendChild(ne);
                    }
                    start = start.parentNode;
                }
                if (ca.contains(end)) {
                    let gp = this.tools.getParent(a, tag, attribute);
                    start = this.tools.removeNodeSavingChildren(gp);
                    while (!start.isSameNode(ca)) {
                        // check for block?  && !this.tools.isBlock(start)
                        while (start.nextSibling) {
                            this.tools.removeTagNodeOrTagFromChildren(start.nextSibling, tag, attribute);
                        }
                        start = start.parentNode;
                    }
                    gp = end;
                    if (end.previousSibling) {
                        end = end.previousSibling;
                    } else {
                        end = end.parentNode;
                    }
                    this.tools.removeNodeSavingChildren(gp);
                    while (!end.isSameNode(ca)) {
                        while (end.previousSibling) {
                            this.tools.removeTagNodeOrTagFromChildren(end.previousSibling, tag, attribute);
                        }
                        end = end.parentNode;
                    }
                    start = start.nextSibling;
                    while (!start.isSameNode(end)) {
                        this.tools.removeTagNodeOrTagFromChildren(start, tag, attribute);
                        start = start.nextSibling;
                    }
                } else {
                    this.tools.removeNodeSavingChildren(end);
                }
            } else {
// ADDING TAG --------------------------------------------------------------------------------------
                let tagParent = this.tools.getParent(a, tag, attribute);
                if (tagParent) {
                    if (!tagParent.parentNode.isSameNode(ca) && !this.tools.isBlock(tagParent.parentNode)) {
                        this.tools.coverToRight(tagParent, ca, tag, attribute);
                    }
                } else {
                    if (!a.parentNode.isSameNode(ca) && !this.tools.isBlock(a.parentNode)) {
                        this.tools.coverToRight(a, ca, tag, attribute);
                    } else {
                        this.tools.coverNodeInNewElement(a, tag, attribute);
                    }
                }
                // TODO if isBlock - join right up to ca, but different covering (below block)?
                // this | for blockquote or some thing like this where blocks could be stacked
                // should be not 'else' but after, if coverToRight stopped at block but still not below CA

                let start = this.tools.getChild(a, ca).nextSibling;
                const end = this.tools.getChild(f, ca);
                while (!start.isSameNode(end)) {
                    if (start.nodeType === 1) {
                        const collection = (start as Element).getElementsByTagName(tag);
                        // tslint:disable-next-line:prefer-for-of
                        for (let i = 0; i < collection.length; i++) {
                            this.tools.removeNodeSavingChildren(collection[i]);
                        }
                    }
                    if (this.tools.isBlock(start)) {
                        const ne = this.tools.createElement(tag, attribute);
                        // TODO start.firstChild could be block if lost of blockquotes
                        while (start.firstChild) {
                            ne.appendChild(start.firstChild);
                        }
                        start.appendChild(ne);
                        start = start.nextSibling;
                    } else {
                        start = start.nextSibling;
                        if (start.previousSibling.nodeName.toLowerCase() === tag &&
                            this.tools.hasAttribute(start.previousSibling, attribute)) {
                            this.tools.coverNodeInNewElement(start.previousSibling, tag, attribute);
                        }
                    }
                }

                tagParent = this.tools.getParent(f, tag, attribute);
                if (tagParent) {
                    if (!tagParent.parentNode.isSameNode(ca) && !this.tools.isBlock(tagParent.parentNode)) {
                        this.tools.coverToLeft(tagParent, ca, tag, attribute);
                    }
                } else {
                    if (!f.parentNode.isSameNode(ca) && !this.tools.isBlock(f.parentNode)) {
                        this.tools.coverToLeft(f, ca, tag, attribute);
                    } else {
                        this.tools.coverNodeInNewElement(f, tag, attribute);
                    }
                }
            }
        }

        // TODO fix this
        this.tools.clean();
        this.tools.clean();
        const range = new Range();
        range.setStart(rangeStart, 0);
        range.setEnd(rangeEnd, (rangeEnd as Text).length);
        document.normalize();
        document.getSelection().removeAllRanges();
        document.getSelection().addRange(range);

        this.innerHTMLasString = this.editorElement.nativeElement.innerHTML;
        // this.output.emit(this.editorElement.nativeElement.innerHTML
        //     .replace(/<\/p*(h\d)*(pre)*(blockquote)*>/g, '$&\n')
        //     .replace(/<br>/g, '<br>\n'));
    }

    getInnerHTML(): string {
        return this.innerHTMLasString;
    }

    allowDrop(ev): void {
        if (this.helpPressed) { return; }
        ev.preventDefault();
    }
    drop(ev): void {
        ev.preventDefault();
        if (this.helpPressed) { return; }
        const data = ev.dataTransfer.getData('text');
        if (document.getElementById(data)) {
            ev.target.appendChild(document.getElementById(data));
        } else {
            const img = new Image();
            img.src = data;
            img.ondrag = this.drag;
            img.style.height = 'auto';
            img.style.width = 'auto';
            ev.target.appendChild(img);
        }
        this.innerHTMLasString = this.editorElement.nativeElement.innerHTML;
    }
    drag(ev): void {
        ev.dataTransfer.setData('text', ev.target.id);
    }

    onClick(event: MouseEvent): void {
        if (this.helpPressed) { return; }
        const target = event.target as Element;
        if (target instanceof HTMLImageElement) {
            this.imageControlsHidden = false;
            this.imageControlsTop = event.clientY + 5;
            this.imageControlsLeft = event.clientX + 5;
            this.clickedImage = target;
        } else {
            this.imageControlsHidden = true;
        }
        // if clicked on image - change div position to click position, and make div visible
        // also remember image that got clicked on (change remembered on each image click)
        // if after clicked on div -
        this.innerHTMLasString = this.editorElement.nativeElement.innerHTML;
    }

    resizeImage(height, width): void {
        if (this.helpPressed) { return; }
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
}
