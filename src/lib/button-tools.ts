import {HelpingTools} from './helping-tools';

export class ButtonTools {
    editorElement: Element;
    tools: HelpingTools;

    constructor(editor, tools) {
        this.editorElement = editor;
        this.tools = tools;
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

        let pa = this.tools.getChild(a, this.editorElement);
        const pf = this.tools.getChild(f, this.editorElement);

        while (!pa.isSameNode(pf)) {
            const temp = pa.nextSibling;
            if (pa.nodeName.toLowerCase() === 'editor-plugin') {
                if (this.tools.isBlock(pa)) {
                    if (pa.nodeName.toLowerCase() !== tag) {
                        this.tools.replaceNode(pa, tag);
                    }
                } else {
                    this.tools.putInBlock(pa, tag);
                }
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
    }

    tag(tag, attribute?): boolean {
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

        let caretInZeroText: boolean;

        if (!this.tools.isInDiv(s)) {
            return;
        }

        let vals = this.tools.getTextNode(a, startOffset);
        a = vals.node;
        startOffset = vals.offset;
        if (vals.range) {
            rangeStart = vals.range;
        }
        vals = this.tools.getTextNode(f, endOffset);
        f = vals.node;
        endOffset = vals.offset;
        if (vals.range) {
            rangeEnd = vals.range;
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
            caretInZeroText = true;
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
            console.log(rangeStart);
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
                    while (!start.parentNode.isSameNode(ca)) {
                        // check for block?  && !this.tools.isBlock(start)
                        while (start.nextSibling) {
                            this.tools.removeTagNodeOrTagFromChildren(start.nextSibling, tag, attribute);
                            start = start.nextSibling;
                        }
                        start = start.parentNode;
                    }
                    gp = end;
                    if (end.previousSibling) {
                        end = end.previousSibling;
                    } else {
                        end = end.parentNode;
                    }
                    // was gp instead of end, could be an error
                    this.tools.removeNodeSavingChildren(gp);
                    while (!end.parentNode.isSameNode(ca)) {
                        while (end.previousSibling) {
                            this.tools.removeTagNodeOrTagFromChildren(end.previousSibling, tag, attribute);
                            end = end.previousSibling;
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
                        if (start.nodeName.toLowerCase() !== 'editor-plugin') {
                            const collection = (start as Element).getElementsByTagName(tag);
                            // tslint:disable-next-line:prefer-for-of
                            for (let i = 0; i < collection.length; i++) {
                                this.tools.removeNodeSavingChildren(collection[i]);
                            }
                        }
                    }
                    if (this.tools.isBlock(start)) {
                        const ne = this.tools.createElement(tag, attribute);
                        // TODO start.firstChild could be block if nested blockquotes
                        while (start.firstChild) {
                            ne.appendChild(start.firstChild);
                        }
                        start.appendChild(ne);
                        start = start.nextSibling;
                    } else {
                        start = start.nextSibling;
                        if (start.previousSibling.nodeName.toLowerCase() !== tag &&
                            start.previousSibling.nodeName.toLowerCase() !== 'editor-plugin'
                            // && this.tools.hasAttribute(start.previousSibling, attribute)
                        ) {
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
        console.log(rangeStart);
        range.setStart(rangeStart, 0);
        range.setEnd(rangeEnd, (rangeEnd as Text).length);
        document.normalize();
        document.getSelection().removeAllRanges();
        document.getSelection().addRange(range);
        return caretInZeroText;
    }

    transformToList(ordered?: boolean): void {
        const s = document.getSelection();

        if (!this.tools.isInDiv(s)) {
            return;
        }
        const r = s.getRangeAt(0);
        let start = r.startContainer;
        let end = r.endContainer;
        const rangeStart = r.startContainer;
        let startOffset = r.startOffset;
        const rangeEnd = r.endContainer;
        let endOffset = r.endOffset;
        const ca = r.commonAncestorContainer;

        this.tools.makeBlock();

        start = this.tools.getBlock(start);
        end = this.tools.getBlock(end);

        let list: HTMLOListElement | HTMLUListElement;
        if (ordered) {
            list = document.createElement('ol');
        } else {
            list = document.createElement('ul');
        }

        if (this.tools.isBlock(ca) && !start.isSameNode(end)) {
            // check for start and end to be on same plane
            while (!start.parentNode.isSameNode(ca)) {
                start = start.parentNode;
            }
            while (!end.parentNode.isSameNode(ca)) {
                end = end.parentNode;
            }
            start.parentNode.insertBefore(list, start);
            while (!start.isSameNode(end)) {
                const li = document.createElement('li');
                list.appendChild(li);
                while (start.firstChild) {
                    li.appendChild(start.firstChild);
                }
                start = start.nextSibling;
                start.parentNode.removeChild(start.previousSibling);
            }
        } else {
            // ca is not block, so start and end should be the same node ( root - [ blocks? ] - [ tags? ] - text )
            if (start.isSameNode(this.editorElement)) {
                // get element depending on offset, insert after this element
                start = this.editorElement.childNodes[startOffset];
                startOffset = 0;
                end = this.editorElement.childNodes[endOffset];
                endOffset = 0;
            }
            if (start.parentNode.nodeName.toLowerCase() === 'ol' || start.parentNode.nodeName.toLowerCase() === 'ul') {
                const old = start.parentNode;
                old.parentNode.insertBefore(list, old);
                while (old.firstChild) {
                    list.appendChild(old.firstChild);
                }
                old.parentNode.removeChild(old);
                // TODO buggy, maybe in the future
                // start.insertBefore(list, start.firstChild);
                // const li = document.createElement('li');
                // list.appendChild(li);
                // while (list.nextSibling) {
                //     li.appendChild(list.nextSibling);
                // }
            } else {
                start.parentNode.insertBefore(list, start);
                const li = document.createElement('li');
                list.appendChild(li);
                while (start.firstChild) {
                    li.appendChild(start.firstChild);
                }
                start.parentNode.removeChild(start);
            }
        }

        const range = new Range();
        range.setStart(rangeStart, startOffset);
        range.setEnd(rangeEnd, endOffset);
        document.getSelection().removeAllRanges();
        document.getSelection().addRange(range);
    }

    clearFormatting(): void {
        const s = document.getSelection();

        if (!this.tools.isInDiv(s)) {
            return;
        }
        const r = s.getRangeAt(0);
        let start = r.startContainer;
        let end = r.endContainer;
        const rangeStart = r.startContainer;
        let startOffset = r.startOffset;
        const rangeEnd = r.endContainer;
        let endOffset = r.endOffset;
        const ca = r.commonAncestorContainer;
        const collapsed = r.collapsed;

        // get selection text? s.toString() - getBlock() - block.child = string?
        //                                                 block.child = block.wholeText?
        // remove parents until div editor, put p parent
        this.tools.makeBlock();

        // start = this.tools.getBlock(start);
        // end = this.tools.getBlock(end);

        if (collapsed) {
            while (!this.tools.isBlock(start) || start.isSameNode(this.editorElement)) {
                start = start.parentNode;
            }
            const txt = document.createTextNode(start.textContent);
            start.appendChild(txt);
            while (txt.previousSibling) {
                start.removeChild(txt.previousSibling);
            }
        } else {
            // 1. start and end in same block
            // 2. start and end in different blocks
            // 1. start and end in same node
            // 2. start and end in different nodes
            // 3. start or end is not a text
            //
            // get text node of START and next text nodes up until CA or BLOCK
            // if not child of BLOCK - move everything to the right of end to copy of current node -
            // - insert start-end text node between original and copy
            let vals = this.tools.getTextNode(start, startOffset);
            start = vals.node;
            startOffset = vals.offset;
            vals = this.tools.getTextNode(end, endOffset);
            end = vals.node;
            endOffset = vals.offset;

            const finishProductStart = document.createTextNode('');
            const finishProductEnd = document.createTextNode('');

            if (!start.isSameNode(end)) {
                finishProductStart.appendData((start as Text).substringData(startOffset, (start as Text).length));
                (start as Text).replaceData(startOffset, (start as Text).length, '');
                while ( !(start.isSameNode(ca) || this.tools.isBlock(start)) ) {
                    while (start.nextSibling) {
                        const ns = start.nextSibling;
                        finishProductStart.appendData(ns.textContent);
                        ns.remove();
                    }
                    start = start.parentNode;
                }
                finishProductEnd.appendData((end as Text).substringData(0, endOffset));
                (end as Text).replaceData(0, endOffset, '');
                while ( !(end.isSameNode(ca) || this.tools.isBlock(end)) ) {
                    while (end.previousSibling) {
                        const ps = end.previousSibling;
                        finishProductEnd.insertData(0, ps.textContent);
                        ps.remove();
                    }
                    end = end.parentNode;
                }
                // start and end on same plane OR right under blocks
                //
                // start.parent is same node as end only if they both under ca
                // if they both under ca - between them should not be any blocks?
                //
                // if start and end doesnt have same parent - they are not in same plane - they are under <block> - save text,
                //              and continue changing siblings to text, until child of ca, then 1 more time with check for end being sibling
                if (!start.parentNode.isSameNode(end)) {
                    // save text for start and end
                    // check for sibling
                    while (start.nextSibling) {
                        const ns = start.nextSibling;
                        finishProductStart.appendData(ns.textContent);
                        ns.remove();
                    }
                    start = start.parentNode;
                    start.appendChild(finishProductStart);

                    while (end.previousSibling) {
                        const ps = end.previousSibling;
                        finishProductEnd.insertData(0, ps.textContent);
                        ps.remove();
                    }
                    end.parentNode.insertBefore(finishProductEnd, end);
                    end = end.parentNode;

                    while (!start.parentNode.isSameNode(ca)) {
                        let ns = start.nextSibling;
                        while (ns) {
                            this.tools.removeStyling(ns);
                            ns = ns.nextSibling;
                        }
                        start = start.parentNode;
                    }
                    while (!end.parentNode.isSameNode(ca)) {
                        let ps = end.previousSibling;
                        while (ps) {
                            this.tools.removeStyling(ps);
                            ps = ps.previousSibling;
                        }
                        end = end.parentNode;
                    }
                    // end and start under ca
                    start = start.nextSibling;
                    while (!start.isSameNode(end)) {
                        this.tools.removeStyling(start);
                        start = start.nextSibling;
                    }
                } else {
                    while (!(start.nextSibling.isSameNode(end))) {
                        const ns = start.nextSibling;
                        finishProductStart.appendData(ns.textContent);
                        ns.remove();
                    }
                    // need to insert text after start, but at level under block
                    while (!this.tools.isBlock(start.parentNode)) {
                        const p = start.parentNode;
                        const clone = p.cloneNode(false);
                        while (start.nextSibling) {
                            clone.appendChild(start.nextSibling);
                        }
                        this.tools.insertAfter(clone, p);
                        start = p;
                    }
                    finishProductStart.appendData(finishProductEnd.data);
                    this.tools.insertAfter(finishProductStart, start);
                }
            } else {
                // 123 <start> 456 </end> 789
                const finishProduct = (start as Text).splitText(startOffset);
                (start as Text).splitText(endOffset - startOffset);
                start.parentNode.removeChild(finishProduct);
                while (!this.tools.isBlock(start.parentNode)) {
                    const p = start.parentNode;
                    const clone = p.cloneNode(false);
                    while (start.nextSibling) {
                        clone.appendChild(start.nextSibling);
                    }
                    this.tools.insertAfter(clone, p);
                    start = p;
                }
                this.tools.insertAfter(finishProduct, start);
            }
        }
    }
}
