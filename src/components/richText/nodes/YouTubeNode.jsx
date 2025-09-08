import { DecoratorNode, $applyNodeReplacement } from 'lexical';
import React, { Suspense } from 'react';

const YouTubeComponent = ({ src }) => {
    return (
        <div className="my-4 w-full max-w-4xl mx-auto">
            <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                <iframe 
                    src={src} 
                    className="absolute top-0 left-0 w-full h-full rounded-md shadow-sm"
                    frameBorder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowFullScreen
                    title="YouTube video"
                />
            </div>
        </div>
    );
};

export class YouTubeNode extends DecoratorNode {
    __src;

    static getType() {
        return 'youtube';
    }

    static clone(node) {
        return new YouTubeNode(node.__src, node.__key);
    }
    
    constructor(src, key) {
        super(key);
        this.__src = src;
    }
    
    createDOM(config) {
        const span = document.createElement('span');
        const theme = config.theme;
        const className = theme.youtube;
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
    
    decorate() {
        return (
            <Suspense fallback={<div>Loading video...</div>}>
                <YouTubeComponent
                    src={this.__src}
                />
            </Suspense>
        );
    }
    
    static importJSON(serializedNode) {
        const { src } = serializedNode;
        return new YouTubeNode(src);
    }
    
    exportJSON() {
        return {
            type: 'youtube',
            src: this.getSrc(),
            version: 1,
        };
    }
}

export function $createYouTubeNode({ src }) {
    return $applyNodeReplacement(new YouTubeNode(src));
}

export function $isYouTubeNode(node) {
    return node instanceof YouTubeNode;
}
