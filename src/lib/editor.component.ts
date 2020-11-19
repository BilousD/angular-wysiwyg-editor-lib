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
import {HelpDialogComponent} from './help-dialog.component';

@Component({
    selector: 'lib-wysiwyg-editor',
    templateUrl: './editor.component.html',
    styleUrls: ['./editor.component.scss']
})
export class EditorComponent implements AfterViewInit {

    tools: HelpingTools;
    selection: Selection;
    textAsHTML = '';

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

    helpDIV = true;

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

    openDialog(): void {
        this.dialog.open(HelpDialogComponent);
    }

    onKeyPress(event: KeyboardEvent): void {
        if (event.key === 'Enter') {
            event.preventDefault();
            const s = document.getSelection();
            if (!this.tools.isInDiv(s)) {
                // return null;
            }
            const r = new Range();
            const range = s.getRangeAt(0);
            let a = range.startContainer;
            const anchorOffset = range.startOffset;
            let f = range.endContainer;
            const focusOffset = range.endOffset;
            let ca = range.commonAncestorContainer;
            const collapsed = range.collapsed;

            const newParagraph = this.tools.makeBlock();
            if (newParagraph) {
                ca = newParagraph;
            }
            // TODO br
            // TODO if blockquote - ????????

            let trackNode = document.createTextNode('');

            while (a.nodeType !== 3) {
                if (a.firstChild) {
                    a = a.firstChild;
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
                if (f.lastChild) {
                    f = f.lastChild;
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
        this.textAsHTML = this.editorElement.nativeElement.innerHTML
            .replace(/<\/p*(h\d)*(pre)*(blockquote)*>/g, '$&\n')
            .replace(/<br>/g, '<br>\n');
    }
    submit(): void {
        console.log(document.getSelection());
    }

    onKeyDown(event: KeyboardEvent): void {
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
    }
    block(tag: string): void {
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
        this.textAsHTML = this.editorElement.nativeElement.innerHTML
            .replace(/<\/p*(h\d)*(pre)*(blockquote)*>/g, '$&\n')
            .replace(/<br>/g, '<br>\n');
        // this.output.emit(this.editorElement.nativeElement.innerHTML
        //     .replace(/<\/p*(h\d)*(pre)*(blockquote)*>/g, '$&\n')
        //     .replace(/<br>/g, '<br>\n'));
    }

    bold(tag, attribute?): void {
        // check selection to be inside div
        const s = document.getSelection();
        if (!this.tools.isInDiv(s)) {
            return null;
        }
        const r = s.getRangeAt(0);
        let a = r.startContainer;
        const f = r.endContainer;
        const startOffset = r.startOffset;
        let rangeStart = {node: a, offset: r.startOffset};
        let rangeEnd = {node: f, offset: r.endOffset};

        // Messes with nodes, save everything before
        if ((a as Text).length !== 0) {
            this.tools.cleanAndNormalize();
        }
        if (r.collapsed) {
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
                // TODO tp.nextSibling should be clone of tp
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
        // TODO if selection type caret or something - just insert <tag></tag> after cleaning, and put caret inside

        // const sp = this.sameParent(a, f);
        const sp = r.commonAncestorContainer;
        if (a.isSameNode(f)){
            let pa = a.parentNode;
            if (this.tools.getParent(a, tag, attribute)) {
                let nn = this.tools.createElement(tag, attribute);
                const t = (a as Text).splitText(r.startOffset);
                nn.appendChild(a);
                pa.insertBefore(nn, t);
                if (r.endOffset !== t.length) {
                    const t2 = t.splitText(r.endOffset);
                    nn = this.tools.createElement(tag, attribute);
                    nn.appendChild(t2);
                    pa.appendChild(nn);
                }
                rangeStart = {node: t, offset: 0};
                rangeEnd = {node: t, offset: t.length};
                const p = this.tools.getParent(t, tag, attribute);

                while (!pa.isSameNode(p)) {
                    if (pa.previousSibling) {
                        // put all previous siblings into tag
                        nn = this.tools.createElement(tag, attribute);
                        // TODO change to insertFirst()
                        nn.appendChild(pa.previousSibling);
                        while (pa.previousSibling) {
                            nn.insertBefore(pa.previousSibling, nn.firstChild);
                        }
                        pa.parentNode.insertBefore(nn, pa);
                    }
                    if (pa.nextSibling) {
                        nn = this.tools.createElement(tag, attribute);
                        while (pa.nextSibling) {
                            nn.appendChild(pa.nextSibling);
                        }
                        pa.parentNode.appendChild(nn);
                    }
                    const temp = pa.parentNode;
                    this.tools.removeNodeSavingChildren(pa);
                    pa = temp;
                }
                this.tools.removeNodeSavingChildren(pa);

            } else {
                const nn = this.tools.createElement(tag, attribute);
                const t = (a as Text).splitText(r.startOffset);
                if (r.endOffset === t.length) {
                    // <b> |1| <u> 2345 </u> </b>
                    // if (next sibling - insert before)
                    const sibling = t.nextSibling;
                    nn.appendChild(t);
                    if (sibling) {
                        pa.insertBefore(nn, sibling);
                    } else {
                        pa.appendChild(nn);
                    }
                } else {
                    const t2 = t.splitText(r.endOffset);
                    nn.appendChild(t);
                    pa.insertBefore(nn, t2);
                }
                rangeStart = {node: t, offset: 0};
                rangeEnd = {node: t, offset: t.length};
            }
        } else {
            if (r.startOffset > 0) {
                a = (a as Text).splitText(r.startOffset);
                rangeStart = {node: a, offset: 0};
            }
            if (r.endOffset < (f as Text).length) {
                (f as Text).splitText(r.endOffset);
                rangeEnd = {node: f, offset: (f as Text).length};
            }
            // check if anyone between doesnt have <b> (if everyone have - invert <b>)
            // bold everything in between a and f
            // check if has bold inside
            if (this.tools.isSelectionCoveredInTag(a, f, sp, tag, attribute)) {
                let ap = a.parentNode;
                if (a.previousSibling) {
                    const ne = this.tools.createElement(tag, attribute);
                    ne.appendChild(a.previousSibling);
                    while (a.previousSibling) {
                        ne.insertBefore(a.previousSibling, ne.firstChild);
                    }
                    ap.insertBefore(ne, a);
                }
                let fp = f.parentNode;
                if (f.nextSibling) {
                    const ne = this.tools.createElement(tag, attribute);
                    while (f.nextSibling) {
                        ne.appendChild(f.nextSibling);
                    }
                    fp.appendChild(ne);
                }
                const at = this.tools.getParent(a, tag, attribute);
                const ft = this.tools.getParent(f, tag, attribute);
                while (!ap.isSameNode(at)) {
                    if (ap.previousSibling) {
                        const ne = this.tools.createElement(tag, attribute);
                        ne.appendChild(ap.previousSibling);
                        while (ap.previousSibling) {
                            ne.insertBefore(ap.previousSibling, ne.firstChild);
                        }
                        ap.parentNode.insertBefore(ne, ap);
                    }
                    ap = ap.parentNode;
                }
                while (!fp.isSameNode(ft)) {
                    if (fp.nextSibling) {
                        const ne = this.tools.createElement(tag, attribute);
                        while (fp.nextSibling) {
                            ne.appendChild(fp.nextSibling);
                        }
                        fp.parentNode.appendChild(ne);
                    }
                    fp = fp.parentNode;
                }
                if (at.isSameNode(ft)) {
                    while (ft.firstChild) {
                        ft.parentNode.insertBefore(ft.firstChild, ft);
                    }
                    ft.parentNode.removeChild(ft);
                } else {
                    // if not covered in same tag - common ancestor is closer to root
                    // while 1 up is not CA (sp) - check for next sibling, and remove <tag> from them
                    while (!ap.parentNode.isSameNode(sp)) {
                        while (ap.nextSibling) {
                            // TODO if sibling tag itself
                            const temp = ap.nextSibling;
                            ap = (ap.nextSibling as unknown as Node & ParentNode);
                            this.tools.removeTagNodeOrTagFromChildren(temp, tag, attribute);
                        }
                        ap = ap.parentNode;
                    }
                    // now ap - child of CA, one of next siblings contains fp, iterate fp same until fp is child of CA
                    while (!fp.parentNode.isSameNode(sp)) {
                        while (fp.previousSibling) {
                            const temp = fp.previousSibling;
                            fp = (fp.previousSibling as unknown as Node & ParentNode);
                            this.tools.removeTagNodeOrTagFromChildren(temp, tag, attribute);
                        }
                        fp = fp.parentNode;
                    }
                    // now ap and fp should be siblings, so check if anyone between and remove tags for them
                    let ns = ap.nextSibling;
                    while (!ns.isSameNode(fp)) {
                        const collection = (ns as Element).getElementsByTagName(tag);
                        // tslint:disable-next-line:prefer-for-of
                        for (let i = 0; i < collection.length; i++) {
                            this.tools.removeNodeSavingChildren(collection[i]);
                        }
                        ns = ns.nextSibling;
                    }

                    while (ft.firstChild) {
                        ft.parentNode.insertBefore(ft.firstChild, ft);
                    }
                    ft.parentNode.removeChild(ft);
                    while (at.firstChild) {
                        at.parentNode.insertBefore(at.firstChild, at);
                    }
                    at.parentNode.removeChild(at);
                }
            } else {
                // TODO siblings for a etc.
                // for middle:
                // search for <tag> child -> get sibling -> get inside children -> append to sibling inside children
                // for a, f:                        (for f - previous)
                // getParent(<tag>) -> if has - check for next siblings -> extend tag to siblings inside block
                //                  -> nothing - if has previous siblings -> put tag there, up 1, check next siblings, put tag
                //                                  no previous - check if 1 up has previous
                let p = this.tools.getParent(a, tag, attribute);
                if (p) {
                    if (p.previousSibling) {
                        while (p.nextSibling && p !== this.tools.getChild(f, sp)) {
                            p.appendChild(p.nextSibling);
                        }
                        while (p !== sp) {
                            if (p.nextSibling) { p = this.tools.joinRightOld(p.nextSibling, sp, tag, attribute); }
                            p = p.parentNode;
                        }
                    } else {
                        // check if on same level (or lower) as p ????

                        // join right creates new element
                        // so removing p after

                        // TODO removes node, but previous siblings become uncovered
                        // removing node p to put it higher, but if it is highest possible point, it just removes

                        // and then using this node to access other ---- not anymore
                        this.tools.joinRightOld(p, this.tools.getChild(a, sp), tag, attribute);

                        this.tools.removeNodeSavingChildren(p);
                    }
                } else {
                    // if has no parent-tag - check if parent node is sp, if it is - cover only it
                    // TODO Same but for left
                    if (a.parentNode.isSameNode(sp)) {
                        const ne = this.tools.createElement(tag, attribute);
                        const pa = a.parentNode;
                        // could be useless
                        if (a.nextSibling) {
                            const next = a.nextSibling;
                            ne.appendChild(a);
                            pa.insertBefore(ne, next);
                        } else {
                            pa.appendChild(ne);
                        }
                    } else {
                        this.tools.joinRightOld(a, sp, tag, attribute);
                    }
                }
                // middle (full cover)
                // getChild returns child of sp, so next sibling could contain end point
                // so join right should cover everything UNDER getChild()
                let ns = this.tools.getChild(a, sp).nextSibling;
                while (ns && ns !== this.tools.getChild(f, sp)) {
                    // TODO ns could be <b> ?
                    // TODO if ns is block ?
                    if (ns.nodeType === 1) {
                        const collection = (ns as Element).getElementsByTagName(tag);
                        // tslint:disable-next-line:prefer-for-of
                        for (let i = 0; i < collection.length; i++) {
                            this.tools.removeNodeSavingChildren(collection[i]);
                        }
                    }
                    const ne = this.tools.createElement(tag, attribute);
                    while (ns.firstChild) {
                        ne.appendChild(ns.firstChild);
                    }
                    ns.appendChild(ne);
                    ns = ns.nextSibling;
                }

                p = this.tools.getParent(f, tag, attribute);
                if (p) {
                    if (p.nextSibling) {
                        while (p.previousSibling) {
                            p.appendChild(p.previousSibling);
                        }
                        while (p !== sp) {
                            if (p.nextSibling) { p = this.tools.joinLeft(p.nextSibling, sp, tag, attribute); }
                            p = p.parentNode;
                        }
                    } else {
                        const changed = this.tools.joinLeft(p, this.tools.getChild(p, sp), tag, attribute);
                        if (!changed.isSameNode(p)) {
                            this.tools.removeNodeSavingChildren(p);
                        }
                    }
                } else {
                    this.tools.joinLeft(f, sp, tag, attribute);
                }
            }
            // range.setStart(a, 0);
            // range.setEnd(f, (f as Text).length);
        }
        // TODO fix range
        this.tools.cleanAndNormalize();
        const range = new Range();
        range.setStart(rangeStart.node, rangeStart.offset);
        range.setEnd(rangeEnd.node, rangeEnd.offset);
        document.getSelection().removeAllRanges();
        document.getSelection().addRange(range);

        this.textAsHTML = this.editorElement.nativeElement.innerHTML
            .replace(/<\/p*(h\d)*(pre)*(blockquote)*>/g, '$&\n')
            .replace(/<br>/g, '<br>\n');
        // this.output.emit(this.editorElement.nativeElement.innerHTML
        //     .replace(/<\/p*(h\d)*(pre)*(blockquote)*>/g, '$&\n')
        //     .replace(/<br>/g, '<br>\n'));
    }

    tag(tag, attribute?): void {
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
            if (a.firstChild) {
                a = a.firstChild;
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
            if (f.lastChild) {
                f = f.lastChild;
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

        this.textAsHTML = this.editorElement.nativeElement.innerHTML
            .replace(/<\/p*(h\d)*(pre)*(blockquote)*>/g, '$&\n')
            .replace(/<br>/g, '<br>\n');
        // this.output.emit(this.editorElement.nativeElement.innerHTML
        //     .replace(/<\/p*(h\d)*(pre)*(blockquote)*>/g, '$&\n')
        //     .replace(/<br>/g, '<br>\n'));
    }

    getInnerHTML(): string {
        return this.editorElement.nativeElement.innerHTML;
    }
    allowDrop(ev): void {
        ev.preventDefault();
    }
    drop(ev): void {
        ev.preventDefault();
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
    }
    drag(ev): void {
        ev.dataTransfer.setData('text', ev.target.id);
    }

    onClick(event: MouseEvent): void {
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
    }

    resizeImage(height, width): void {
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
        this.clickedImage.style.float = float;
        this.clickedImage.style.margin = margin;
    }
}
