import { DecoratorNode, $applyNodeReplacement } from 'lexical';
import React, { Suspense } from 'react';

const ImageComponent = ({ src, altText, width, height }) => {
    return (
        <img 
            src={src} 
            alt={altText} 
            width={width} 
            height={height} 
            className="my-4 rounded-md shadow-sm max-w-full h-auto"
        />
    );
};

export class ImageNode extends DecoratorNode {
    __src;
    __altText;
    __width;
    __height;

    static getType() {
        return 'image';
    }

    static clone(node) {
        return new ImageNode(
            node.__src,
            node.__altText,
            node.__width,
            node.__height,
            node.__key,
        );
    }

    constructor(src, altText, width, height, key) {
        super(key);
        this.__src = src;
        this.__altText = altText;
        this.__width = width;
        this.__height = height;
    }

    createDOM(config) {
        const span = document.createElement('span');
        const theme = config.theme;
        const className = theme.image;
        if (className !== undefined) {
            span.className = className;
        }
        return span;
    }

    updateDOM() {
        return false;
    }

    getSrc() {
        return this.__src;
    }

    getAltText() {
        return this.__altText;
    }

    decorate() {
        return (
            <Suspense fallback={null}>
                <ImageComponent
                    src={this.__src}
                    altText={this.__altText}
                    width={this.__width}
                    height={this.__height}
                />
            </Suspense>
        );
    }

    static importJSON(serializedNode) {
        const { src, altText, width, height } = serializedNode;
        return new ImageNode(src, altText, width, height);
    }

    exportJSON() {
        return {
            type: 'image',
            src: this.getSrc(),
            altText: this.getAltText(),
            width: this.__width,
            height: this.__height,
            version: 1,
        };
    }
}

export function $createImageNode({ src, altText, width, height }) {
    return $applyNodeReplacement(new ImageNode(src, altText, width, height));
}

export function $isImageNode(node) {
    return node instanceof ImageNode;
}
