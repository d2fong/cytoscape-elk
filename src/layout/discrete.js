const ELK = require('elkjs');
const elk = new ELK({
  workerUrl: '../../../node_modules/elkjs/lib/elk-worker.min.js'
});

// n.b. .layoutPositions() handles all these options for you

const assign = require('../assign');

const defaults = Object.freeze({
  // animation
  animate: undefined, // whether or not to animate the layout
  animationDuration: undefined, // duration of animation in ms, if enabled
  animationEasing: undefined, // easing of animation, if enabled
  animateFilter: ( node, i ) => true, // whether to animate specific nodes when animation is on; non-animated nodes immediately go to their final positions

  // viewport
  pan: undefined, // pan the graph to the provided position, given as { x, y }
  zoom: undefined, // zoom level as a positive number to set after animation
  fit: undefined, // fit the viewport to the repositioned nodes, overrides pan and zoom

  // modifications
  padding: undefined, // padding around layout
  boundingBox: undefined, // constrain layout bounds; { x1, y1, x2, y2 } or { x1, y1, w, h }
  spacingFactor: undefined, // a positive value which adjusts spacing between nodes (>1 means greater than usual spacing)
  nodeDimensionsIncludeLabels: undefined, // whether labels should be included in determining the space used by a node (default true)
  transform: ( node, pos ) => pos, // a function that applies a transform to the final node position

  // layout event callbacks
  ready: () => {}, // on layoutready
  stop: () => {} // on layoutstop
});

class Layout {
  constructor( options ){
    this.options = assign( {}, defaults, options );
  }

  getElkOpts(){

  }

  makeElkNode( node, opts ){
    let dims = node.layoutDimensions( opts );
    let padding = node.numericStyle('padding');

    let k = {
      _cyEle: node,
      id: node.id(),
      padding: {
        top: padding,
        left: padding,
        bottom: padding,
        right: padding
      }
    };

    if( !node.isParent() ){
      k.width = dims.w;
      k.height = dims.h;
    }

    node.scratch('klay', k);

    return k;
  }

  makeElkEdge( edge, opts ){
    let k = {
      _cyEle: edge,
      id: edge.id(),
      source: edge.data('source'),
      target: edge.data('target')
    };

    // let priority = opts.priority( edge );

    // if( priority != null ){
    //   k.priority = priority;
    // }

    edge.scratch('klay', k);

    return k;
  }

  makeElkGraph( nodes, edges, opts ){
    let elkNodes = [];
    let elkEdges = [];
    let elkEleLookup = {};
    let graph = {
      id: 'root',
      children: [],
      edges: []
    };

    // map all nodes
    for( let i = 0; i < nodes.length; i++ ){
      let n = nodes[i];
      let k = this.makeElkNode( n, opts );

      elkNodes.push( k );

      elkEleLookup[ n.id() ] = k;
    }

    // map all edges
    for( let i = 0; i < edges.length; i++ ){
      let e = edges[i];
      let k = this.makeElkEdge( e, opts );

      elkEdges.push( k );

      elkEleLookup[ e.id() ] = k;
    }

    // make hierarchy
    for( let i = 0; i < elkNodes.length; i++ ){
      let k = elkNodes[i];
      let n = k._cyEle;

      if( !n.isChild() ){
        graph.children.push( k );
      } else {
        let parent = n.parent();
        let parentK = elkEleLookup[ parent.id() ];

        let children = parentK.children = parentK.children || [];

        children.push( k );
      }
    }

    for( let i = 0; i < elkEdges.length; i++ ){
      let k = elkEdges[i];
      let e = k._cyEle;
      let parentSrc = e.source().parent();
      let parentTgt = e.target().parent();

      // put all edges in the top level for now
      // TODO does this cause issues in certain edgecases?
      if( false && parentSrc.nonempty() && parentTgt.nonempty() && parentSrc.same( parentTgt ) ){
        let kp = elkEleLookup[ parentSrc.id() ];

        kp.edges = kp.edges || [];

        kp.edges.push( k );
      } else {
        graph.edges.push( k );
      }

    }

    return graph;
  }

  getPos( ele ){
    let parent = ele.parent();
    let k = ele.scratch('klay');

  }

  run(){
    let layout = this;
    let options = this.options;
    let cy = options.cy;
    let eles = options.eles;
    let nodes = eles.nodes();
    let edges = eles.edges();

    let graph = this.makeElkGraph( nodes, edges, options );

    elk.layout({
      graph: graph,
      // options: this.getElkOpts( options.klay ),
      layoutOptions: { 'elk.algorithm': 'layered' },
      success: function () {
      },
      error: function(error){
        throw error;
      }
    });

    nodes.filter( n => !n.isParent() ).layoutPositions( layout, options, ele => this.getPos( ele ) );
  }
}

module.exports = Layout;
