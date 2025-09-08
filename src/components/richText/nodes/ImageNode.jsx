import { DecoratorNode, $applyNodeReplacement, TextNode } from 'lexical';
import React, { Suspense } from 'react';

const ImageComponent = ({ src, altText, width, height, href }) => {
    const handleImageClick = (e) => {
        // Prevent the default behavior and allow cursor positioning
        e.preventDefault();
        e.stopPropagation();
        
        // If there's a href, open the link
        if (href) {
            window.open(href, '_blank', 'noopener,noreferrer');
        }
    };

    const imageElement = (
        <img 
            src={src} 
            alt={altText} 
            width={width} 
            height={height} 
            className={`inline rounded-md shadow-sm max-w-full h-auto ${
                href ? 'cursor-pointer hover:opacity-90 transition-opacity duration-200' : 'cursor-default'
            }`}
            onClick={handleImageClick}
            draggable={false}
            style={{
                maxWidth: '200px', // Smaller width for better inline flow
                maxHeight: '150px', // Smaller height for better inline flow
                margin: '0 2px', // Smaller horizontal margin for tighter spacing
                verticalAlign: 'middle',
                display: 'inline'
            }}
        />
    );

    if (href) {
        return (
            <a 
                href={href} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-block"
                onClick={handleImageClick}
            >
                {imageElement}
            </a>
        );
    }

    return imageElement;
};

export class ImageNode extends DecoratorNode {
    __src;
    __altText;
    __width;
    __height;
    __href;

    static getType() {
        return 'image';
    }

    static clone(node) {
        return new ImageNode(
            node.__src,
            node.__altText,
            node.__width,
            node.__height,
            node.__href,
            node.__key,
        );
    }

    constructor(src, altText, width, height, href, key) {
        super(key);
        this.__src = src;
        this.__altText = altText;
        this.__width = width;
        this.__height = height;
        this.__href = href;
    }

    // Make the node inline so it can flow with text
    isInline() {
        return true;
    }

    // Override to make it behave more like an inline element
    isKeyboardSelectable() {
        return true;
    }

    createDOM(config) {
        const span = document.createElement('span');
        const theme = config.theme;
        const className = theme.image;
        if (className !== undefined) {
            span.className = className;
        }
        
        // Make the image node truly inline for text flow
        span.style.display = 'inline';
        span.style.position = 'relative';
        span.style.verticalAlign = 'middle';
        span.setAttribute('contenteditable', 'false');
        
        return span;
    }

    updateDOM(prevNode) {
        return prevNode.__href !== this.__href;
    }

    getSrc() {
        return this.__src;
    }

    getAltText() {
        return this.__altText;
    }

    getHref() {
        return this.__href;
    }

    setHref(href) {
        const writable = this.getWritable();
        writable.__href = href;
        return writable;
    }

    decorate() {
        return (
            <Suspense fallback={null}>
                <ImageComponent
                    src={this.__src}
                    altText={this.__altText}
                    width={this.__width}
                    height={this.__height}
                    href={this.__href}
                />
            </Suspense>
        );
    }

    static importJSON(serializedNode) {
        const { src, altText, width, height, href } = serializedNode;
        return new ImageNode(src, altText, width, height, href);
    }

    exportJSON() {
        return {
            type: 'image',
            src: this.getSrc(),
            altText: this.getAltText(),
            width: this.__width,
            height: this.__height,
            href: this.getHref(),
            version: 1,
        };
    }
}

export function $createImageNode({ src, altText, width, height, href }) {
    return $applyNodeReplacement(new ImageNode(src, altText, width, height, href));
}

export function $isImageNode(node) {
    return node instanceof ImageNode;
}
