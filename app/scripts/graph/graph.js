'use strict';

var graph = (function() {

    var data = {};

    var w = window.innerWidth;
      var h = window.innerHeight - (0.2 * window.innerHeight);

      var keyc = true,
      keys = true,
      keyt = true,
      keyr = true,
      keyx = true,
      keyd = true,
      keyl = true,
      keym = true,
      keyh = true,
      key1 = true,
      key2 = true,
      key3 = true,
      key0 = true

      var focus_node = null,
      highlight_node = null;

      var text_center = false;
      var outline = false;

      var min_score = 0;
      var max_score = 1;

      var color = d3.scale.linear()
      .domain([min_score, (min_score + max_score) / 2, max_score])
      .range(["lime", "yellow", "red"]);

      var highlight_color = "blue";
      var highlight_trans = 0.1;

      var size = d3.scale.pow().exponent(1)
      .domain([1, 100])
      .range([8, 24]);

      var friction = 58;
      var gravity = 1;
      var linkStrength = 60;
      var linkDistance = 150;
      var charge = -1400;

      var force = d3.layout.force()
      .charge(function( d, i ) {
       return i ? charge: 0;
      })
      .gravity( gravity/100 )
      .friction( friction/100 )
      .linkStrength( linkStrength/100 )
      .linkDistance( linkDistance )
      .size( [w, h]);

      var default_node_color = "#ccc";
      //var default_node_color = "rgb(3,190,100)";
      var default_link_color = "#888";
      var nominal_base_node_size = 18;
      var nominal_text_size = 12;
      var max_text_size = 24;
      var nominal_stroke = 1.5;
      var max_stroke = 2.5;
      var max_base_node_size = 50;
      var min_zoom = 0.5;
      var max_zoom = 4;
      var svg = d3.select("body").append("svg");
      var zoom = d3.behavior.zoom().scaleExtent([min_zoom, max_zoom])
      var g = svg.append("g");
      svg.style("cursor", "move");

      var graph;


    function init() {
        data = graphData.init();

        graph = graphData.getData();

        initGraph();
    }

    function initGraph() {
        if (data == {}) {
            init();
        }

        var linkedByIndex = {};
        graph.links.forEach(function(d) {
           linkedByIndex[d.source + "," + d.target] = true;
        });

        function isConnected(a, b) {
           return linkedByIndex[a.index + "," + b.index] || linkedByIndex[b.index + "," + a.index] || a.index == b.index;
        }

        function hasConnections(a) {
           for (var property in linkedByIndex) {
                s = property.split(",");
                if ((s[0] == a.index || s[1] == a.index) && linkedByIndex[property]) return true;
           }
           return false;
        }

        force
           .nodes(graph.nodes)
           .links(graph.links)
           .start();

        var link = g.selectAll(".link")
           .data(graph.links)
           .enter().append("line")
           .attr("class", "link")
           .on("mouseover", function(d){

                 set_focus(d.source)
                 if (highlight_node === null) set_highlight(d.source)
          })
          .on("mouseout", function(d){

                exit_highlight();

                circle.style("opacity", 1);
                text.style("opacity", 1);
                link.style("opacity", 1);

                focus_node = null;
         })
           .attr("class", function(d){
                 return graphDictionary.getLinkClass(d.linkType);
          });


        var node = g.selectAll(".node")
           .data(graph.nodes)
           .enter().append("g")
           .attr("class", "node")
           .on("click", function(d){
                 if(d.fixed){
                       d.fixed = false;
                 }else{
                       d.fixed = true;
                 }

                 console.log(d);

          })

        .call(force.drag)


      //   node.on("dblclick.zoom", function(d) {
      //      d3.event.stopPropagation();
      //      var dcx = (window.innerWidth / 2 - d.x * zoom.scale());
      //      var dcy = (window.innerHeight / 2 - d.y * zoom.scale());
      //      zoom.translate([dcx, dcy]);
      //      g.attr("transform", "translate(" + dcx + "," + dcy + ")scale(" + zoom.scale() + ")");
        //
      //   });

        var circle = node.append("path")
            .attr("d", d3.svg.symbol()
                  .size(function(d) {
                        var ns = nominal_base_node_size;
                        if(graphDictionary.getShape(d.type) == "diamond" || graphDictionary.getShape(d.type) == "triangle-up"){
                             ns -= 8.5;
                       }else{
                             ns -= 4.5;
                       }

                        return Math.PI*Math.pow(size(d.size)||ns,2);
                  })
                  .type(function(d) {
                        return graphDictionary.getShape(d.type);
                  }))
            .attr("class", function(d){
                  return graphDictionary.getNodeClass(d.type);
           });

      //   .style(tocolor, function(d) {
      //           if (isNumber(d.score) && d.score >= 0) return color(d.score);
      //           else return default_node_color;
      //      })
      //      //.attr("r", function(d) { return size(d.size)||nominal_base_node_size; })
      //      .style("stroke-width", nominal_stroke)
      //      .style(towhite, "white");


        var text = g.selectAll(".text")
           .data(graph.nodes)
           .enter().append("text")
           .attr("dy", "2.5em")
           .style("font-size", nominal_text_size + "px")
           .text(function(d) {
                return d.name;
           })
           .style("text-anchor", "middle");

        node.on("mouseover", function(d) {
             d3.event.stopPropagation();
             focus_node = d;
             set_focus(d)
             if (highlight_node === null) set_highlight(d)

           })
           .on("mousedown", function(d) {
                d3.event.stopPropagation();
                focus_node = d;
                set_focus(d)
                if (highlight_node === null) set_highlight(d)

           }).on("mouseout", function(d) {
                exit_highlight();

                circle.style("opacity", 1);
                text.style("opacity", 1);
                link.style("opacity", 1);

                focus_node = null;

           });

        d3.select(window).on("mouseup",
           function() {
                if (focus_node !== null) {
                    focus_node = null;
                    if (highlight_trans < 1) {

                        circle.style("opacity", 1);
                        text.style("opacity", 1);
                        link.style("opacity", 1);
                    }
                }

                if (highlight_node === null) exit_highlight();
           });

        function exit_highlight() {
           highlight_node = null;
           if (focus_node === null) {
                svg.style("cursor", "move");
                if (highlight_color != "white") {
                  //   circle.style(towhite, "white");
                    text.style("font-weight", "normal");
                    link.attr("class", function(d){
                          return graphDictionary.getLinkClass(d.linkType);
                   });
                }

           }
        }

        function set_focus(d) {
           if (highlight_trans < 1) {
                circle.style("opacity", function(o) {
                    return isConnected(d, o) ? 1 : highlight_trans;
                });

                text.style("opacity", function(o) {
                    return isConnected(d, o) ? 1 : highlight_trans;
                });

                link.style("opacity", function(o) {
                    return o.source.index == d.index || o.target.index == d.index ? 1 : highlight_trans;
                });
           }
        }


        function set_highlight(d) {
           svg.style("cursor", "pointer");
           if (focus_node !== null) d = focus_node;
           highlight_node = d;

      //      if (highlight_color != "white") {
      //       //     circle.style(towhite, function(o) {
      //       //         return isConnected(d, o) ? highlight_color : "white";
      //       //     });
      //       //     text.style("font-weight", function(o) {
      //       //         return isConnected(d, o) ? "bold" : "normal";
      //       //     });
      //       //     link.style("stroke", function(o) {
      //       //         return o.source.index == d.index || o.target.index == d.index ? highlight_color : ((isNumber(o.score) && o.score >= 0) ? color(o.score) : default_link_color);
      //           //
      //       //     });
      //      }
        }


        zoom.on("zoom", function() {

      //      var stroke = nominal_stroke;
      //      if (nominal_stroke * zoom.scale() > max_stroke) stroke = max_stroke / zoom.scale();
      // //      link.style("stroke-width", stroke);
      // //      circle.style("stroke-width", stroke);
      //
      //      var base_radius = nominal_base_node_size;
      //      if (nominal_base_node_size * zoom.scale() > max_base_node_size) base_radius = max_base_node_size / zoom.scale();
      //      circle.attr("d", d3.svg.symbol()
      //           .size(function(d) {
      //                 var ns = nominal_base_node_size;
      //                 if(graphDictionary.getShape(d.type) == "diamond" || graphDictionary.getShape(d.type) == "triangle-up"){
      //                      ns -= 8.5;
      //                }
      //
      //               return Math.PI * Math.pow(size(d.size) * base_radius / ns || base_radius, 2);
      //           })
      //           .type(function(d) {
      //               return graphDictionary.getShape(d.type);
      //           }))

           //circle.attr("r", function(d) { return (size(d.size)*base_radius/nominal_base_node_size||base_radius); })
      //      if (!text_center) text.attr("dx", function(d) {
      //           return (size(d.size) * base_radius / nominal_base_node_size || base_radius);
      //      });

      //      var text_size = nominal_text_size;
      //      if (nominal_text_size * zoom.scale() > max_text_size) text_size = max_text_size / zoom.scale();
      //      text.style("font-size", text_size + "px")
      //      .attr("dy", function(d){
      //            if(text_size == nominal_text_size){
      //                  return "2.65em"
      //            }else{
      //                  return "3.25em";
      //            }
      //     });

           g.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
        });

        svg.call(zoom);

        resize();
        //window.focus();
        d3.select(window).on("resize", resize);

        force.on("tick", function() {

           node.attr("transform", function(d) {
                 d.x = Math.max(15, Math.min(w - 15, d.x));
                 d.y = Math.max(15, Math.min(h - 15, d.y));

                return "translate(" + d.x + "," + d.y + ")";
           });


      // node.attr("cx", function(d) { return d.x = Math.max(15, Math.min(w - 15, d.x)); })
      //     .attr("cy", function(d) { return d.y = Math.max(15, Math.min(h - 15, d.y)); });

           text.attr("transform", function(d) {
                return "translate(" + d.x + "," + d.y + ")";
           });

           link.attr("x1", function(d) {
                    return d.source.x;
                })
                .attr("y1", function(d) {
                    return d.source.y;
                })
                .attr("x2", function(d) {
                    return d.target.x;
                })
                .attr("y2", function(d) {
                    return d.target.y;
                });

           node.attr("cx", function(d) {
                    return d.x;
                })
                .attr("cy", function(d) {
                    return d.y;
                });
        });


    }

    function resize() {
      var width = window.innerWidth,
            height = window.innerHeight - (0.2 * window.innerHeight);
      svg.attr("width", width).attr("height", height);

      force.size([force.size()[0] + (width - w) / zoom.scale(), force.size()[1] + (height - h) / zoom.scale()]).resume();
      w = width;
      h = height;
    }

    function isNumber(n) {
        return !isNaN(parseFloat(n)) && isFinite(n);
    }

    return {
        init: init
    }

})();
