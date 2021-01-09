import {Align} from './types';

export class HelpingTools {

    editorElement: Element;

    constructor(editor) {
        this.editorElement = editor;
    }

    /**
     * Covers everything in paragraph, if first child is not block
     * Returns created paragraph on creation
     */
    makeBlock(): Element {
        if (!this.editorElement.firstChild || !this.isBlock(this.editorElement.firstChild)) {
            const newElement = document.createElement('p');
            while (this.editorElement.firstChild) {
                newElement.appendChild(this.editorElement.firstChild);
            }
            this.editorElement.appendChild(newElement);
            return newElement;
        }
        return null;
    }

    /**
     * splits nodes into origin and clone
     * @param node - child node that will be in clone
     * @param upto - parent node that will not be split
     */
    split(node, upto): void {
        let gen = node;
        let pa = gen.parentNode;
        while (!pa.isSameNode(upto)) {
            const pc = pa.cloneNode(false);
            while (gen.nextSibling) {
                const sib = gen.nextSibling;
                pc.appendChild(sib);
            }
            this.insertAfter(pc, pa);
            gen = pa;
            pa = pa.parentNode;
        }
    }

    /**
     * inserts new block cloning everything up to block node
     * @param node
     */
    insertNewBlock(node: Node): void {
        // this.split(node, this.editorElement);
        let gen = node;
        let pa = gen.parentNode;
        // TODO could become a problem if pa could have block node as a sibling to a non block node
        while (!(pa.isSameNode(this.editorElement) || this.isBlock(pa.firstChild) || pa.nodeName.toLowerCase() === 'td')) {
            const pc = pa.cloneNode(false);
            while (gen.nextSibling) {
                const sib = gen.nextSibling;
                pc.appendChild(sib);
                if (gen.isSameNode(node)) {
                    // fixing if at the lowest generation
                    if ((sib as Text).length === 0 && !gen.nextSibling) {
                        const br = document.createElement('br');
                        pc.appendChild(br);
                    }
                }
            }
            if (gen.nodeType === 3 && (gen as Text).length === 0) {
                const br = document.createElement('br');
                this.insertAfter(br, gen);
            }
            this.insertAfter(pc, pa);
            gen = pa;
            pa = pa.parentNode;
        }
    }

    /**
     * creates new element and puts it in place of node, while keeping node as child of a new element
     * @param tag - tag name of a new element
     * @param node -
     * @param attribute -
     */
    coverNodeInNewElement(node, tag, attribute): Element {
        const ne = this.createElement(tag, attribute);
        const pa = node.parentNode;
        pa.insertBefore(ne, node);
        ne.appendChild(node);
        return ne;
    }

    insertAfter(newChild, refChild): void {
        if (refChild.nextSibling) {
            refChild.parentNode.insertBefore(newChild, refChild.nextSibling);
        } else {
            refChild.parentNode.appendChild(newChild);
        }
    }


    /**
     * removes tag from children or removes tag node
     * @param node -
     * @param tag -
     * @param attribute -
     */
    removeTagNodeOrTagFromChildren(node, tag, attribute): void {
        // TODO should check for same attributes?
        // #COMPARING NODES
        if (node.nodeName.toLowerCase() === tag && this.hasAttribute(node, attribute)) {
            while (node.firstChild) {
                node.parentNode.insertBefore(node.firstChild, node);
            }
            node.parentNode.removeChild(node);
        } else {
            if (node.nodeType === 1) {
                const collection = node.getElementsByTagName(tag);
                // tslint:disable-next-line:prefer-for-of
                for (let i = 0; i < collection.length; i++) {
                    this.removeNodeSavingChildren(collection[i]);
                }
            }
        }
    }

    saveResizedImage(clickedImage): void {
        if (clickedImage && window.getComputedStyle(clickedImage.parentElement).resize === 'both') {
            clickedImage.style.width = clickedImage.parentElement.style.width;
            clickedImage.style.height = clickedImage.parentElement.style.height;
            this.removeNodeSavingChildren(clickedImage.parentNode);
        }
    }

    removeNodeSavingChildren(node): Node {
        let ret = node;
        const parent = node.parentNode;
        while (node.firstChild) {
            ret = node.firstChild;
            parent.insertBefore(node.firstChild, node);
        }
        parent.removeChild(node);
        // SHOULD RETURN LAST NODE THAT WAS INSERTED
        return ret;
    }

    /**
     * returns true if node is block node (p, ...)
     */
    isBlock(node): boolean {
        const block = ['p', 'blockquote', 'pre', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'td', 'th', 'tr', 'li', 'ol', 'ul'];
        return block.indexOf(node.nodeName.toLowerCase()) > -1;
    }

    joinLeft(node, parent, tag, attribute): Node {
        if (node.nextSibling) {
            const nn = this.createElement(tag, attribute);
            const p = node.parentNode;
            const s = node.nextSibling;
            while (s.previousSibling) {
                // s.previousSibling could be removed if it is <tag> element
                // but children replace it, so appendChild should append this new elements (which was children of prev sib)
                this.removeTagNodeOrTagFromChildren(s.previousSibling, tag, attribute);
                nn.appendChild(s.previousSibling);
            }
            p.insertBefore(nn, s);
            if (p.parentNode.isSameNode(parent) || this.isBlock(p.parentNode)  || p.isSameNode(this.editorElement)) {
                return p;
            } else {
                return this.joinLeft(p.previousSibling, parent, tag, attribute);
            }
        } else {
            // TODO isBlock compared 2 times
            if (node.parentNode.isSameNode(parent) || this.isBlock(node.parentNode)) {
                const nn = this.createElement(tag, attribute);
                const p = node.parentNode;
                // isSameNode(parent) should not join siblings?
                // while moving on level right under SAME PARENT - do not iterate siblings
                if (this.isBlock(node.parentNode) && node.previousSibling) {
                    nn.appendChild(node.previousSibling);
                    while (node.previousSibling) {
                        this.removeTagNodeOrTagFromChildren(node.previousSibling, tag, attribute);
                        nn.insertBefore(node.previousSibling, nn.firstChild);
                    }
                }
                p.insertBefore(nn, node);
                nn.appendChild(node);
                return node;
            } else {
                if (node.parentNode.isSameNode(this.editorElement)) {
                    return node;
                }
                return this.joinLeft(node.parentNode, parent, tag, attribute);
            }
        }
    }

    joinRightOld(node, parent, tag, attribute): Node {
        // if node has prev sib - tag over node
        if (node.previousSibling) {
            const nn = this.createElement(tag, attribute);
            const p = node.parentNode;
            const s = node.previousSibling;
            while (s.nextSibling) {
                // next sibling could be replaced with its children if next sibling is tag
                this.removeTagNodeOrTagFromChildren(s.nextSibling, tag, attribute);
                nn.appendChild(s.nextSibling);
            }
            p.appendChild(nn);
            if (p.parentNode.isSameNode(parent) || this.isBlock(p.parentNode) || p.isSameNode(parent)) {
                return p;
            } else {
                return this.joinRightOld(p.nextSibling, parent, tag, attribute);
            }
        } else {
            // if node's parent is sp - bad yes it is
            // if is same node - put tag only over node
            if (node.parentNode.isSameNode(parent) || this.isBlock(node.parentNode)) {
                const nn = this.createElement(tag, attribute);
                const p = node.parentNode;
                // while not same as end point?
                if (this.isBlock(node.parentNode)) {
                    while (node.nextSibling) {
                        this.removeTagNodeOrTagFromChildren(node.nextSibling, tag, attribute);
                        nn.appendChild(node.nextSibling);
                    }
                }
                if (nn.firstChild) {
                    nn.insertBefore(node, nn.firstChild);
                } else {
                    nn.appendChild(node);
                }
                p.appendChild(nn);
                return node;
            } else {
                return this.joinRightOld(node.parentNode, parent, tag, attribute);
            }
        }
    }

    /**
     * covers everything to right from starting node, finishes on child of 'parent'
     * finishes when one of next siblings contains endContainer if parent is set correctly
     * @param node - starting point (ns of getParent, or a)
     * @param parent - block or common ancestor - should not be direct parent of node
     * @param tag -
     * @param attribute -
     */
    coverToRight(node, parent, tag, attribute): Node {
        if (node.previousSibling) {
            let p = this.coverNext(node, tag, attribute).parentNode;
            while (!p.parentNode.isSameNode(parent) && !this.isBlock(p)) {
                if (p.nextSibling) {
                    return this.coverToRight(p.nextSibling, parent, tag, attribute);
                } else {
                    p = p.parentNode;
                }
            }
            return p;
        } else {
            if (node.parentNode.isSameNode(parent)) {
                return node.parentNode;
            }
            if (this.isBlock(node.parentNode)) {
                if (node.nextSibling) {
                    return this.coverNext(node.nextSibling, tag, attribute).parentNode;
                } else {
                    return node.parentNode;
                }
            } else {
                return this.coverToRight(node.parentNode, parent, tag, attribute);
            }
        }
    }

    coverBlock(block, tag, attribute): void {
        const collection = (block as Element).getElementsByTagName(tag);
        // tslint:disable-next-line:prefer-for-of
        for (let i = 0; i < collection.length; i++) {
            this.removeNodeSavingChildren(collection[i]);
        }

        // TODO start.firstChild could be block if nested blockquotes
        if (this.isBlock(block.firstChild)) {
            const col = block.childNodes;
            // tslint:disable-next-line:prefer-for-of
            for (let i = 0; i < col.length; i++) {
                this.coverBlock(col[i], tag, attribute);
            }
        } else {
            const ne = this.createElement(tag, attribute);
            while (block.firstChild) {
                ne.appendChild(block.firstChild);
            }
            block.appendChild(ne);
        }
    }

    /**
     * covers blocks to right with tag, until children of end node
     * @param start
     * @param end
     * @param tag
     * @param attribute
     */
    coverBlocksToRight(start, end, tag, attribute): Node {
        while (!start.parentNode.isSameNode(end) && !start.isSameNode(end)) {
            let next = start.nextSibling;
            while (next) {
                this.coverBlock(next, tag, attribute);
                next = next.nextSibling;
            }
            start = start.parentNode;
        }
        return start;
    }
    coverBlocksToLeft(start, end, tag, attribute): Node {
        while (!start.parentNode.isSameNode(end) && !start.isSameNode(end)) {
            let prev = start.previousSibling;
            while (prev) {
                this.coverBlock(prev, tag, attribute);
                prev = prev.previousSibling;
            }
            start = start.parentNode;
        }
        return start;
    }

    /**
     * covers node and next siblings
     * @param node -
     * @param tag -
     * @param attribute -
     * @return new element
     */
    coverNext(node, tag, attribute): Node {
        const ne = this.createElement(tag, attribute);
        const p = node.parentNode;
        const ps = node.previousSibling;
        while (ps.nextSibling) {
            // next sibling could be replaced with its children if next sibling is tag
            this.removeTagNodeOrTagFromChildren(ps.nextSibling, tag, attribute);
            // if removed, node.nextSibling should be new one right here TODO check this
            ne.appendChild(ps.nextSibling);
        }
        p.appendChild(ne);
        return ne;
    }

    /**
     * covers everything to left from starting node, finishes on child of 'parent'
     * finishes when one of previous siblings contains startContainer if parent is set correctly
     * @param node - starting point (ns of getParent, or a)
     * @param parent - block or common ancestor - should not be direct parent of node
     * @param tag -
     * @param attribute -
     */
    coverToLeft(node, parent, tag, attribute): Node {
        if (node.nextSibling) {
            let p = this.coverPrevious(node, tag, attribute).parentNode;
            while (!p.parentNode.isSameNode(parent) && !this.isBlock(p)) {
                if (p.previousSibling) {
                    return this.coverToLeft(p.previousSibling, parent, tag, attribute);
                } else {
                    p = p.parentNode;
                }
            }
            return p;
        } else {
            if (node.parentNode.isSameNode(parent)) {
                return node.parentNode;
            }
            if (this.isBlock(node.parentNode)) {
                if (node.previousSibling) {
                    return this.coverPrevious(node.previousSibling, tag, attribute).parentNode;
                } else {
                    return node.parentNode;
                }
            } else {
                return this.coverToLeft(node.parentNode, parent, tag, attribute);
            }
        }
    }

    /**
     * covers node and previous siblings
     * @param node -
     * @param tag -
     * @param attribute -
     * @return new element
     */
    coverPrevious(node, tag, attribute): Node {
        const ne = this.createElement(tag, attribute);
        const p = node.parentNode;
        // nextSibling should always be
        const ns = node.nextSibling;
        while (ns.previousSibling) {
            // next sibling could be replaced with its children if next sibling is tag
            this.removeTagNodeOrTagFromChildren(ns.previousSibling, tag, attribute);
            // if removed, node.nextSibling should be new one right here TODO check this
            this.movePrevious(ns, ne);
        }
        p.insertBefore(ne, ns);
        return ne;
    }

    movePrevious(node, element): void {
        if (element.firstChild) {
            element.insertBefore(node.previousSibling, element.firstChild);
        } else {
            element.appendChild(node.previousSibling);
        }
    }

    /**
     * Check if text in selection is full covered in tag
     * used to check if tag should be removed or extended
     * @param start - anchor node
     * @param end - focus node
     * @param parent - common ancestor
     * @param tag - <b> <u> etc.
     * @param attribute -
     */
    isSelectionCoveredInTag(start, end, parent, tag, attribute?): boolean {
        let c = this.getParent(start, tag, attribute);
        if (!c) { return false; }
        if (c.isSameNode(this.getParent(end, tag, attribute))) { return true; }

        while (!c.parentNode.isSameNode(parent)) {
            if (!this.checkSiblings(c, tag, attribute)) { return false; }
            c = c.parentNode;
        }

        const pe = this.getChild(end, parent);
        if (!pe) {
            console.error('out of bounds');
            return false;
        }
        if (!this.checkSiblings(c, tag, attribute, pe)) { return false; }
        return this.isCoveredInTag(pe, tag, attribute, end);
    }

    /**
     * returns true if node has no siblings or they are covered in tag
     * @param node - starting point
     * @param tag - html tag
     * @param attribute -
     * @param endPoint - returns if current node is endPoint (used if endPoint node needs more complex looking)
     */
    checkSiblings(node, tag, attribute, endPoint?): boolean {
        const c = node.nextSibling;
        if (c && !c.isSameNode(endPoint)) {
            if (this.isCoveredInTag(c, tag, attribute)) {
                return this.checkSiblings(c, tag, attribute, endPoint);
            } else {
                return false;
            }
        } else {
            return true;
        }
    }

    isCoveredInTag(node, tag, attribute, endPoint?): boolean {
        if (node.nodeName.toLowerCase() === 'editor-plugin' ||
            (this.isBlock(node) && !node.innerHTML)) {
            return true;
        }
        if (!node.outerHTML || node.outerHTML.indexOf('</' + tag + '>') < 0) { return false; }
        // replace with iteration of first child
        let c = node.firstChild;
        while (c.firstChild){
            c = c.firstChild;
        }
        const t = this.getParent(c, tag, attribute);
        if (t) {
            if (t.isSameNode(this.getParent(endPoint, tag, attribute))) { return true; }
            if (t.nextSibling) {
                return this.isCoveredInTag(t.nextSibling, tag, endPoint);
            } else {
                return true;
            }
        }
        return false;
    }

// DEPRECATED
    sameParent(a, f): Node {
        const pa = a.parentNode;
        let pf = f.parentNode;
        if (pa.isSameNode(pf)) { return pa; }
        // div is our bounds
        while (pf.localName !== 'div') {
            pf = pf.parentNode;
            if (pa.isSameNode(pf)) {
                return pa;
            }
        }
        if (pa.localName !== 'div') {
            return this.sameParent(pa, f);
        }
        throw new Error('selection is out of bounds');
    }

    /**
     * get parent of a node, that is child to 'parent'
     * returns null if out of bounds (bound is 'div')
     */
    getChild(node, parent): Node {
        let p = node;
        while (!p.parentNode.isSameNode(parent)) {
            if (p.nodeName.toLowerCase() === 'div') { return null; }
            p = p.parentNode;
        }
        return p;
    }

// DEPRECATED
    hasParent(node, tag): Node {
        if (!node) { return null; }
        if (node.nodeName.toLowerCase() === tag) { return node; }
        if (node.nodeName.toLowerCase() !== 'div') { return this.hasParent(node.parentNode, tag); }
        return null;
    }

    /**
     * return <tag> element ancestor, or null if not tagged
     * @param node - node whose ancestor is searched for
     * @param tag - html tag that is searched for
     * @param attribute -
     */
    getParent(node, tag, attribute): Node {
        if (!node) { return null; }
        // #COMPARING NODES
        if (node.nodeName.toLowerCase() === tag && this.hasAttribute(node, attribute)) { return node; }
        if (node.nodeName.toLowerCase() !== 'div') { return this.getParent(node.parentNode, tag, attribute); }
        return null;
    }

    hasChildren(node): boolean {
        let has = false;
        node.childNodes.forEach(child => {
            if ((child.nodeType !== 3 && this.hasChildren(child))
                || (child.nodeType === 3 && (child as Text).length !== 0)
                || (child.nodeName.toLowerCase() === 'br')
            ) {
                has = true;
            }
        });
        return has;
    }

    /**
     * clean div from empty tags, merge same sibling tags, normalize()
     */
    cleanAndNormalize(): void {
        this.clean();
        document.normalize();
    }
    clean(): void {
        // TODO range could change because of messing with children, but it could be okay if corrected after this function call
        // div.getelementsby tag(b), if sibling is tag - merge them
        // get is live collection, iterating it could be troublesome
        // (looking at previous sibling could be unnecessary?)
        // save elements from collection and delete later
        const elements = ['b', 'u', 'span', 'font', 'sub', 'sup'];
        // const elementsWithAttributes = [];
        for (const e of elements) {
            const collection = this.editorElement.getElementsByTagName(e);
            const markDeleting = [];
            Array.from(collection).forEach(c => {
                // </b><b>
                // <b></b>
                // [asd][] = [asd]          --- has - do nothing
                // [asd][asd] = [asdasd]    --- has - merge if previous
                // [][] = ''                --- empty - only delete
                // [][asd] = [asd]          --- empty - only delete
                // [asd][][asd] = [asdasd]  --- has - check previous, skip ones marked for deletion
                if (!this.isEmptyLine(c) && !(c.hasChildNodes() || this.hasChildren(c))) {
                    markDeleting.push(c);
                } else {
                    let ps = c.previousSibling;
                    while (ps) {
                        if ((ps.nodeName.toLowerCase() === e && this.compareAttributes(ps, c))
                            || (ps.nodeType === 3 && (ps as Text).length < 1)) {
                            // if sibling marked for deleting - skip it
                            if ((markDeleting.indexOf(ps) < 0) && ps.nodeType === 1) {
                                while (c.firstChild) {
                                    ps.appendChild(c.firstChild);
                                }
                                markDeleting.push(c);
                                break;
                            } else {
                                ps = ps.previousSibling;
                            }
                        } else {
                            break;
                        }
                    }
                }
            });
            for (const m of markDeleting) {
                const parent = m.parentNode;
                parent.removeChild(m);
            }
        }
        const blocks = ['p', 'pre', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
        for (const bl of blocks) {
            const collection = this.editorElement.getElementsByTagName(bl);
            Array.from(collection).forEach(c => {
                if (!c.hasChildNodes()) {
                    c.appendChild(document.createElement('br'));
                }
            });
        }
    }

    /**
     * returns true if node has nonempty text child, or is an empty new line
     * @param c
     */
    isEmptyLine(c: Node): boolean {
        // c has parent p, c has empty child without siblings
        if (c.nextSibling || c.previousSibling) {
            return false;
        }
        let checkChildren = c;
        while (checkChildren.firstChild) {
            if (checkChildren.nextSibling || checkChildren.previousSibling) {
                return false;
            }
            checkChildren = checkChildren.firstChild;
        }
        // checkChildren now is lowest child in current branch
        // if it is not empty (has some text), this branch should not be marked for deletion
        if (checkChildren.nodeType === 3 && (checkChildren as Text).length > 0) {
            return true;
        }
        while (this.isBlock(c) || c.isSameNode(this.editorElement)) {
            if (c.nextSibling || c.previousSibling) {
                return false;
            }
        }
        return true;
    }

    compareAttributes(a, b): boolean {
        // <font color='red'>
        if (a.getAttribute('color') !== b.getAttribute('color')) {
            return false;
        }
        // <span style='background-color: rgb(0, 0, 0);'> <span style='font-family: &quot;Courier New&quot;;'>
        return a.getAttribute('style') === b.getAttribute('style');
    }

// TODO check if similar attributes (style background-color and style font-family)
    hasAttribute(node, attribute): boolean {
        if (attribute) {
            return node.getAttribute(attribute[0]) === attribute[1];
        }
        return true;
    }

    createElement(tag, attribute): Element {
        if (attribute) {
            const ne = document.createElement(tag);
            // console.log(attribute[1]);
            ne.setAttribute(attribute[0], attribute[1]);
            return ne;
        } else {
            return document.createElement(tag);
        }
    }

    /**
     *
     * @param s - start
     * @param e - end
     * @param ca - closest ancestor
     */
    isInSameBlock(s, e, ca): boolean {
        let p = s.parentNode;
        while (!p.isSameNode(ca)) {
            if (this.isBlock(p)) {
                return false;
            }
            p = p.parentNode;
        }
        p = e.parentNode;
        while (!p.isSameNode(ca)) {
            if (this.isBlock(p)) {
                return false;
            }
            p = p.parentNode;
        }
        return true;
    }

    /**
     * checks if selection is in editor div, if focus node is outside - change focus to end of div
     * @param s
     * @private
     */
    isInDiv(s: Selection): boolean {
        if (s.rangeCount < 1) {
            return false;
        }
        if (this.editorElement.contains(s.anchorNode)) {
            // if anchor is inside editor-plugin (has parent?)
            if (!this.editorElement.contains(s.focusNode)) {
                const r = document.createRange();
                r.setStart(s.anchorNode, s.anchorOffset);
                let c = this.editorElement.lastChild;
                while (c.hasChildNodes()) {
                    c = c.lastChild;
                }
                if (c.nodeType !== 3) {
                    console.log('something wrong');
                }
                r.setEnd(c, (c as Text).length);
                s.removeAllRanges();
                s.addRange(r);
                return true;
            }
            const range = document.createRange();
            // @ts-ignore
            for (const el of this.editorElement.getElementsByTagName('editor-plugin')) {
                if ((el as Element).contains(s.anchorNode)) {
                    el.parentNode.insertBefore(document.createTextNode(''), el);
                    range.setStart(el.previousSibling, 0);
                }
                if ((el as Element).contains(s.focusNode)) {
                    this.insertAfter(document.createTextNode(''), el);
                    range.setEnd(el.previousSibling, 0);
                }
            }
            return true;
        } else {
            return false;
        }
    }

    replaceNode(node, tag): void {
        const ne = document.createElement(tag);
        while (node.firstChild) {
            ne.appendChild(node.firstChild);
        }
        node.parentNode.insertBefore(ne, node);
        node.parentNode.removeChild(node);
    }

    putInBlock(node, tag): void {
        const newElement = document.createElement(tag);
        const parent = node.parentNode;
        let ns = node.nextSibling;
        while (ns && !this.isBlock(ns)) {
            const temp = ns.nextSibling;
            newElement.appendChild(ns);
            ns = temp;
        }
        parent.insertBefore(newElement, node);
        newElement.insertBefore(node, newElement.firstChild);
    }

    insertCell(row: HTMLTableRowElement, index?: number): void {
        const cell = row.insertCell(index);
        cell.style.border = '1px solid #ddd';
        cell.appendChild(document.createElement('br'));
    }

    getBlock(node): Node {
        let n = node;
        while (!(n.isSameNode(this.editorElement) || this.isBlock(n))) {
            n = n.parentNode;
        }
        return n;
    }

    /**
     *
     * @param node
     * @param offset
     * @param ca - common ancestor for end text node searching
     */
    getTextNode(node, offset, ca?: Node): { node: Node, range, offset } {
        let range;
        if (ca && node.nodeType !== 3 && offset === 0) {
            let tempFix = node;
            let tempFixOffset = offset;
            while (!tempFix.isSameNode(ca)) {
                if (tempFix.previousSibling) {
                    tempFix = tempFix.previousSibling;
                    if (tempFix.nodeType === 3) {
                        tempFixOffset = tempFix.length;
                    } else {
                        tempFixOffset = tempFix.childNodes.length - 1;
                    }
                    break;
                } else {
                    tempFix = tempFix.parentNode;
                }
            }
            if (!tempFix.isSameNode(ca)) {
                node = tempFix;
                offset = tempFixOffset;
            }
        }
        while (node.nodeType !== 3) {
            // if looking for end and offset 0 - go for previous node with max offset

            if (node.childNodes) {
                // select next node
                if (offset >= node.childNodes.length) {
                    const ne = new Text('');
                    node.appendChild(ne);
                    node = ne;
                } else {
                    node = node.childNodes[offset];
                }
                if (ca) {
                    if (node.nodeType === 3) {
                        offset = node.length;
                    } else {
                        offset = node.childNodes.length - 1;
                    }
                } else {
                    offset = 0;
                }
            } else {
                const ne = new Text('');
                if (node.nodeName === 'br' || node.nodeName === 'img') {
                    node.parentNode.insertBefore(ne, node);
                } else {
                    node.appendChild(ne);
                }
                range = node = ne;
                offset = 0;
            }
        }
        return { node, range, offset };
    }

    /**
     * transforms children of blocks into a text node
     * @param ns
     */
    removeStyling(ns: Node): void {
        // @ts-ignore
        for (const child of ns.childNodes) {
            if (!this.isBlock(child)) {
                const nt = document.createTextNode(child.textContent);
                ns.insertBefore(nt, child);
                child.remove();
            } else {
                this.removeStyling(child);
            }
        }
    }

    getAlignBlock(node: Node): Node {
        // TODO change .align to .style.textAlign
        while (!(this.isBlock(node) && (node as HTMLParagraphElement).style.textAlign)) {
            if (node.isSameNode(this.editorElement)) {
                return null;
            }
            node = node.parentNode;
        }
        return node;
    }

    isRangeAligned(r: Range): Align {
        let start = r.startContainer;
        start = this.putInOffset(start, r.startOffset);
        start = this.getAlignBlock(start);
        if (!start) {
            return Align.None;
        } // start = block with align
        const align = (start as HTMLParagraphElement).style.textAlign;

        const ca = r.commonAncestorContainer;
        if (!(r.collapsed || start.contains(ca))) {
            let end = r.endContainer;
            end = this.putInOffset(end, r.endOffset);
            end = this.getAlignBlock(end);
            if (!end || (end as HTMLParagraphElement).style.textAlign !== align) {
                return Align.None;
            } // end = block with align

            while (!start.parentNode.isSameNode(ca)) {
                if (!this.checkSiblingsForAlign(start.nextSibling, align)) {
                    return Align.None;
                }
                start = start.parentNode;
            }
            while (!end.parentNode.isSameNode(ca)) {
                if (!this.checkSiblingsForAlign(end.previousSibling, align, true)) {
                    return Align.None;
                }
                end = end.parentNode;
            }
            start = start.nextSibling;
            while (!start.isSameNode(end)) {
                if (!this.checkSiblingsForAlign(start.firstChild, align, true)) {
                    return Align.None;
                }
                start = start.nextSibling;
            }
        }
        return this.alignToEnum(align);
    }
    enumToAlign(align: Align): string {
        switch (align) {
            case Align.Left:
                return 'left';
            case Align.Center:
                return 'center';
            case Align.Right:
                return 'right';
            case Align.Justify:
                return 'justify';
            default:
                return '';
        }
    }
    alignToEnum(align: string): Align {
        switch (align) {
            case 'left': return Align.Left;
            case 'center': return Align.Center;
            case 'right': return Align.Right;
            case 'justify': return Align.Justify;
            default:
                return Align.None;
        }
    }
    checkSiblingsForAlign(node, alignType, previous?): boolean {
        let ns = node;
        while (ns) {
            let c = ns;
            while (this.isBlock(c)) {
                c = c.firstChild;
            }
            c = this.getAlignBlock(c);
            if (!c || (c as HTMLParagraphElement).style.textAlign !== alignType) {
                return false;
            }
            while (!c.isSameNode(ns)) {
                if (!previous) {
                    if (!this.checkSiblingsForAlign(c.nextSibling, alignType)) {
                        return false;
                    }
                } else {
                    if (!this.checkSiblingsForAlign(c.previousSibling, alignType)) {
                        return false;
                    }
                }
                c = c.parentNode;
            }
            if (!previous) {
                ns = ns.nextSibling;
            } else {
                ns = ns.previousSibling;
            }
        }
        return true;
    }

    putInOffset(node: Node, offset): Node {
        if (node.nodeType === 1) {
            if (offset > node.childNodes.length) {
                return node.childNodes[node.childNodes.length - 1];
            } else {
                return node.childNodes[offset];
            }
        }
        return node;
    }

    alignSiblingBlocks(node: Node, align, previous?): void {
        let ns = node; // ns is block?
        while (ns) {
            if (!ns.firstChild) {
                if (!previous) {
                    ns = ns.nextSibling;
                } else {
                    ns = ns.previousSibling;
                }
                continue;
            }
            let c = ns;
            while (c.firstChild && this.isBlock(c.firstChild)) {
                c = c.firstChild;
            }
            // c => <block (c)> asd <tag> asd </tag> asd </block>
            (c as HTMLParagraphElement).style.textAlign = align;
            while (!c.isSameNode(ns)) {
                this.alignSiblingBlocks(c, align);
                c = c.parentNode;
            }
            if (!previous) {
                ns = ns.nextSibling;
            } else {
                ns = ns.previousSibling;
            }
        }
    }

    getRow(sc: Node): HTMLTableRowElement {
        while (sc && !sc.isSameNode(this.editorElement)) {
            if (sc.nodeName === 'TR') {
                return sc as HTMLTableRowElement;
            }
            sc = sc.parentNode;
        }
        return null;
    }

    getNode(startContainer: Node, startOffset: number): Node {
        if (startContainer.nodeType === 1) {
            return startContainer.childNodes[startOffset];
        } else {
            return startContainer;
        }
    }

    getTable(n: Node): Node {
        while (n && !n.isSameNode(this.editorElement)) {
            if (n.nodeName === 'TABLE') {
                return n;
            }
            n = n.parentNode;
        }
        return null;
    }

    getCell(node: Node): HTMLTableCellElement {
        while (node && !node.isSameNode(this.editorElement)) {
            if (node.nodeName === 'TD') {
                return node as HTMLTableCellElement;
            }
            node = node.parentNode;
        }
        return null;
    }

    removeSingleColumn(cell: HTMLTableCellElement, tableBody: HTMLTableSectionElement): void {
        const index = cell.cellIndex;
        if (tableBody.firstChild.childNodes.length < 2) {
            tableBody.parentElement.remove();
            return;
        }
        // tslint:disable-next-line:prefer-for-of
        for (let i = 0; i < tableBody.childNodes.length; i++) {
            tableBody.childNodes[i].childNodes[index].remove();
        }
    }
}
